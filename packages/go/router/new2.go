package router

type UntypedFunction interface {
	GetInputZeroValue() any
	GetOutputZeroValue() any
}

type TypedFunction[I any, O any] func(I) (O, error)

func (f TypedFunction[I, O]) GetInputZeroValue() any {
	var i I
	return i
}
func (f TypedFunction[I, O]) GetOutputZeroValue() any {
	var o O
	return o
}

type UntypedFunctionWrapped interface {
	UntypedFunction
	Run(any) (any, error)
}

type TypedFunctionWrapped[I any, O any] struct {
	fn TypedFunction[I, O]
}

func (f TypedFunctionWrapped[I, O]) GetInputZeroValue() any {
	return f.fn.GetInputZeroValue()
}
func (f TypedFunctionWrapped[I, O]) GetOutputZeroValue() any {
	return f.fn.GetOutputZeroValue()
}
func (f TypedFunctionWrapped[I, O]) Run(i any) (any, error) {
	return f.fn(i.(I))
}
