package router

import "net/http"

// START -- NEEDS TO BE REPEATED IN ~/hwy.go

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

type LoaderFunc[O any] func(props *DataFunctionProps, res *LoaderRes[O])

func (f LoaderFunc[O]) GetResInstance() any {
	return &LoaderRes[O]{
		redirect:   &Redirect{},
		Headers:    http.Header{},
		Cookies:    []*http.Cookie{},
		HeadBlocks: []*HeadBlock{},
	}
}
func (f LoaderFunc[O]) Execute(props, res any) (any, error) {
	loaderRes := res.(*LoaderRes[O])
	f(props.(*DataFunctionProps), loaderRes)
	return nil, nil
}
func (f LoaderFunc[O]) GetInputInstance() any {
	return nil
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

type ActionFunc[I any, O any] func(props *DataFunctionProps, res *ActionRes[O])

func (f ActionFunc[I, O]) GetResInstance() any {
	return &ActionRes[O]{
		redirect: &Redirect{},
		Headers:  http.Header{},
		Cookies:  []*http.Cookie{},
	}
}
func (f ActionFunc[I, O]) Execute(props, res any) (any, error) {
	actionRes := res.(*ActionRes[O])
	f(props.(*DataFunctionProps), actionRes)
	return nil, nil
}
func (f ActionFunc[I, O]) GetInputInstance() any {
	var x I
	return x
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
