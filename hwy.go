package hwy

import (
	"net/http"

	"github.com/sjc5/hwy/packages/go/router"
	"github.com/sjc5/kit/pkg/validate"
)

type BuildOptions = router.BuildOptions
type Hwy = router.Hwy
type HeadBlock = router.HeadBlock
type DataFunctionMap = router.DataFunctionMap
type Path = router.Path
type PathsFile = router.PathsFile
type LoaderProps = router.LoaderProps
type Redirect = router.Redirect

var Build = router.Build
var GenerateTypeScript = router.GenerateTypeScript
var GetIsJSONRequest = router.GetIsJSONRequest
var GetHeadElements = router.GetHeadElements
var GetSSRInnerHTML = router.GetSSRInnerHTML
var DataFunctionTypes = router.DataFunctionTypes

// START -- REPEATED FROM router.go
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

func (f LoaderRes[O]) Redirect(url string, code int) {
	*f.redirect = Redirect{URL: url, Code: code}
}

type LoaderFunc[O any] func(props *LoaderProps, res *LoaderRes[O])

func (f LoaderFunc[O]) GetResInstance() any {
	return &LoaderRes[O]{
		redirect:   &Redirect{},
		Headers:    http.Header{},
		Cookies:    []*http.Cookie{},
		HeadBlocks: []*HeadBlock{},
	}
}
func (f LoaderFunc[O]) Execute(args ...any) (any, error) {
	props := args[0].(*LoaderProps)
	loaderRes := args[1].(*LoaderRes[O])
	f(props, loaderRes)
	return nil, nil
}
func (f LoaderFunc[O]) GetInputInstance() any {
	return nil
}
func (f LoaderFunc[O]) ValidateQueryInput(v *validate.Validate, r *http.Request) (any, error) {
	return nil, nil
}
func (f LoaderFunc[O]) ValidateMutationInput(v *validate.Validate, r *http.Request) (any, error) {
	return nil, nil
}
func (f LoaderFunc[O]) GetOutputInstance() any {
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

func (f ActionRes[O]) Redirect(url string, code int) {
	*f.redirect = Redirect{URL: url, Code: code}
}

type ActionFunc[I any, O any] func(r *http.Request, input I, res *ActionRes[O])

func (f ActionFunc[I, O]) GetResInstance() any {
	return &ActionRes[O]{
		redirect: &Redirect{},
		Headers:  http.Header{},
		Cookies:  []*http.Cookie{},
	}
}
func (f ActionFunc[I, O]) Execute(args ...any) (any, error) {
	r := args[0].(*http.Request)
	input := args[1].(I)
	res := args[2].(*ActionRes[O])
	f(r, input, res)
	return nil, nil
}
func (f ActionFunc[I, O]) GetInputInstance() any {
	var x I
	return x
}
func (f ActionFunc[I, O]) ValidateQueryInput(v *validate.Validate, r *http.Request) (any, error) {
	var inputInstance I
	err := v.URLSearchParamsInto(r, &inputInstance)
	if err != nil {
		return nil, err
	}
	return inputInstance, nil
}
func (f ActionFunc[I, O]) ValidateMutationInput(v *validate.Validate, r *http.Request) (any, error) {
	return nil, nil
}
func (f ActionFunc[I, O]) GetOutputInstance() any {
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

// END -- NEEDS TO BE REPEATED IN ~/hwy.go
