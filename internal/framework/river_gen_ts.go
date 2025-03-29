package framework

import (
	"net/http"

	"github.com/sjc5/river/kit/mux"
	"github.com/sjc5/river/kit/rpc"
	"github.com/sjc5/river/kit/tsgen"
)

type AdHocType = rpc.AdHocType

type TSGenOptions struct {
	UIRouter      *mux.NestedRouter
	ActionsRouter *mux.Router
	AdHocTypes    []*AdHocType
	ExtraTSCode   string
}

var base = rpc.BaseOptions{
	CollectionVarName:    "routes",
	DiscriminatorStr:     "pattern",
	CategoryPropertyName: "_type",
}

var queryMethods = map[string]struct{}{
	http.MethodGet: {}, http.MethodHead: {},
}
var mutationMethods = map[string]struct{}{
	http.MethodPost: {}, http.MethodPut: {}, http.MethodPatch: {}, http.MethodDelete: {},
}

func GenerateTypeScript(h RiverAny, opts *TSGenOptions) (string, error) {
	var collection []tsgen.CollectionItem

	allLoaders := opts.UIRouter.AllRoutes()
	allActions := opts.ActionsRouter.AllRoutes()

	for pattern, loader := range allLoaders {
		item := tsgen.CollectionItem{
			ArbitraryProperties: map[string]any{
				base.DiscriminatorStr:     pattern,
				base.CategoryPropertyName: "loader",
			},
		}
		if loader != nil {
			item.PhantomTypes = map[string]AdHocType{
				"phantomOutputType": {TypeInstance: loader.O()},
			}
		}
		collection = append(collection, item)
	}

	hasQueries, hasMutations := false, false

	for _, action := range allActions {
		method, pattern := action.Method(), action.Pattern()
		_, isQuery := queryMethods[method]
		_, isMutation := mutationMethods[method]
		if !isQuery && !isMutation {
			continue
		}
		hasQueries = hasQueries || isQuery
		hasMutations = hasMutations || isMutation
		categoryPropertyName := "query"
		if isMutation {
			categoryPropertyName = "mutation"
		}
		item := tsgen.CollectionItem{
			ArbitraryProperties: map[string]any{
				base.DiscriminatorStr:     pattern,
				base.CategoryPropertyName: categoryPropertyName,
			},
		}
		if action != nil {
			item.PhantomTypes = map[string]AdHocType{
				"phantomInputType":  {TypeInstance: action.I()},
				"phantomOutputType": {TypeInstance: action.O()},
			}
		}
		collection = append(collection, item)
	}

	categories := []rpc.CategorySpecificOptions{}
	if len(allLoaders) > 0 {
		categories = append(categories, rpc.CategorySpecificOptions{
			BaseOptions:          base,
			CategoryValue:        "loader",
			ItemTypeNameSingular: "Loader",
			ItemTypeNamePlural:   "Loaders",
			KeyUnionTypeName:     "LoaderPattern",
			InputUnionTypeName:   "",
			OutputUnionTypeName:  "LoaderOutput",
			SkipInput:            true,
		})
	}
	if hasQueries {
		categories = append(categories, rpc.CategorySpecificOptions{
			BaseOptions:          base,
			CategoryValue:        "query",
			ItemTypeNameSingular: "Query",
			ItemTypeNamePlural:   "Queries",
			KeyUnionTypeName:     "QueryPattern",
			InputUnionTypeName:   "QueryInput",
			OutputUnionTypeName:  "QueryOutput",
		})
	}
	if hasMutations {
		categories = append(categories, rpc.CategorySpecificOptions{
			BaseOptions:          base,
			CategoryValue:        "mutation",
			ItemTypeNameSingular: "Mutation",
			ItemTypeNamePlural:   "Mutations",
			KeyUnionTypeName:     "MutationPattern",
			InputUnionTypeName:   "MutationInput",
			OutputUnionTypeName:  "MutationOutput",
		})
	}

	extraTSToUse := rpc.BuildFromCategories(categories)

	if opts.ExtraTSCode != "" {
		extraTSToUse += "\n" + opts.ExtraTSCode
	}

	adHocTypes := append(opts.AdHocTypes, &AdHocType{
		TypeInstance: h._get_core_data_zero(),
		TSTypeName:   "CoreData",
	})

	return tsgen.GenerateTSContent(tsgen.Opts{
		Collection:        collection,
		CollectionVarName: base.CollectionVarName,
		AdHocTypes:        adHocTypes,
		ExtraTSCode:       extraTSToUse,
	})
}
