package router

import (
	"html/template"
	"io/fs"
	"net/http"
	"os"
	"os/exec"
	"sync"

	"github.com/sjc5/kit/pkg/colorlog"
	"github.com/sjc5/kit/pkg/contextutil"

	"github.com/sjc5/kit/pkg/timer"
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
	NotFound       RouteType
}{
	Loader:         "loader",
	QueryAction:    "query-action",
	MutationAction: "mutation-action",
	NotFound:       "not-found",
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

type UIVariant string

var UIVariants = struct {
	React  UIVariant
	Preact UIVariant
	Solid  UIVariant
}{
	React:  "react",
	Preact: "preact",
	Solid:  "solid",
}

type Hwy struct {
	FS                   fs.FS
	Loaders              DataFunctionMap
	QueryActions         DataFunctionMap
	MutationActions      DataFunctionMap
	RootTemplateLocation string
	Validator            *validate.Validate
	GetDefaultHeadBlocks func(r *http.Request) ([]HeadBlock, error)
	GetRootTemplateData  func(r *http.Request) (map[string]any, error)
	UIVariant            UIVariant

	mu                 sync.Mutex
	_isDev             bool
	_paths             []Path
	_clientEntrySrc    string
	_clientEntryOut    string
	_clientEntryDeps   []string
	_buildID           string
	_depToCSSBundleMap map[string]string
	_rootTemplate      *template.Template
	_viteCmd           *exec.Cmd
}

// Not for public consumption. Do not use or rely on this.
func (h *Hwy) Hwy__internal__setPaths(paths []Path) {
	h.mu.Lock()
	defer h.mu.Unlock()

	h._paths = paths
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

// __TODO remove redundant stuff now that generic aliases are available in 1.24

func NewAdHocDataStore[T any]() *contextutil.Store[T] {
	return contextutil.NewStore[T]("hwy_ad_hoc_data")
}

func newTimer() *timer.Timer {
	return timer.Conditional(getIsDebug())
}
