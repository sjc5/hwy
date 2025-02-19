package hwy

import (
	"fmt"
	"net/http"
	"reflect"

	"github.com/sjc5/hwy/packages/go/router"
	"github.com/sjc5/kit/pkg/matcher"
	"github.com/sjc5/kit/pkg/validate"
)

type BuildOptions = router.BuildOptions
type TSGenOptions = router.TSGenOptions
type AdHocType = router.AdHocType
type DataFuncs = router.DataFuncs
type Hwy = router.Hwy
type HeadBlock = router.HeadBlock
type DataFunctionMap = router.DataFunctionMap
type Path = router.Path
type PathsFile = router.PathsFile
type Redirect = router.Redirect
type Params = matcher.Params
type SplatSegments = router.SplatSegments
type RouteType = router.RouteType
type ResponseHelper = router.ResponseHelper
type CtxHelper = router.CtxHelper

var Build = router.Build
var GenerateTypeScript = router.GenerateTypeScript
var GetIsJSONRequest = router.GetIsJSONRequest
var GetHeadElements = router.GetHeadElements
var GetSSRInnerHTML = router.GetSSRInnerHTML
var RouteTypesEnum = router.RouteTypesEnum
var GetAdHocDataContextWithValue = router.GetAdHocDataContextWithValue
var CreatePublicURLResolverPlugin = router.CreatePublicURLResolverPlugin
var CreateCSSURLFuncResolverPlugin = router.CreateCSSURLFuncResolverPlugin
var HwyPathsFileName = router.HwyPathsFileName

func GetAdHocDataFromContext[T any](r *http.Request) T {
	return router.GetAdHocDataFromContext[T](r)
}

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
	Params        Params
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
