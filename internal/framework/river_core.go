package framework

import (
	"html/template"
	"io/fs"
	"net/http"
	"sync"

	"github.com/sjc5/river/kit/colorlog"
	"github.com/sjc5/river/kit/genericsutil"
	"github.com/sjc5/river/kit/htmlutil"
	"github.com/sjc5/river/kit/mux"
)

const (
	RiverSymbolStr = "__river_internal__"
)

var Log = colorlog.New("river", 9)

type RouteType = string

var RouteTypes = struct {
	Loader   RouteType
	Query    RouteType
	Mutation RouteType
	NotFound RouteType
}{
	Loader:   "loader",
	Query:    "query",
	Mutation: "mutation",
	NotFound: "not-found",
}

type Path struct {
	NestedRoute mux.AnyNestedRoute `json:"-"`

	// both stages one and two
	Pattern   string `json:"pattern"`
	SrcPath   string `json:"srcPath"`
	ExportKey string `json:"exportKey"`

	// stage two only
	OutPath string   `json:"outPath,omitempty"`
	Deps    []string `json:"deps,omitempty"`
}

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

type RootTemplateData = map[string]any

type River[C any] struct {
	FS                      fs.FS
	RootTemplateLocation    string // Relative to the FS root
	GetDefaultHeadBlocks    func(r *http.Request) ([]*htmlutil.Element, error)
	GetRootTemplateData     func(r *http.Request) (RootTemplateData, error)
	UIVariant               UIVariant
	JSPackageManagerBaseCmd string // required -- e.g., "npx", "pnpm", "yarn", etc.

	// optional -- used for monorepos that need to run commands from ancestor directories
	JSPackageManagerCmdDir string

	// optional
	ViteConfigFile string

	// If set to true, UI route responses will automatically include a strong ETag
	// (SHA-256 hash) derived from the applicable nested route data, and will
	// respond with a 304 header for any subsequent exact matches to an If-None-Match
	// header value. JSON and HTML responses use the same underlying SHA-256 hash of
	// nested route data, but each has a unique prefix to differentiate between them.
	// Defaults to false.
	AutoUIRouteETags bool

	ClientRoutesFile string

	// BUILD OPTIONS
	ClientEntry         string
	StaticPublicOutDir  string
	StaticPrivateOutDir string

	mu                 sync.RWMutex
	_isDev             bool
	_paths             map[string]*Path
	_clientEntrySrc    string
	_clientEntryOut    string
	_clientEntryDeps   []string
	_buildID           string
	_depToCSSBundleMap map[string]string
	_rootTemplate      *template.Template
}

type RiverAny interface{ _get_core_data_zero() any }

func (h *River[C]) _get_core_data_zero() any {
	return genericsutil.Zero[C]()
}
