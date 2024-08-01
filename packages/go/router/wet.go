package router

import "net/http"

// START -- NEEDS TO BE REPEATED IN ~/hwy.go

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

// END -- NEEDS TO BE REPEATED IN ~/hwy.go

func (f LoaderProps[O]) getData() any {
	return f.LoaderRes.Data
}
func (f LoaderProps[O]) getError() error {
	return f.LoaderRes.Error
}
func (f LoaderProps[O]) getHeaders() http.Header {
	return f.LoaderRes.Headers
}
func (f LoaderProps[O]) getCookies() []*http.Cookie {
	return f.LoaderRes.Cookies
}
func (f LoaderProps[O]) getRedirect() *Redirect {
	return f.LoaderRes.redirect
}
func (f LoaderProps[O]) getHeadBlocks() []*HeadBlock {
	return f.LoaderRes.HeadBlocks
}
