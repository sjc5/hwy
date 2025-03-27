package mux

import (
	"encoding/json"
	"errors"
	"net/http"
	"path/filepath"

	"github.com/sjc5/river/x/kit/contextutil"
	"github.com/sjc5/river/x/kit/genericsutil"
	"github.com/sjc5/river/x/kit/matcher"
	"github.com/sjc5/river/x/kit/opt"
	"github.com/sjc5/river/x/kit/response"
	"github.com/sjc5/river/x/kit/tasks"
	"github.com/sjc5/river/x/kit/validate"
)

/////////////////////////////////////////////////////////////////////
/////// VARIOUS TYPES (CORE)
/////////////////////////////////////////////////////////////////////

type (
	HTTPMiddleware                = func(http.Handler) http.Handler
	TaskMiddlewareFunc[O any]     = genericsutil.IOFunc[*ReqData[None], O]
	TaskMiddleware[O any]         = tasks.RegisteredTask[*ReqData[None], O]
	TaskHandlerFunc[I any, O any] = genericsutil.IOFunc[*ReqData[I], O]
)

/////////////////////////////////////////////////////////////////////
/////// CORE ROUTER STRUCTURE
/////////////////////////////////////////////////////////////////////

type Router struct {
	_marshal_input           func(r *http.Request, iPtr any) error
	_tasks_registry          *tasks.Registry
	_http_mws                []HTTPMiddleware
	_task_mws                []tasks.AnyRegisteredTask
	_method_to_matcher_map   map[string]*_Method_Matcher
	_matcher_opts            *matcher.Options
	_not_found_handler       http.Handler
	_mount_root              string
	_auto_task_handler_etags bool
}

func (rt *Router) AllRoutes() []AnyRoute {
	_all_routes := make([]AnyRoute, 0)
	for _, _method_matcher := range rt._method_to_matcher_map {
		for _, _route := range _method_matcher._routes {
			_all_routes = append(_all_routes, _route)
		}
	}
	return _all_routes
}

func (rt *Router) TasksRegistry() *tasks.Registry {
	return rt._tasks_registry
}

// Takes zero or one pattern strings. If no arguments are provided, returns
// the mount root, otherwise returns the mount root joined with the
// provided pattern. Discards any extra arguments. For example, if
// mux.MountRoot() were to return "/api/", then mux.MountRoot("foo") would
// return "/api/foo", and mux.MountRoot("foo", "bar") would still just
// return "/api/foo".
func (rt *Router) MountRoot(optionalPatternToAppend ...string) string {
	if len(optionalPatternToAppend) == 0 {
		return rt._mount_root
	}
	return filepath.Join(rt._mount_root, optionalPatternToAppend[0])
}

type _Method_Matcher struct {
	_matcher          *matcher.Matcher
	_http_mws         []HTTPMiddleware
	_task_mws         []tasks.AnyRegisteredTask
	_routes           map[string]AnyRoute
	_req_data_getters map[string]_Req_Data_Getter
}

/////////////////////////////////////////////////////////////////////
/////// NEW ROUTER
/////////////////////////////////////////////////////////////////////

type Options struct {
	TasksRegistry *tasks.Registry

	// Used for mounting a router at a specific path, e.g., "/api/". If set,
	// the router will strip the provided mount root from the beginning of
	// incoming url paths before matching them against registered patterns.
	MountRoot string

	DynamicParamPrefixRune rune // Optional. Defaults to ':'.
	SplatSegmentRune       rune // Optional. Defaults to '*'.

	MarshalInput func(r *http.Request, inputPtr any) error

	// If set to true, task handlers will automatically add a strong ETag
	// (SHA-256 hash) to successful JSON responses. Has no effect on HTTP handlers.
	// Defaults to false.
	AutoTaskHandlerETags bool
}

func NewRouter(opts *Options) *Router {
	_matcher_opts := new(matcher.Options)

	if opts == nil {
		opts = new(Options)
	}

	_matcher_opts.DynamicParamPrefixRune = opt.Resolve(opts, opts.DynamicParamPrefixRune, ':')
	_matcher_opts.SplatSegmentRune = opt.Resolve(opts, opts.SplatSegmentRune, '*')

	mountRootToUse := opts.MountRoot

	if mountRootToUse != "" {
		mountRootLen := len(mountRootToUse)
		if mountRootLen == 1 {
			if mountRootToUse[0] == '/' {
				mountRootToUse = ""
			}
		}
		if mountRootLen > 1 && mountRootToUse[0] != '/' {
			mountRootToUse = "/" + mountRootToUse
		}
		if mountRootLen > 0 && mountRootToUse[mountRootLen-1] != '/' {
			mountRootToUse = mountRootToUse + "/"
		}
	}

	return &Router{
		_marshal_input:           opts.MarshalInput,
		_tasks_registry:          opts.TasksRegistry,
		_method_to_matcher_map:   make(map[string]*_Method_Matcher),
		_matcher_opts:            _matcher_opts,
		_mount_root:              mountRootToUse,
		_auto_task_handler_etags: opts.AutoTaskHandlerETags,
	}
}

/////////////////////////////////////////////////////////////////////
/////// PUBLIC UTILITIES
/////////////////////////////////////////////////////////////////////

// TaskHandlers are used for JSON responses only, and they are intended to
// be particularly convenient for sending JSON. If you need to send a different
// content type, use a traditional http.Handler instead.
func TaskHandlerFromFunc[I any, O any](tasksRegistry *tasks.Registry, taskHandlerFunc TaskHandlerFunc[I, O]) *TaskHandler[I, O] {
	return tasks.Register(tasksRegistry, func(tasksCtx *tasks.Arg[*ReqData[I]]) (O, error) {
		return taskHandlerFunc(tasksCtx.Input)
	})
}

func TaskMiddlewareFromFunc[O any](tasksRegistry *tasks.Registry, taskMwFunc TaskMiddlewareFunc[O]) *TaskMiddleware[O] {
	return tasks.Register(tasksRegistry, func(tasksCtx *tasks.Arg[*ReqData[None]]) (O, error) {
		return taskMwFunc(tasksCtx.Input)
	})
}

/////////////////////////////////////////////////////////////////////
/////// GLOBAL MIDDLEWARES
/////////////////////////////////////////////////////////////////////

func SetGlobalTaskMiddleware[O any](router *Router, taskMw *TaskMiddleware[O]) {
	router._task_mws = append(router._task_mws, taskMw)
}

func SetGlobalHTTPMiddleware(router *Router, httpMw HTTPMiddleware) {
	router._http_mws = append(router._http_mws, httpMw)
}

/////////////////////////////////////////////////////////////////////
/////// METHOD-LEVEL MIDDLEWARES
/////////////////////////////////////////////////////////////////////

func SetMethodLevelTaskMiddleware[I any, O any](
	router *Router, method string, taskMw TaskMiddleware[O],
) {
	_method_matcher := _must_get_matcher(router, method)
	_task := taskMw
	_method_matcher._task_mws = append(_method_matcher._task_mws, _task)
}

func SetMethodLevelHTTPMiddleware(router *Router, method string, httpMw HTTPMiddleware) {
	_method_matcher := _must_get_matcher(router, method)
	_method_matcher._http_mws = append(_method_matcher._http_mws, httpMw)
}

/////////////////////////////////////////////////////////////////////
/////// PATTERN-LEVEL MIDDLEWARE APPLIERS
/////////////////////////////////////////////////////////////////////

func SetRouteLevelTaskMiddleware[PI any, PO any, MWO any](route *Route[PI, PO], taskMw *TaskMiddleware[MWO]) {
	route._task_mws = append(route._task_mws, taskMw)
}

func SetPatternLevelHTTPMiddleware[I any, O any](route *Route[I, O], httpMw HTTPMiddleware) {
	route._http_mws = append(route._http_mws, httpMw)
}

/////////////////////////////////////////////////////////////////////
/////// NOT FOUND HANDLER
/////////////////////////////////////////////////////////////////////

func SetGlobalNotFoundHTTPHandler(router *Router, httpHandler http.Handler) {
	router._not_found_handler = httpHandler
}

/////////////////////////////////////////////////////////////////////
/////// HANDLER TYPES
/////////////////////////////////////////////////////////////////////

var _handler_types = struct {
	_http string
	_task string
}{
	_http: "http",
	_task: "task",
}

/////////////////////////////////////////////////////////////////////
/////// REGISTERED PATTERNS (CORE)
/////////////////////////////////////////////////////////////////////

// Core registered pattern structure
type Route[I any, O any] struct {
	genericsutil.ZeroHelper[I, O]

	_router  *Router
	_method  string
	_pattern string

	_http_mws []HTTPMiddleware
	_task_mws []tasks.AnyRegisteredTask

	_handler_type string
	_http_handler http.Handler
	_task_handler tasks.AnyRegisteredTask
}

/////////////////////////////////////////////////////////////////////
/////// REGISTERED PATTERNS (COBWEBS)
/////////////////////////////////////////////////////////////////////

// Interface to allow for type-agnostic handling of generic-typed routes.
type AnyRoute interface {
	genericsutil.AnyZeroHelper
	_get_handler_type() string
	_get_http_handler() http.Handler
	_get_task_handler() tasks.AnyRegisteredTask
	_get_http_mws() []HTTPMiddleware
	_get_task_mws() []tasks.AnyRegisteredTask
	Pattern() string
	Method() string
}

// Implementing the routeMarker interface on the Route struct.
func (route *Route[I, O]) _get_handler_type() string                  { return route._handler_type }
func (route *Route[I, O]) _get_http_handler() http.Handler            { return route._http_handler }
func (route *Route[I, O]) _get_task_handler() tasks.AnyRegisteredTask { return route._task_handler }
func (route *Route[I, O]) _get_http_mws() []HTTPMiddleware {
	return route._http_mws
}
func (route *Route[I, O]) _get_task_mws() []tasks.AnyRegisteredTask { return route._task_mws }
func (route *Route[I, O]) Pattern() string                          { return route._pattern }
func (route *Route[I, O]) Method() string                           { return route._method }

/////////////////////////////////////////////////////////////////////
/////// CORE PATTERN REGISTRATION FUNCTIONS
/////////////////////////////////////////////////////////////////////

// TaskHandlers are used for JSON responses only, and they are intended to
// be particularly convenient for sending JSON. If you need to send a different
// content type, use a traditional http.Handler instead.
func RegisterTaskHandler[I any, O any](
	router *Router, method, pattern string, taskHandler *TaskHandler[I, O],
) *Route[I, O] {
	_route := _new_route_struct[I, O](router, method, pattern)
	_route._handler_type = _handler_types._task
	_route._task_handler = taskHandler
	_must_register_route(_route)
	return _route
}

func RegisterHandlerFunc(router *Router, method, pattern string, httpHandlerFunc http.HandlerFunc) *Route[any, any] {
	return RegisterHandler(router, method, pattern, httpHandlerFunc)
}

func RegisterHandler(router *Router, method, pattern string, httpHandler http.Handler) *Route[any, any] {
	_route := _new_route_struct[any, any](router, method, pattern)
	_route._handler_type = _handler_types._http
	_route._http_handler = httpHandler
	_must_register_route(_route)
	return _route
}

/////////////////////////////////////////////////////////////////////
/////// REQUEST DATA (COBWEBS)
/////////////////////////////////////////////////////////////////////

// Interface to allow for type-agnostic handling of generic-typed request data.
type _Req_Data_Marker interface {
	_get_input() any
	_get_underlying_req_data_instance() any

	Params() Params
	SplatValues() []string
	TasksCtx() *tasks.TasksCtx
	Request() *http.Request
	ResponseProxy() *response.Proxy
}

// Implementing the reqDataMarker interface on the ReqData struct.
func (rd *ReqData[I]) _get_input() any                        { return rd._input }
func (rd *ReqData[I]) _get_underlying_req_data_instance() any { return rd }

func (rd *ReqData[I]) Input() I                       { return rd._input }
func (rd *ReqData[I]) Params() Params                 { return rd._params }
func (rd *ReqData[I]) SplatValues() []string          { return rd._splat_vals }
func (rd *ReqData[I]) TasksCtx() *tasks.TasksCtx      { return rd._tasks_ctx }
func (rd *ReqData[I]) Request() *http.Request         { return rd._tasks_ctx.Request() }
func (rd *ReqData[I]) ResponseProxy() *response.Proxy { return rd._response_proxy }

type _Req_Data_Getter interface {
	_get_req_data(r *http.Request, match *matcher.Match) (_Req_Data_Marker, error)
}

type _Req_Data_Getter_Impl[I any] func(*http.Request, *matcher.Match) (*ReqData[I], error)

func (f _Req_Data_Getter_Impl[I]) _get_req_data(r *http.Request, m *matcher.Match) (_Req_Data_Marker, error) {
	return f(r, m)
}

/////////////////////////////////////////////////////////////////////
/////// NATIVE CONTEXT
/////////////////////////////////////////////////////////////////////

// __TODO, not fully implemented yet, but the point of this is so that
// users can access the request data from http handlers. Not
// necessary for task handlers.

var _context_store = contextutil.NewStore[_Req_Data_Marker]("_req_data")

func GetReqData[I any](r *http.Request) *ReqData[I] {
	_req_data_marker := _context_store.GetValueFromContext(r.Context())
	return genericsutil.AssertOrZero[*ReqData[I]](_req_data_marker)
}

func GetParam[I any](r *http.Request, key string) string {
	return GetParams[I](r)[key]
}

func GetParams[I any](r *http.Request) Params {
	if _req_data := GetReqData[I](r); _req_data != nil {
		return _req_data._params
	}
	return nil
}

func GetSplatValues[I any](r *http.Request) []string {
	if _req_data := GetReqData[I](r); _req_data != nil {
		return _req_data._splat_vals
	}
	return nil
}

/////////////////////////////////////////////////////////////////////
/////// SERVE HTTP
/////////////////////////////////////////////////////////////////////

type findBestOutput struct {
	_method_matcher        *_Method_Matcher
	_match                 *matcher.Match
	_did_match             bool
	_head_fell_back_to_get bool
}

func (rt *Router) _find_best_matcher_and_match(_method string, _real_path string) *findBestOutput {
	_is_head := _method == http.MethodHead

	if _is_head {
		_head_matcher, _ := _get_matcher(rt, http.MethodHead)

		if _head_matcher != nil {
			_match, ok := _head_matcher._matcher.FindBestMatch(_real_path)
			if ok {
				return &findBestOutput{
					_method_matcher: _head_matcher,
					_match:          _match,
					_did_match:      true,
				}
			}
		}

		_method = http.MethodGet
	}

	_matcher, err := _get_matcher(rt, _method)
	if err != nil {
		return &findBestOutput{}
	}

	_match, ok := _matcher._matcher.FindBestMatch(_real_path)
	if !ok {
		return &findBestOutput{}
	}

	return &findBestOutput{
		_method_matcher:        _matcher,
		_match:                 _match,
		_did_match:             true,
		_head_fell_back_to_get: _is_head,
	}
}

func _treat_get_as_head(_handler http.Handler, w http.ResponseWriter, r *http.Request) {
	headRW := &headResponseWriter{ResponseWriter: w, header: make(http.Header)}
	_handler.ServeHTTP(headRW, r)
	for k, v := range headRW.header {
		for _, val := range v {
			w.Header().Add(k, val)
		}
	}
	w.WriteHeader(headRW.statusCode)
}

type headResponseWriter struct {
	http.ResponseWriter
	header     http.Header
	statusCode int
}

func (hw *headResponseWriter) Header() http.Header            { return hw.header }
func (hw *headResponseWriter) WriteHeader(statusCode int)     { hw.statusCode = statusCode }
func (hw *headResponseWriter) Write(data []byte) (int, error) { return len(data), nil }

func (rt *Router) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	pathToUse := r.URL.Path
	if rt._mount_root != "" {
		// strip the mount root from the path
		if len(pathToUse) >= len(rt._mount_root) && pathToUse[:len(rt._mount_root)] == rt._mount_root {
			pathToUse = "/" + pathToUse[len(rt._mount_root):]
		}
	}

	_find_best_match_output := rt._find_best_matcher_and_match(r.Method, pathToUse)

	if !_find_best_match_output._did_match {
		if rt._not_found_handler != nil {
			rt._not_found_handler.ServeHTTP(w, r)
			return
		} else {
			http.NotFound(w, r)
			return
		}
	}

	_match := _find_best_match_output._match
	_method_matcher := _find_best_match_output._method_matcher
	_head_fell_back_to_get := _find_best_match_output._head_fell_back_to_get

	_orig_pattern := _match.OriginalPattern()
	_route := _method_matcher._routes[_orig_pattern]

	_req_data_getter, ok := _method_matcher._req_data_getters[_orig_pattern]
	if !ok {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	_handler_req_data_marker, err := _req_data_getter._get_req_data(r, _match)
	if err != nil {
		if validate.IsValidationError(err) {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	r = _context_store.GetRequestWithContext(r, _handler_req_data_marker)

	if _route._get_handler_type() == _handler_types._http {
		_handler := _route._get_http_handler()
		_handler = run_appropriate_mws(rt, _handler_req_data_marker, _method_matcher, _route, _handler)

		if _head_fell_back_to_get {
			_treat_get_as_head(_handler, w, r)
			return
		}

		_handler.ServeHTTP(w, r)
		return
	}

	_handler_func := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		res := response.New(w)

		_tasks_ctx := _handler_req_data_marker.TasksCtx()

		_prepared_task := tasks.PrepAny(_tasks_ctx, _route._get_task_handler(), _handler_req_data_marker._get_underlying_req_data_instance())
		if ok := _tasks_ctx.ParallelPreload(_prepared_task); !ok {
			res.InternalServerError()
			return
		}

		_data, err := _prepared_task.GetAny()
		if err != nil {
			res.InternalServerError()
			return
		}

		_response_proxy := _handler_req_data_marker.ResponseProxy()
		_response_proxy.ApplyToResponseWriter(w, r)

		if _response_proxy.IsError() || _response_proxy.IsRedirect() {
			return
		}

		_json_bytes, err := json.Marshal(_data)
		if err != nil {
			res.InternalServerError()
			return
		}

		if rt._auto_task_handler_etags {
			etag := response.ToQuotedSha256Etag(_json_bytes)
			res.SetETag(etag)
			if response.ShouldReturn304Conservative(r, etag) {
				res.NotModified()
				return
			}
		}

		res.JSONBytes(_json_bytes)
	})

	_handler := http.Handler(_handler_func)
	_handler = run_appropriate_mws(
		rt,
		_handler_req_data_marker,
		_method_matcher,
		_route,
		_handler,
	)

	if _head_fell_back_to_get {
		_treat_get_as_head(_handler, w, r)
		return
	}

	_handler.ServeHTTP(w, r)
}

func run_appropriate_mws(
	_router *Router,
	_req_data_marker _Req_Data_Marker,
	_method_matcher *_Method_Matcher,
	_route_marker AnyRoute,
	_handler http.Handler,
) http.Handler {
	/////// HTTP MIDDLEWARES - Chain in reverse order
	_http_mws := _route_marker._get_http_mws()
	for i := len(_http_mws) - 1; i >= 0; i-- { // pattern
		_handler = _http_mws[i](_handler)
	}
	for i := len(_method_matcher._http_mws) - 1; i >= 0; i-- { // method
		_handler = _method_matcher._http_mws[i](_handler)
	}
	for i := len(_router._http_mws) - 1; i >= 0; i-- { // global
		_handler = _router._http_mws[i](_handler)
	}

	/////// TASK MIDDLEWARES
	_task_mws := _route_marker._get_task_mws()
	_cap := len(_task_mws) + len(_method_matcher._task_mws) + len(_router._task_mws)
	_tasks_to_run := make([]tasks.AnyRegisteredTask, 0, _cap)
	_tasks_to_run = append(_tasks_to_run, _router._task_mws...)         // global
	_tasks_to_run = append(_tasks_to_run, _method_matcher._task_mws...) // method
	_tasks_to_run = append(_tasks_to_run, _task_mws...)                 // pattern

	// Wrap the already-chained HTTP handlers with task middleware handling
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_tasks_ctx := _req_data_marker.TasksCtx()
		_tasks_with_input := make([]tasks.AnyPreparedTask, 0, len(_tasks_to_run))
		_response_proxies := make([]*response.Proxy, 0, len(_tasks_to_run))

		for _, task := range _tasks_to_run {
			_response_proxy := response.NewProxy()
			_response_proxies = append(_response_proxies, _response_proxy)

			_new_rd := &ReqData[None]{
				_params:         _req_data_marker.Params(),
				_splat_vals:     _req_data_marker.SplatValues(),
				_tasks_ctx:      _tasks_ctx,
				_input:          None{},
				_response_proxy: _response_proxy,
			}

			_tasks_with_input = append(_tasks_with_input,
				tasks.PrepAny(_tasks_ctx, task, _new_rd))
		}

		// Run all task middlewares in parallel
		_tasks_ctx.ParallelPreload(_tasks_with_input...)

		// Merge all response proxies from task middlewares
		_merged_response_proxy := response.MergeProxyResponses(_response_proxies...)
		// _is_client_redirect := _merged_response_proxy.IsClientRedirect()
		_merged_response_proxy.ApplyToResponseWriter(w, r)

		if _merged_response_proxy.IsError() || _merged_response_proxy.IsRedirect() {
			return
		}

		// Continue with the regular HTTP handler chain
		_handler.ServeHTTP(w, r)
	})
}

/////////////////////////////////////////////////////////////////////
/////// INTERNAL HELPERS
/////////////////////////////////////////////////////////////////////

func _new_route_struct[I any, O any](_router *Router, _method, _pattern string) *Route[I, O] {
	return &Route[I, O]{_router: _router, _method: _method, _pattern: _pattern}
}

func _must_register_route[I any, O any](_route *Route[I, O]) {
	_method_matcher := _must_get_matcher(_route._router, _route._method)
	_method_matcher._matcher.RegisterPattern(_route._pattern)
	_method_matcher._routes[_route._pattern] = _route
	_method_matcher._req_data_getters[_route._pattern] = _to_req_data_getter_impl(_route)
}

func _req_data_starter[I any](_match *matcher.Match, _tasks_registry *tasks.Registry, r *http.Request) *ReqData[I] {
	_req_data := new(ReqData[I])
	if len(_match.Params) > 0 {
		_req_data._params = _match.Params
	}
	if len(_match.SplatValues) > 0 {
		_req_data._splat_vals = _match.SplatValues
	}
	_req_data._tasks_ctx = _tasks_registry.NewCtxFromRequest(r)
	_req_data._response_proxy = response.NewProxy()
	return _req_data
}

func _to_req_data_getter_impl[I any, O any](_route *Route[I, O]) _Req_Data_Getter_Impl[I] {
	return _Req_Data_Getter_Impl[I](
		func(r *http.Request, _match *matcher.Match) (*ReqData[I], error) {
			_req_data := _req_data_starter[I](_match, _route._router._tasks_registry, r)
			_input_ptr := _route.IPtr()
			if _route._router._marshal_input != nil {
				if err := _route._router._marshal_input(_req_data.Request(), _input_ptr); err != nil {
					return nil, err
				}
			}
			_req_data._input = *(_input_ptr.(*I))
			return _req_data, nil
		},
	)
}

func _must_get_matcher(_router *Router, _method string) *_Method_Matcher {
	_method_matcher, err := _get_matcher(_router, _method)
	if err != nil {
		panic(err)
	}
	return _method_matcher
}

func _get_matcher(_router *Router, _method string) (*_Method_Matcher, error) {
	if _, ok := _permitted_http_methods[_method]; !ok {
		return nil, errors.New("unknown method")
	}
	_method_matcher, ok := _router._method_to_matcher_map[_method]
	if !ok {
		_method_matcher = &_Method_Matcher{
			_matcher:          matcher.New(_router._matcher_opts),
			_routes:           make(map[string]AnyRoute),
			_req_data_getters: make(map[string]_Req_Data_Getter),
		}
		_router._method_to_matcher_map[_method] = _method_matcher
	}
	return _method_matcher, nil
}

var _permitted_http_methods = map[string]struct{}{
	http.MethodGet: {}, http.MethodHead: {}, // query methods
	http.MethodPost: {}, http.MethodPut: {}, http.MethodPatch: {}, http.MethodDelete: {}, // mutation methods
	http.MethodConnect: {}, http.MethodOptions: {}, http.MethodTrace: {}, // other methods
}
