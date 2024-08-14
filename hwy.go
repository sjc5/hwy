package hwy

import (
	"fmt"
	"net/http"
	"reflect"

	"github.com/sjc5/hwy/packages/go/router"
	"github.com/sjc5/kit/pkg/validate"
)

// __TODO
// - add API prefix concept and TS type extractors and client based on prefix
// - don't revalidate on query, only on mutation

type BuildOptions = router.BuildOptions
type Hwy = router.Hwy
type HeadBlock = router.HeadBlock
type DataFunctionMap = router.DataFunctionMap
type Path = router.Path
type PathsFile = router.PathsFile
type Redirect = router.Redirect
type Params = router.Params
type SplatSegments = router.SplatSegments
type RouteType = router.RouteType

var Build = router.Build
var GenerateTypeScript = router.GenerateTypeScript
var GetIsJSONRequest = router.GetIsJSONRequest
var GetHeadElements = router.GetHeadElements
var GetSSRInnerHTML = router.GetSSRInnerHTML
var RouteTypesEnum = router.RouteTypesEnum
var GetAdHocDataContextWithValue = router.GetAdHocDataContextWithValue

func GetAdHocDataFromContext[T any](r *http.Request) T {
	return router.GetAdHocDataFromContext[T](r)
}

type LoaderRes[O any] struct {
	// same as ActionRes
	Data     O
	Error    error
	Headers  http.Header
	Cookies  []*http.Cookie
	redirect *Redirect

	// different from ActionRes
	HeadBlocks []*HeadBlock
}

type LoaderCtx[O any] struct {
	Req           *http.Request
	Params        Params
	SplatSegments SplatSegments
	Res           *LoaderRes[O]
}

func (f LoaderRes[O]) Redirect(url string, code int) {
	*f.redirect = Redirect{URL: url, Code: code}
}

type Loader[O any] func(ctx LoaderCtx[O])

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
		Params:        args[1].(Params),
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
	Data     O
	Error    error
	Headers  http.Header
	Cookies  []*http.Cookie
	redirect *Redirect
}

type ActionCtx[I any, O any] struct {
	Req   *http.Request
	Input I
	Res   *ActionRes[O]
}

func (f ActionRes[O]) Redirect(url string, code int) {
	*f.redirect = Redirect{URL: url, Code: code}
}

type Action[I any, O any] func(ctx ActionCtx[I, O])

func (f Action[I, O]) GetResInstance() any {
	return &ActionRes[O]{
		redirect: &Redirect{},
		Headers:  http.Header{},
		Cookies:  []*http.Cookie{},
	}
}
func (f Action[I, O]) Execute(args ...any) (any, error) {
	f(ActionCtx[I, O]{
		Req:   args[0].(*http.Request),
		Input: args[1].(I),
		Res:   args[2].(*ActionRes[O]),
	})
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

	isPtr := reflect.TypeOf(x).Kind() == reflect.Ptr

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
		x = reflect.New(reflect.TypeOf(x).Elem()).Interface().(I)
	}

	pointsToStruct := isPtr && reflect.TypeOf(x).Elem().Kind() == reflect.Struct
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

//////////////////// DataFunctionPropsGetter ////////////////////

func (f LoaderRes[O]) GetData() any {
	return f.Data
}
func (f LoaderRes[O]) GetError() error {
	return f.Error
}
func (f LoaderRes[O]) GetHeaders() http.Header {
	return f.Headers
}
func (f LoaderRes[O]) GetCookies() []*http.Cookie {
	return f.Cookies
}
func (f LoaderRes[O]) GetRedirect() *Redirect {
	return f.redirect
}
func (f LoaderRes[O]) GetHeadBlocks() []*HeadBlock {
	return f.HeadBlocks
}
func (f ActionRes[O]) GetData() any {
	return f.Data
}
func (f ActionRes[O]) GetError() error {
	return f.Error
}
func (f ActionRes[O]) GetHeaders() http.Header {
	return f.Headers
}
func (f ActionRes[O]) GetCookies() []*http.Cookie {
	return f.Cookies
}
func (f ActionRes[O]) GetRedirect() *Redirect {
	return f.redirect
}
func (f ActionRes[O]) GetHeadBlocks() []*HeadBlock {
	return nil // noop
}
