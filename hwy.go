package hwy

import (
	"net/http"

	"github.com/sjc5/hwy/packages/go/router"
	"github.com/sjc5/kit/pkg/validate"
)

// __TODO - add API prefix concept and TS type extractors based on prefix

type BuildOptions = router.BuildOptions
type Hwy = router.Hwy
type HeadBlock = router.HeadBlock
type DataFunctionMap = router.DataFunctionMap
type Path = router.Path
type PathsFile = router.PathsFile
type UILoaderProps = router.UILoaderProps
type Redirect = router.Redirect

var Build = router.Build
var GenerateTypeScript = router.GenerateTypeScript
var GetIsJSONRequest = router.GetIsJSONRequest
var GetHeadElements = router.GetHeadElements
var GetSSRInnerHTML = router.GetSSRInnerHTML
var RouteTypesEnum = router.RouteTypesEnum

// START -- REPEATED FROM router.go

type UILoaderRes[O any] struct {
	// same as APIRes
	Data     O
	Error    error
	Headers  http.Header
	Cookies  []*http.Cookie
	redirect *Redirect

	// different from APIRes
	HeadBlocks []*HeadBlock
}

func (f UILoaderRes[O]) Redirect(url string, code int) {
	*f.redirect = Redirect{URL: url, Code: code}
}

type UILoaderFunc[O any] func(props *UILoaderProps, res *UILoaderRes[O])

func (f UILoaderFunc[O]) GetResInstance() any {
	return &UILoaderRes[O]{
		redirect:   &Redirect{},
		Headers:    http.Header{},
		Cookies:    []*http.Cookie{},
		HeadBlocks: []*HeadBlock{},
	}
}
func (f UILoaderFunc[O]) Execute(args ...any) (any, error) {
	props := args[0].(*UILoaderProps)
	UILoaderRes := args[1].(*UILoaderRes[O])
	f(props, UILoaderRes)
	return nil, nil
}
func (f UILoaderFunc[O]) GetInputInstance() any {
	return nil
}
func (f UILoaderFunc[O]) ValidateQueryInput(v *validate.Validate, r *http.Request) (any, error) {
	return nil, nil
}
func (f UILoaderFunc[O]) ValidateMutationInput(v *validate.Validate, r *http.Request) (any, error) {
	return nil, nil
}
func (f UILoaderFunc[O]) GetOutputInstance() any {
	var x O
	return x
}

type APIRes[O any] struct {
	// same as UILoaderRes
	Data     O
	Error    error
	Headers  http.Header
	Cookies  []*http.Cookie
	redirect *Redirect
}

func (f APIRes[O]) Redirect(url string, code int) {
	*f.redirect = Redirect{URL: url, Code: code}
}

type APIFunc[I any, O any] func(r *http.Request, input I, res *APIRes[O])

func (f APIFunc[I, O]) GetResInstance() any {
	return &APIRes[O]{
		redirect: &Redirect{},
		Headers:  http.Header{},
		Cookies:  []*http.Cookie{},
	}
}
func (f APIFunc[I, O]) Execute(args ...any) (any, error) {
	r := args[0].(*http.Request)
	input := args[1].(I)
	res := args[2].(*APIRes[O])
	f(r, input, res)
	return nil, nil
}
func (f APIFunc[I, O]) GetInputInstance() any {
	var x I
	return x
}
func (f APIFunc[I, O]) ValidateQueryInput(v *validate.Validate, r *http.Request) (any, error) {
	var inputInstance I
	err := v.URLSearchParamsInto(r, &inputInstance)
	if err != nil {
		return nil, err
	}
	return inputInstance, nil
}
func (f APIFunc[I, O]) ValidateMutationInput(v *validate.Validate, r *http.Request) (any, error) {
	return nil, nil
}
func (f APIFunc[I, O]) GetOutputInstance() any {
	var x O
	return x
}

//////////////////// DataFunctionPropsGetter ////////////////////

func (f UILoaderRes[O]) GetData() any {
	return f.Data
}
func (f UILoaderRes[O]) GetError() error {
	return f.Error
}
func (f UILoaderRes[O]) GetHeaders() http.Header {
	return f.Headers
}
func (f UILoaderRes[O]) GetCookies() []*http.Cookie {
	return f.Cookies
}
func (f UILoaderRes[O]) GetRedirect() *Redirect {
	return f.redirect
}
func (f UILoaderRes[O]) GetHeadBlocks() []*HeadBlock {
	return f.HeadBlocks
}
func (f APIRes[O]) GetData() any {
	return f.Data
}
func (f APIRes[O]) GetError() error {
	return f.Error
}
func (f APIRes[O]) GetHeaders() http.Header {
	return f.Headers
}
func (f APIRes[O]) GetCookies() []*http.Cookie {
	return f.Cookies
}
func (f APIRes[O]) GetRedirect() *Redirect {
	return f.redirect
}
func (f APIRes[O]) GetHeadBlocks() []*HeadBlock {
	return nil // noop
}

// END -- NEEDS TO BE REPEATED IN ~/hwy.go
