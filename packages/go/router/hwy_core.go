package router

import (
	"context"
	"html/template"
	"io/fs"
	"net/http"
	"os"

	"github.com/sjc5/kit/pkg/colorlog"
	"github.com/sjc5/kit/pkg/matcher"
	"github.com/sjc5/kit/pkg/timer"
	"github.com/sjc5/kit/pkg/validate"
)

const (
	PathTypeUltimateCatch    matcher.PathType = "ultimate-catch"
	PathTypeIndex            matcher.PathType = "index"
	PathTypeStaticLayout     matcher.PathType = "static-layout"
	PathTypeDynamicLayout    matcher.PathType = "dynamic-layout"
	PathTypeNonUltimateSplat matcher.PathType = "non-ultimate-splat"
)

type DataFunction interface {
	Execute(...any) (any, error)
	GetInputInstance() any
	GetOutputInstance() any
	GetResInstance() any
	ValidateInput(*validate.Validate, *http.Request, RouteType) (any, error)
}

type RouteType = string

var RouteTypesEnum = struct {
	Loader         RouteType
	QueryAction    RouteType
	MutationAction RouteType
	NotFound       RouteType
}{
	Loader:         "loader",
	QueryAction:    "query-action",
	MutationAction: "mutation-action",
	NotFound:       "not-found",
}

type PathBase struct {
	matcher.RegisteredPath
	OutPath string   `json:"outPath,omitempty"`
	SrcPath string   `json:"srcPath,omitempty"`
	Deps    []string `json:"deps,omitempty"`
}

type Path struct {
	PathBase
	DataFunction DataFunction `json:",omitempty"`
}

type DataFunctionMap map[string]DataFunction

type Hwy struct {
	FS                   fs.FS
	Loaders              DataFunctionMap
	QueryActions         DataFunctionMap
	MutationActions      DataFunctionMap
	RootTemplateLocation string
	Validator            *validate.Validate
	GetDefaultHeadBlocks func(r *http.Request) ([]HeadBlock, error)
	GetRootTemplateData  func(r *http.Request) (map[string]any, error)
	PublicURLResolver    func(string) string

	paths             []Path
	clientEntry       string
	clientEntryURL    string
	clientEntryDeps   []string
	buildID           string
	depToCSSBundleMap map[string]string
	rootTemplate      *template.Template
}

// Not for public consumption. Do not use or rely on this.
func (h *Hwy) Hwy__internal__setPaths(paths []Path) {
	h.paths = paths
}

func (h *Hwy) Hwy__internal__getPaths() []Path {
	return h.paths
}

type Redirect struct {
	URL  string
	Code int
}

type CtxHelper interface {
	GetRequest() *http.Request
	GetResponse() ResponseHelper
}

type ResponseHelper interface {
	ServerError()
	Redirect(url string, code int)
	ClientRedirect(url string)
	GetData() any
	GetErrMsg() string
	GetHeaders() http.Header
	GetCookies() []*http.Cookie
	GetRedirect() *Redirect
	GetClientRedirectURL() string
	GetHeadBlocks() []*HeadBlock // only applicable for loaders
}

const (
	HwyPrefix             = "__hwy_internal__"
	HwyJSONSearchParamKey = "hwy_json"
)

func getIsDebug() bool {
	return os.Getenv("HWY_ENV") == "development"
}

var Log = colorlog.New("Hwy")

type hwyContextKey string

const adHocDataContextKey hwyContextKey = "adHocData"

func GetAdHocDataContextWithValue(r *http.Request, val any) context.Context {
	return context.WithValue(r.Context(), adHocDataContextKey, val)
}

func GetAdHocDataFromContext[T any](r *http.Request) T {
	ctx := r.Context()
	val := ctx.Value(adHocDataContextKey)
	if val == nil {
		var zeroVal T
		return zeroVal
	}
	return ctx.Value(adHocDataContextKey).(T)
}

func newTimer() *timer.Timer {
	return timer.Conditional(getIsDebug())
}
