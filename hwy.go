package hwy

import (
	"net/http"

	"github.com/sjc5/hwy/packages/go/router"
)

type BuildOptions = router.BuildOptions
type Hwy = router.Hwy
type HeadBlock = router.HeadBlock
type DataFuncsMap = router.DataFuncsMap
type DataFuncs = router.DataFuncs
type ActionProps = router.ActionProps
type HeadProps = router.HeadProps
type Path = router.Path
type PathsFile = router.PathsFile
type BaseLoaderProps = router.BaseLoaderProps
type Redirect = router.Redirect

var Build = router.Build
var GenerateTypeScript = router.GenerateTypeScript
var GetIsJSONRequest = router.GetIsJSONRequest
var GetHeadElements = router.GetHeadElements
var GetSSRInnerHTML = router.GetSSRInnerHTML

// START -- REPEATED FROM router.go

type LoaderRes[O any] struct {
	Data       O
	Error      error
	Headers    http.Header
	Cookies    []*http.Cookie
	HeadBlocks []*HeadBlock
	redirect   *Redirect
}

func (f LoaderRes[O]) Redirect(url string, code int) {
	*f.redirect = Redirect{URL: url, Code: code}
}

type LoaderProps[O any] struct {
	*BaseLoaderProps
	LoaderRes *LoaderRes[O]
}

type LoaderFunc[O any] func(props *LoaderProps[O])

func (f LoaderFunc[O]) GetExecutePropsInstance() any {
	return &LoaderProps[O]{
		LoaderRes: &LoaderRes[O]{
			redirect:   &Redirect{},
			Headers:    http.Header{},
			Cookies:    []*http.Cookie{},
			HeadBlocks: []*HeadBlock{},
		},
	}
}
func (f LoaderFunc[O]) Execute(props any) (any, error) {
	loaderProps := props.(*LoaderProps[O])
	f(loaderProps)
	return nil, nil
}
func (f LoaderFunc[O]) GetInputInstance() any {
	return nil
}
func (f LoaderFunc[O]) GetOutputInstance() any {
	var x O
	return x
}

type ActionFunc[I any, O any] func(props *ActionProps) (O, error)

func (f ActionFunc[I, O]) GetExecutePropsInstance() any {
	return nil
}
func (f ActionFunc[I, O]) Execute(props any) (any, error) {
	return f(props.(*ActionProps))
}
func (f ActionFunc[I, O]) GetInputInstance() any {
	var x I
	return x
}
func (f ActionFunc[I, O]) GetOutputInstance() any {
	var x O
	return x
}

// END -- REPEATED FROM router.go
