package router

// START -- NEEDS TO BE REPEATED IN ~/hwy.go

type LoaderFunc[O any] func(props *LoaderProps) (O, error)

func (f LoaderFunc[O]) Execute(props any) (any, error) {
	return f(props.(*LoaderProps))
}
func (f LoaderFunc[O]) GetInputInstance() any {
	return nil
}
func (f LoaderFunc[O]) GetOutputInstance() any {
	var x O
	return x
}

type ActionFunc[I any, O any] func(props *ActionProps) (O, error)

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

type HeadFunc func(props *HeadProps) (*[]HeadBlock, error)

func (f HeadFunc) Execute(props any) (any, error) {
	return f(props.(*HeadProps))
}
func (f HeadFunc) GetInputInstance() any {
	return nil
}
func (f HeadFunc) GetOutputInstance() any {
	return nil
}

// END -- NEEDS TO BE REPEATED IN ~/hwy.go
