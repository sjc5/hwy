// Package lazyget provides a simple way to create thread-safe,
// type-safe getter functions to lazily initialize, cache,
// and return a value of a given type. It uses a sync.Once
// to ensure that the initialization function is only
// called once, even in concurrent environments. All
// subsequent calls will return the cached value.
//
// Usage:
//
//	var GetResource = lazyget.New(func() *Resource {
//		// do some expensive initialization here
//		return &Resource{}
//	})
//
//	r := GetResource() // r is of type *Resource
package lazyget

import "sync"

// New takes an initialization function and returns
// a getter function that will lazily initialize,
// cache, and return a value of type T.
func New[T any](initFunc func() T) func() T {
	c := &cache[T]{initFunc: initFunc}
	return c.get
}

type cache[T any] struct {
	val      T
	init     sync.Once
	initFunc func() T
}

func (loc *cache[T]) get() T {
	loc.init.Do(func() { loc.val = loc.initFunc() })
	return loc.val
}
