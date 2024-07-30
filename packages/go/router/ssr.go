package router

import (
	"errors"
	"fmt"
	"html/template"
	"strings"
)

type SSRInnerHTMLInput struct {
	HwyPrefix           string
	IsDev               bool
	BuildID             string
	LoadersData         *[]any
	ImportURLs          *[]string
	OutermostErrorIndex int
	SplatSegments       *[]string
	Params              *map[string]string
	ActionData          *[]any
	AdHocData           any
	Deps                *[]string
}

const ssrInnerTmplStr = `<script>
	globalThis[Symbol.for("{{.HwyPrefix}}")] = {};
	const x = globalThis[Symbol.for("{{.HwyPrefix}}")];
	x.isDev = {{.IsDev}};
	x.buildID = {{.BuildID}};
	x.loadersData = {{.LoadersData}};
	x.importURLs = {{.ImportURLs}};
	x.outermostErrorIndex = {{.OutermostErrorIndex}};
	x.splatSegments = {{.SplatSegments}};
	x.params = {{.Params}};
	x.actionData = {{.ActionData}};
	x.adHocData = {{.AdHocData}};
	const deps = {{.Deps}};
	deps.forEach(module => {
		const link = document.createElement('link');
		link.rel = 'modulepreload';
		link.href = "/public/" + module;
		document.head.appendChild(link);
	 });
</script>`

var ssrInnerTmpl = template.Must(template.New("ssr").Parse(ssrInnerTmplStr))

func GetSSRInnerHTML(routeData *GetRouteDataOutput, isDev bool) (*template.HTML, error) {
	var htmlBuilder strings.Builder
	var dto = SSRInnerHTMLInput{
		HwyPrefix:           HwyPrefix,
		IsDev:               isDev,
		BuildID:             routeData.BuildID,
		LoadersData:         routeData.LoadersData,
		ImportURLs:          routeData.ImportURLs,
		OutermostErrorIndex: routeData.OutermostErrorIndex,
		SplatSegments:       routeData.SplatSegments,
		Params:              routeData.Params,
		ActionData:          routeData.ActionData,
		AdHocData:           routeData.AdHocData,
		Deps:                routeData.Deps,
	}
	err := ssrInnerTmpl.Execute(&htmlBuilder, dto)
	if err != nil {
		errMsg := fmt.Sprintf("could not execute SSR inner HTML template: %v", err)
		Log.Errorf(errMsg)
		return nil, errors.New(errMsg)
	}
	final := template.HTML(htmlBuilder.String())
	return &final, nil
}
