package main

import (
	"fmt"
	"reflect"
)

type Base struct {
	X string `json:"x"`
}

func (b Base) TSType() map[string]string { return map[string]string{"X": "asdf"} }

type BaseWithPtrMethod struct {
	X string `json:"x"`
}

func (b *BaseWithPtrMethod) TSType() map[string]string { return map[string]string{"X": "asdf"} }

type Base_Wrapped struct{ Base }
type Base_WrappedPtr struct{ *Base }
type BaseWithPtrMethod_Wrapped struct{ BaseWithPtrMethod }
type BaseWithPtrMethod_WrappedPtr struct{ *BaseWithPtrMethod }

type TSTyper interface {
	TSType() map[string]string
}

func implementsTSTyper(t reflect.Type) bool {
	if t.Implements(reflect.TypeOf((*TSTyper)(nil)).Elem()) {
		return true
	}
	if t.Kind() != reflect.Ptr && reflect.PointerTo(t).Implements(reflect.TypeOf((*TSTyper)(nil)).Elem()) {
		return true
	}
	return false
}

func main() {
	run(Base{})
	run(&Base{})
	fmt.Println()

	run(BaseWithPtrMethod{})
	run(&BaseWithPtrMethod{})
	fmt.Println()

	run(Base_Wrapped{})
	run(&Base_Wrapped{})
	fmt.Println()

	run(Base_WrappedPtr{})
	run(&Base_WrappedPtr{})
	fmt.Println()

	run(BaseWithPtrMethod_Wrapped{})
	run(&BaseWithPtrMethod_Wrapped{})
	fmt.Println()

	run(BaseWithPtrMethod_WrappedPtr{})
	run(&BaseWithPtrMethod_WrappedPtr{})
}

func run(x any) {
	reflectType := reflect.TypeOf(x)
	name := reflectType.Name()
	if reflectType.Kind() == reflect.Ptr {
		name = "*" + reflectType.Elem().Name()
	}
	if implementsTSTyper(reflectType) {
		fmt.Println(name, " --  yes", getTSTypeMap(reflectType))
	} else {
		fmt.Println(name, " --  no")
	}
}

func getTSTypeMap(t reflect.Type) map[string]string {
	var instance reflect.Value
	if t.Kind() == reflect.Ptr {
		instance = reflect.New(t.Elem())
	} else {
		instance = reflect.New(t)
	}
	initializeEmbeddedPointers(instance)
	if t.Kind() == reflect.Ptr {
		return instance.Interface().(TSTyper).TSType()
	} else {
		return instance.Interface().(TSTyper).TSType()
	}
}

func initializeEmbeddedPointers(v reflect.Value) {
	if v.Kind() == reflect.Ptr && v.Elem().Kind() == reflect.Struct {
		elem := v.Elem()
		typ := elem.Type()
		for i := range elem.NumField() {
			field := elem.Field(i)
			fieldType := typ.Field(i)
			if fieldType.Anonymous && field.Kind() == reflect.Ptr && field.IsNil() {
				newValue := reflect.New(field.Type().Elem())
				field.Set(newValue)
				initializeEmbeddedPointers(newValue)
			}
		}
	}
}
