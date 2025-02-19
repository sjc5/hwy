package router

import (
	"errors"
	"fmt"
	"html/template"
	"strings"

	"github.com/sjc5/kit/pkg/htmlutil"
	"github.com/sjc5/kit/pkg/matcher"
)

type SSRInnerHTMLInput struct {
	HwyPrefix           string
	IsDev               bool
	BuildID             string
	ViteDevURL          string
	LoadersData         []any
	ImportURLs          []string
	OutermostErrorIndex int
	SplatSegments       SplatSegments
	Params              matcher.Params
	AdHocData           any
	Deps                []string
	CSSBundles          []string
	ClientRedirectURL   string
}

// Sadly, must include the script tags so html/template parses this correctly.
// They are stripped off later in order to get the correct sha256 hash.
// Then they are added back via htmlutil.RenderElement.
const (
	ssrInnerHTMLTmplStr = `<script>
	globalThis[Symbol.for("{{.HwyPrefix}}")] = {};
	const x = globalThis[Symbol.for("{{.HwyPrefix}}")];
	x.isDev = {{.IsDev}};
	x.buildID = {{.BuildID}};
	x.viteDevURL = {{.ViteDevURL}};
	x.loadersData = {{.LoadersData}};
	x.importURLs = {{.ImportURLs}};
	x.outermostErrorIndex = {{.OutermostErrorIndex}};
	x.splatSegments = {{.SplatSegments}};
	x.params = {{.Params}};
	x.adHocData = {{.AdHocData}};
	if (!x.isDev) {
		const deps = {{.Deps}};
		deps.forEach(x => {
			const link = document.createElement('link');
			link.rel = 'modulepreload';
			link.href = "/public/" + x;
			document.head.appendChild(link);
		});
		const cssBundles = {{.CSSBundles}};
		cssBundles.forEach(x => {
			const link = document.createElement('link');
			link.rel = 'stylesheet';
			link.href = "/public/" + x;
			link.setAttribute("data-hwy-css-bundle", x);
			document.head.appendChild(link);
		});
	}
</script>`

	ssrInnerHTMLTmplClientRedirectStr = `<script>
	window.location.href = {{.ClientRedirectURL}};
</script>`
)

var (
	ssrInnerTmpl                   = template.Must(template.New("ssr").Parse(ssrInnerHTMLTmplStr))
	ssrInnerHTMLTmplClientRedirect = template.Must(template.New("ssrCR").Parse(ssrInnerHTMLTmplClientRedirectStr))
)

type GetSSRInnerHTMLOutput struct {
	Script     *template.HTML
	Sha256Hash string
}

func (h *Hwy) GetSSRInnerHTML(routeData *GetRouteDataOutput) (*GetSSRInnerHTMLOutput, error) {
	var htmlBuilder strings.Builder
	var dto SSRInnerHTMLInput
	var err error

	if routeData.ClientRedirectURL != "" {
		dto = SSRInnerHTMLInput{ClientRedirectURL: routeData.ClientRedirectURL}
		err = ssrInnerHTMLTmplClientRedirect.Execute(&htmlBuilder, dto)
	} else {
		dto = SSRInnerHTMLInput{
			HwyPrefix:           HwyPrefix,
			IsDev:               h._isDev,
			BuildID:             routeData.BuildID,
			ViteDevURL:          routeData.ViteDevURL,
			LoadersData:         routeData.LoadersData,
			ImportURLs:          routeData.ImportURLs,
			OutermostErrorIndex: routeData.OutermostErrorIndex,
			SplatSegments:       routeData.SplatSegments,
			Params:              routeData.Params,
			AdHocData:           routeData.AdHocData,
			Deps:                routeData.Deps,
			CSSBundles:          routeData.CSSBundles,
			ClientRedirectURL:   routeData.ClientRedirectURL,
		}
		err = ssrInnerTmpl.Execute(&htmlBuilder, dto)
	}
	if err != nil {
		errMsg := fmt.Sprintf("could not execute SSR inner HTML template: %v", err)
		Log.Error(errMsg)
		return nil, errors.New(errMsg)
	}

	innerHTML := htmlBuilder.String()
	innerHTML = strings.TrimPrefix(innerHTML, "<script>")
	innerHTML = strings.TrimSuffix(innerHTML, "</script>")

	el := htmlutil.Element{
		Tag:       "script",
		InnerHTML: template.HTML(innerHTML),
	}

	sha256Hash, err := htmlutil.AddSha256HashInline(&el, true)
	if err != nil {
		errMsg := fmt.Sprintf("could not handle CSP for SSR inner HTML: %v", err)
		Log.Error(errMsg)
		return nil, errors.New(errMsg)
	}

	renderedEl, err := htmlutil.RenderElement(&el)
	if err != nil {
		errMsg := fmt.Sprintf("could not render SSR inner HTML: %v", err)
		Log.Error(errMsg)
		return nil, errors.New(errMsg)
	}

	return &GetSSRInnerHTMLOutput{Script: &renderedEl, Sha256Hash: sha256Hash}, nil
}
