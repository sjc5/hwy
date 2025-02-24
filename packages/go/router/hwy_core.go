package router

import (
	"fmt"
	"html/template"
	"io/fs"
	"net/http"
	"os"
	"os/exec"
	"reflect"
	"sync"

	"github.com/sjc5/kit/pkg/colorlog"
	"github.com/sjc5/kit/pkg/contextutil"
	"github.com/sjc5/kit/pkg/router"

	"github.com/sjc5/kit/pkg/timer"
	"github.com/sjc5/kit/pkg/validate"
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
	// both stages one and two
	Pattern string `json:"pattern"`
	SrcPath string `json:"srcPath"`

	// stage two only
	OutPath string   `json:"outPath,omitempty"`
	Deps    []string `json:"deps,omitempty"`
}

type Path struct {
	PathBase
	*router.RegisteredPattern
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

type RootTemplateData = map[string]any

type Hwy struct {
	FS fs.FS
	*DataFuncs
	RootTemplateLocation    string
	GetDefaultHeadBlocks    func(r *http.Request) ([]HeadBlock, error)
	GetRootTemplateData     func(r *http.Request) (RootTemplateData, error)
	UIVariant               UIVariant
	JSPackageManagerBaseCmd string // required -- e.g., "npx", "pnpm", "yarn", etc.
	JSPackagerManagerCmdDir string // optional -- used for monorepos that need to run commands from higher directories
	Validator               *validate.Validate

	mu                 sync.Mutex
	_isDev             bool
	_paths             []Path
	_matcher           *router.Matcher
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

/////////////////// from hwy.go

type LoaderRes[O any] struct {
	// same as ActionRes
	Data              O
	ErrMsg            string
	Headers           http.Header
	Cookies           []*http.Cookie
	redirect          *Redirect
	clientRedirectURL string

	// different from ActionRes
	HeadBlocks []*HeadBlock
}

type LoaderCtx[O any] struct {
	Req           *http.Request
	Params        router.Params
	SplatSegments SplatSegments
	Res           *LoaderRes[O]
}

func (c *LoaderCtx[O]) GetRequest() *http.Request {
	return c.Req
}
func (c *LoaderCtx[O]) GetResponse() ResponseHelper {
	return c.Res
}

func (f *LoaderRes[O]) ServerError() {
	f.ErrMsg = http.StatusText(http.StatusInternalServerError)
}
func (f *LoaderRes[O]) Redirect(url string, code int) {
	f.redirect = &Redirect{URL: url, Code: code}
}
func (f *LoaderRes[O]) ClientRedirect(url string) {
	f.clientRedirectURL = url
}

type Loader[O any] func(ctx LoaderCtx[O])

func NewLoader[O any](f func(ctx LoaderCtx[O])) Loader[O] {
	return Loader[O](f)
}

func (f Loader[O]) GetResInstance() any {
	return &LoaderRes[O]{
		redirect:   &Redirect{},
		Headers:    http.Header{},
		Cookies:    []*http.Cookie{},
		HeadBlocks: []*HeadBlock{},
	}
}
func (f Loader[O]) Execute(args ...any) (any, error) {
	f(LoaderCtx[O]{
		Req:           args[0].(*http.Request),
		Params:        args[1].(router.Params),
		SplatSegments: args[2].(SplatSegments),
		Res:           args[3].(*LoaderRes[O]),
	})
	return nil, nil
}
func (f Loader[O]) GetInputInstance() any {
	return nil
}
func (f Loader[O]) ValidateInput(v *validate.Validate, r *http.Request, actionType RouteType) (any, error) {
	return nil, nil
}
func (f Loader[O]) GetOutputInstance() any {
	var x O
	return x
}

type ActionRes[O any] struct {
	// same as LoaderRes
	Data              O
	ErrMsg            string
	Headers           http.Header
	Cookies           []*http.Cookie
	redirect          *Redirect
	clientRedirectURL string
}

type ActionCtx[I any, O any] struct {
	Req            *http.Request
	Input          I
	Res            *ActionRes[O]
	ResponseWriter http.ResponseWriter
}

func (c *ActionCtx[I, O]) GetRequest() *http.Request {
	return c.Req
}
func (c *ActionCtx[I, O]) GetResponse() ResponseHelper {
	return c.Res
}

func (f *ActionRes[O]) ServerError() {
	f.ErrMsg = http.StatusText(http.StatusInternalServerError)
}
func (f *ActionRes[O]) Redirect(url string, code int) {
	f.redirect = &Redirect{URL: url, Code: code}
}
func (f *ActionRes[O]) ClientRedirect(url string) {
	f.clientRedirectURL = url
}

type Action[I any, O any] func(ctx ActionCtx[I, O])

func NewAction[I any, O any](f func(ctx ActionCtx[I, O])) Action[I, O] {
	return Action[I, O](f)
}

func (f Action[I, O]) GetResInstance() any {
	return &ActionRes[O]{
		redirect: &Redirect{},
		Headers:  http.Header{},
		Cookies:  []*http.Cookie{},
	}
}
func (f Action[I, O]) Execute(args ...any) (any, error) {
	x := ActionCtx[I, O]{
		Req:            args[0].(*http.Request),
		Res:            args[2].(*ActionRes[O]),
		ResponseWriter: args[3].(http.ResponseWriter),
	}
	if args[1] != nil {
		x.Input = args[1].(I)
	}
	f(x)
	return nil, nil
}
func (f Action[I, O]) GetInputInstance() any {
	var x I
	return x
}
func (f Action[I, O]) ValidateInput(v *validate.Validate, r *http.Request, actionType RouteType) (any, error) {
	isQuery := actionType == RouteTypesEnum.QueryAction
	isMutation := actionType == RouteTypesEnum.MutationAction
	if !isQuery && !isMutation {
		return nil, fmt.Errorf("method not accepted")
	}

	var x I
	var err error

	// __TODO add a test for an "any" input type, which comes up here as nil
	_type := reflect.TypeOf(x)
	if _type == nil {
		return nil, nil
	}

	kind := _type.Kind()
	isPtr := kind == reflect.Ptr

	if !isPtr {
		if isQuery {
			err = v.URLSearchParamsInto(r, &x)
		} else {
			err = v.JSONBodyInto(r.Body, &x)
		}
		if err != nil {
			return nil, err
		}
		return x, nil
	}

	ptrIsNil := reflect.ValueOf(x).IsNil()
	if ptrIsNil {
		x = reflect.New(_type.Elem()).Interface().(I)
	}

	pointsToStruct := isPtr && _type.Elem().Kind() == reflect.Struct
	if pointsToStruct {
		if isQuery {
			err = v.URLSearchParamsInto(r, x)
		} else {
			err = v.JSONBodyInto(r.Body, x)
		}
		if err != nil {
			return nil, err
		}
		return x, nil
	}

	return nil, fmt.Errorf("type I is not a struct or a pointer to a struct")
}
func (f Action[I, O]) GetOutputInstance() any {
	var x O
	return x
}

//////////////////// ResponseHelper ////////////////////

func (f *LoaderRes[O]) GetData() any {
	return f.Data
}
func (f *LoaderRes[O]) GetErrMsg() string {
	return f.ErrMsg
}
func (f *LoaderRes[O]) GetHeaders() http.Header {
	return f.Headers
}
func (f *LoaderRes[O]) GetCookies() []*http.Cookie {
	return f.Cookies
}
func (f *LoaderRes[O]) GetRedirect() *Redirect {
	return f.redirect
}
func (f *LoaderRes[O]) GetClientRedirectURL() string {
	return f.clientRedirectURL
}
func (f *LoaderRes[O]) GetHeadBlocks() []*HeadBlock {
	return f.HeadBlocks
}
func (f *ActionRes[O]) GetData() any {
	return f.Data
}
func (f *ActionRes[O]) GetErrMsg() string {
	return f.ErrMsg
}
func (f *ActionRes[O]) GetHeaders() http.Header {
	return f.Headers
}
func (f *ActionRes[O]) GetCookies() []*http.Cookie {
	return f.Cookies
}
func (f *ActionRes[O]) GetRedirect() *Redirect {
	return f.redirect
}
func (f *ActionRes[O]) GetClientRedirectURL() string {
	return f.clientRedirectURL
}
func (f *ActionRes[O]) GetHeadBlocks() []*HeadBlock {
	return nil // noop
}
