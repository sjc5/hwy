package lazyget

import (
	"reflect"
	"sync"
	"testing"
	"time"
)

func TestCache_Get(t *testing.T) {
	t.Run("Basic functionality", func(t *testing.T) {
		callCount := 0
		c := cache[int]{
			initFunc: func() int {
				callCount++
				return 42
			},
		}

		for i := 0; i < 5; i++ {
			if got := c.get(); got != 42 {
				t.Errorf("cache.get() = %v, want 42", got)
			}
		}

		if callCount != 1 {
			t.Errorf("InitFunc called %d times, want 1", callCount)
		}
	})

	t.Run("Concurrent access", func(t *testing.T) {
		const goroutines = 100
		callCount := 0
		c := cache[int]{
			initFunc: func() int {
				time.Sleep(10 * time.Millisecond) // Simulate work
				callCount++
				return 42
			},
		}

		var wg sync.WaitGroup
		wg.Add(goroutines)
		for i := 0; i < goroutines; i++ {
			go func() {
				defer wg.Done()
				if got := c.get(); got != 42 {
					t.Errorf("cache.get() = %v, want 42", got)
				}
			}()
		}
		wg.Wait()

		if callCount != 1 {
			t.Errorf("initFunc called %d times, want 1", callCount)
		}
	})

	t.Run("Nil InitFunc", func(t *testing.T) {
		c := cache[*int]{} // InitFunc is nil

		defer func() {
			if r := recover(); r == nil {
				t.Errorf("The code did not panic")
			}
		}()

		c.get() // This should panic
	})

	t.Run("Different types", func(t *testing.T) {
		testCases := []struct {
			name string
			c    func() any
			want any
		}{
			{"string", New(func() any { return "hello" }), "hello"},
			{"int", New(func() any { return 42 }), 42},
			{"slice", New(func() any { return []int{1, 2, 3} }), []int{1, 2, 3}},
			{"struct", New(func() any { return struct{ X int }{X: 10} }), struct{ X int }{X: 10}},
		}

		for _, tc := range testCases {
			tc := tc // capture range variable
			t.Run(tc.name, func(t *testing.T) {
				t.Parallel()
				got := tc.c()
				if !reflect.DeepEqual(got, tc.want) {
					t.Errorf("cache.get() = %v, want %v", got, tc.want)
				}
			})
		}
	})
}

func TestNew(t *testing.T) {
	t.Run("Creates new cache", func(t *testing.T) {
		initFunc := func() int { return 42 }
		c := New(initFunc)

		if c == nil {
			t.Fatal("New() returned nil")
		}

		if got := c(); got != 42 {
			t.Errorf("cache.get() = %v, want 42", got)
		}
	})

	t.Run("Nil InitFunc", func(t *testing.T) {
		c := New[int](nil)

		if c == nil {
			t.Fatal("New() returned nil")
		}

		defer func() {
			if r := recover(); r == nil {
				t.Errorf("The code did not panic")
			}
		}()

		c() // This should panic
	})
}

func TestCache_RaceCondition(t *testing.T) {
	c := cache[int]{
		initFunc: func() int {
			time.Sleep(10 * time.Millisecond) // Simulate work
			return 42
		},
	}

	done := make(chan bool)
	go func() {
		c.get()
		done <- true
	}()
	go func() {
		c.get()
		done <- true
	}()

	<-done
	<-done

	if got := c.get(); got != 42 {
		t.Errorf("cache.get() = %v, want 42", got)
	}
}

func BenchmarkCache_Get(b *testing.B) {
	c := cache[int]{
		initFunc: func() int {
			return 42
		},
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		c.get()
	}
}
