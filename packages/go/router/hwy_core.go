package router

import (
	"context"
	"html/template"
	"io/fs"
	"net/http"
	"os"

	"github.com/sjc5/kit/pkg/colorlog"
	"github.com/sjc5/kit/pkg/safecache"
	"github.com/sjc5/kit/pkg/validate"
)

const (
	PathTypeUltimateCatch    = "ultimate-catch"
	PathTypeIndex            = "index"
	PathTypeStaticLayout     = "static-layout"
	PathTypeDynamicLayout    = "dynamic-layout"
	PathTypeNonUltimateSplat = "non-ultimate-splat"
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
}{
	Loader:         "loader",
	QueryAction:    "query-action",
	MutationAction: "mutation-action",
}

type PathBase struct {
	Pattern  string   `json:"pattern"`
	Segments []string `json:"segments"`
	PathType string   `json:"pathType"`
	OutPath  string   `json:"outPath,omitempty"`
	SrcPath  string   `json:"srcPath,omitempty"`
	Deps     []string `json:"deps,omitempty"`
}

type Path struct {
	PathBase
	DataFunction DataFunction `json:",omitempty"`
}

type DataFunctionMap map[string]DataFunction

type Hwy struct {
	DefaultHeadBlocks    []HeadBlock
	FS                   fs.FS
	Loaders              DataFunctionMap
	QueryActions         DataFunctionMap
	MutationActions      DataFunctionMap
	RootTemplateLocation string
	RootTemplateData     map[string]any
	paths                []Path
	clientEntryDeps      []string
	buildID              string
	rootTemplate         *template.Template
	validator            *safecache.Cache[*validate.Validate]
}

func (h *Hwy) GetValidator() *validate.Validate {
	v, _ := h.validator.Get()
	return v
}

type Redirect struct {
	URL  string
	Code int
}

type DataFunctionPropsGetter interface {
	GetData() any
	GetError() error
	GetHeaders() http.Header
	GetCookies() []*http.Cookie
	GetRedirect() *Redirect
	GetHeadBlocks() []*HeadBlock // only applicable for loaders
}

const HwyPrefix = "__hwy_internal__"

func getIsDebug() bool {
	return os.Getenv("HWY_ENV") == "development"
}

var Log = colorlog.Log{Label: "Hwy"}

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
