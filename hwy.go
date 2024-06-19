package hwy

import "github.com/sjc5/hwy/packages/go/router"

type BuildOptions = router.BuildOptions
type Hwy = router.Hwy
type HeadBlock = router.HeadBlock
type DataFuncsMap = router.DataFuncsMap
type DataFuncs = router.DataFuncs
type LoaderProps = router.LoaderProps
type ActionProps = router.ActionProps
type HeadProps = router.HeadProps
type Path = router.Path
type PathsFile = router.PathsFile

var Build = router.Build
var GenerateTypeScript = router.GenerateTypeScript
var NewLRUCache = router.NewLRUCache
var GetIsJSONRequest = router.GetIsJSONRequest
var GetHeadElements = router.GetHeadElements
var GetSSRInnerHTML = router.GetSSRInnerHTML

// START -- REPEATED FROM router.go

type LoaderFunc[O any] func(props LoaderProps) (O, error)

func (f LoaderFunc[O]) Execute(props any) (any, error) {
	return f(props.(LoaderProps))
}
func (f LoaderFunc[O]) GetInputInstance() any {
	return nil
}
func (f LoaderFunc[O]) GetOutputInstance() any {
	var x O
	return x
}

type ActionFunc[I any, O any] func(props ActionProps) (O, error)

func (f ActionFunc[I, O]) Execute(props any) (any, error) {
	return f(props.(ActionProps))
}
func (f ActionFunc[I, O]) GetInputInstance() any {
	var x I
	return x
}
func (f ActionFunc[I, O]) GetOutputInstance() any {
	var x O
	return x
}

type HeadFunc func(props HeadProps) (*[]HeadBlock, error)

func (f HeadFunc) Execute(props any) (any, error) {
	return f(props.(HeadProps))
}
func (f HeadFunc) GetInputInstance() any {
	return nil
}
func (f HeadFunc) GetOutputInstance() any {
	return nil
}

// END -- REPEATED FROM router.go
