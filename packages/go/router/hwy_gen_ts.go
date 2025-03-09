package router

import (
	"fmt"
	"strings"
	"text/template"

	"github.com/sjc5/kit/pkg/mux"
	"github.com/sjc5/kit/pkg/tsgen"
)

type TSGenOptions struct {
	// Path, including filename, where the resulting TypeScript file will be written
	OutPath      string
	DataFuncs    *DataFuncs
	NestedRouter *mux.NestedRouter
	AdHocTypes   []AdHocType
	ExtraTSCode  string
}

func improveTypeName(pattern string) string {
	if strings.HasSuffix(pattern, "/$") {
		return strings.ReplaceAll(pattern, "/$", "Catch")
	}
	if strings.Contains(pattern, "/$") {
		return strings.ReplaceAll(pattern, "/$", "/Dynamic/")
	}
	return pattern
}

func GenerateTypeScript(opts *TSGenOptions, extraTSCode ...string) error {
	var items []tsgen.Item

	allLoaders := opts.NestedRouter.AllRoutes()

	for pattern, loader := range allLoaders {
		item := tsgen.Item{
			ArbitraryProperties: []tsgen.ArbitraryProperty{
				{Name: "pattern", Value: pattern},
				{Name: "routeType", Value: RouteTypesEnum.Loader},
			},
		}

		if loader != nil {
			item.PhantomTypes = []tsgen.PhantomType{
				{
					PropertyName: "phantomOutputType",
					TypeInstance: loader.O(),
					TSTypeName:   improveTypeName(pattern) + "Output",
				},
			}
		}

		items = append(items, item)
	}

	for pattern, queryAction := range opts.DataFuncs.QueryActions {
		item := tsgen.Item{
			ArbitraryProperties: []tsgen.ArbitraryProperty{
				{Name: "pattern", Value: pattern},
				{Name: "routeType", Value: RouteTypesEnum.QueryAction},
			},
		}

		if queryAction != nil {
			item.PhantomTypes = []tsgen.PhantomType{
				{
					PropertyName: "phantomInputType",
					TypeInstance: queryAction.GetInputInstance(),
					TSTypeName:   improveTypeName(pattern) + "Input",
				},
				{
					PropertyName: "phantomOutputType",
					TypeInstance: queryAction.GetOutputInstance(),
					TSTypeName:   improveTypeName(pattern) + "Output",
				},
			}
		}

		items = append(items, item)
	}

	for pattern, mutationQuery := range opts.DataFuncs.MutationActions {
		item := tsgen.Item{
			ArbitraryProperties: []tsgen.ArbitraryProperty{
				{Name: "pattern", Value: pattern},
				{Name: "routeType", Value: RouteTypesEnum.MutationAction},
			},
		}

		if mutationQuery != nil {
			item.PhantomTypes = []tsgen.PhantomType{
				{
					PropertyName: "phantomInputType",
					TypeInstance: mutationQuery.GetInputInstance(),
					TSTypeName:   improveTypeName(pattern) + "Input",
				},
				{
					PropertyName: "phantomOutputType",
					TypeInstance: mutationQuery.GetOutputInstance(),
					TSTypeName:   improveTypeName(pattern) + "Output",
				},
			}
		}

		items = append(items, item)
	}

	categoryList := []category{}
	if len(allLoaders) > 0 {
		categoryList = append(categoryList, category{Prefix: "Loader", RouteType: RouteTypesEnum.Loader})
	}
	if len(opts.DataFuncs.QueryActions) > 0 {
		categoryList = append(categoryList, category{Prefix: "QueryAction", RouteType: RouteTypesEnum.QueryAction})
	}
	if len(opts.DataFuncs.MutationActions) > 0 {
		categoryList = append(categoryList, category{Prefix: "MutationAction", RouteType: RouteTypesEnum.MutationAction})
	}

	extraTSToUse := getExtraTSCode(categoryList)

	if len(extraTSCode) > 0 {
		for i, code := range extraTSCode {
			extraTSToUse += code
			if i < len(extraTSCode)-1 {
				extraTSToUse += "\n"
			}
		}
	}

	if opts.ExtraTSCode != "" {
		extraTSToUse += "\n" + opts.ExtraTSCode
	}

	err := tsgen.GenerateTSToFile(tsgen.Opts{
		OutPath:                       opts.OutPath,
		Items:                         items,
		ItemsArrayVarName:             itemsArrayVarName,
		ExtraTSCode:                   extraTSToUse,
		AdHocTypes:                    opts.AdHocTypes,
		ArbitraryPropertyNameToSortBy: "pattern",
	})

	if err != nil {
		Log.Error(fmt.Sprintf("error generating typescript: %s", err))
		return err
	}

	return nil
}

var itemsArrayVarName = "routes"

type category struct {
	Prefix    string
	RouteType RouteType
}

func getExtraTSCode(categories []category) string {
	var extraTSBuilder strings.Builder

	for _, c := range categories {
		arg := map[string]string{
			"Prefix":            c.Prefix,
			"RouteType":         c.RouteType,
			"ItemsArrayVarName": itemsArrayVarName,
		}

		if err := extraTSTmpl1.Execute(&extraTSBuilder, arg); err != nil {
			panic(err)
		}
		if c.RouteType != RouteTypesEnum.Loader {
			if err := extraTSTmpl2.Execute(&extraTSBuilder, arg); err != nil {
				panic(err)
			}
		}
		if err := extraTSTmpl3.Execute(&extraTSBuilder, arg); err != nil {
			panic(err)
		}
	}

	return extraTSBuilder.String()
}

var (
	extraTSTmpl1 = template.Must(template.New("extraTS_1").Parse(extraTSTmplStr1))
	extraTSTmpl2 = template.Must(template.New("extraTS_2").Parse(extraTSTmplStr2))
	extraTSTmpl3 = template.Must(template.New("extraTS_3").Parse(extraTSTmplStr3))
)

const (
	extraTSTmplStr1 = `export type {{ .Prefix }} = Extract<(typeof {{ .ItemsArrayVarName }})[number], { routeType: "{{ .RouteType }}" }>;
export type {{ .Prefix }}Pattern = {{ .Prefix }}["pattern"];
`
	extraTSTmplStr2 = `export type {{ .Prefix }}Input<T extends {{ .Prefix }}Pattern> = Extract<
	{{ .Prefix }},
	{ pattern: T }
>["phantomInputType"];
`
	extraTSTmplStr3 = `export type {{ .Prefix }}Output<T extends {{ .Prefix }}Pattern> = Extract<
	{{ .Prefix }},
	{ pattern: T }
>["phantomOutputType"];
export type {{ .Prefix }}s = {
	[K in {{ .Prefix }}Pattern]: Extract<{{ .Prefix }}, { pattern: K }>;
};
`
)
