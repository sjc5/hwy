package router

import (
	"fmt"
	"strings"
	"text/template"

	"github.com/sjc5/kit/pkg/tsgen"
)

type TSGenOptions struct {
	// Path, including filename, where the resulting TypeScript file will be written
	OutPath     string
	DataFuncs   DataFuncs
	AdHocTypes  []AdHocType
	ExtraTSCode string
}

func GenerateTypeScript(opts *TSGenOptions, extraTSCode ...string) error {
	var items []tsgen.Item

	for pattern, loader := range opts.DataFuncs.Loaders {
		item := tsgen.Item{
			ArbitraryProperties: []tsgen.ArbitraryProperty{
				{Name: "pattern", Value: pattern},
				{Name: "routeType", Value: RouteTypesEnum.Loader},
			},
		}

		if loader != nil {
			item.PhantomTypes = []tsgen.PhantomType{
				{PropertyName: "phantomInputType", TypeInstance: loader.GetInputInstance(), TSTypeName: pattern + "Input"},
				{PropertyName: "phantomOutputType", TypeInstance: loader.GetOutputInstance(), TSTypeName: pattern + "Output"},
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
				{PropertyName: "phantomInputType", TypeInstance: queryAction.GetInputInstance(), TSTypeName: pattern + "Input"},
				{PropertyName: "phantomOutputType", TypeInstance: queryAction.GetOutputInstance(), TSTypeName: pattern + "Output"},
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
				{PropertyName: "phantomInputType", TypeInstance: mutationQuery.GetInputInstance(), TSTypeName: pattern + "Input"},
				{PropertyName: "phantomOutputType", TypeInstance: mutationQuery.GetOutputInstance(), TSTypeName: pattern + "Output"},
			}
		}

		items = append(items, item)
	}

	categoryList := []category{}
	if len(opts.DataFuncs.Loaders) > 0 {
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
		OutPath:           opts.OutPath,
		Items:             items,
		ItemsArrayVarName: itemsArrayVarName,
		ExtraTSCode:       extraTSToUse,
		AdHocTypes:        opts.AdHocTypes,
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

	for i, c := range categories {
		err := extraTSTmpl.Execute(&extraTSBuilder, map[string]string{
			"Prefix":            c.Prefix,
			"RouteType":         c.RouteType,
			"ItemsArrayVarName": itemsArrayVarName,
		})
		if err != nil {
			panic(err)
		}

		if i == 0 {
			extraTSBuilder.WriteString("\n")
		}
	}

	return extraTSBuilder.String()
}

var extraTSTmpl = template.Must(template.New("extraTS").Parse(extraTSTmplStr))

const extraTSTmplStr = `export type {{ .Prefix }} = Extract<(typeof {{ .ItemsArrayVarName }})[number], { routeType: "{{ .RouteType }}" }>;
export type {{ .Prefix }}Pattern = {{ .Prefix }}["pattern"];
export type {{ .Prefix }}Input<T extends {{ .Prefix }}Pattern> = Extract<
	{{ .Prefix }},
	{ pattern: T }
>["phantomInputType"];
export type {{ .Prefix }}Output<T extends {{ .Prefix }}Pattern> = Extract<
	{{ .Prefix }},
	{ pattern: T }
>["phantomOutputType"];
export type {{ .Prefix }}s = {
	[K in {{ .Prefix }}Pattern]: Extract<{{ .Prefix }}, { pattern: K }>;
};
`
