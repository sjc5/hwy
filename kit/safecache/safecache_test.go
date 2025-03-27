package safecache

import (
	"errors"
	"strconv"
	"sync"
	"testing"
	"time"
)

// Helper function to simulate slow initialization
func slowInit() (int, error) {
	time.Sleep(100 * time.Millisecond)
	return 42, nil
}

// Helper function to simulate an error during initialization
func errorInit() (int, error) {
	return 0, errors.New("init failed")
}

// Test basic functionality of Cache
func TestCache_Basic(t *testing.T) {
	cache := New(slowInit, nil)
	val, err := cache.Get()
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if val != 42 {
		t.Fatalf("expected value 42, got %d", val)
	}
}

// Test that Cache only initializes once
func TestCache_InitializeOnce(t *testing.T) {
	count := 0
	cache := New(func() (int, error) {
		count++
		return slowInit()
	}, nil)

	var wg sync.WaitGroup
	wg.Add(3)

	for i := 0; i < 3; i++ {
		go func() {
			defer wg.Done()
			val, err := cache.Get()
			if err != nil {
				t.Errorf("expected no error, got %v", err)
			}
			if val != 42 {
				t.Errorf("expected value 42, got %d", val)
			}
		}()
	}

	wg.Wait()
	if count != 1 {
		t.Fatalf("expected initFunc to be called once, but it was called %d times", count)
	}
}

// Test that Cache returns an error if initFunc fails
func TestCache_InitError(t *testing.T) {
	cache := New(errorInit, nil)
	val, err := cache.Get()
	if err == nil {
		t.Fatalf("expected error, got none")
	}
	if val != 0 {
		t.Fatalf("expected zero value, got %d", val)
	}
}

// Test the bypass functionality
func TestCache_Bypass(t *testing.T) {
	count := 0
	cache := New(func() (int, error) {
		count++
		return slowInit()
	}, func() bool { return true })

	// Bypass should cause initFunc to be called every time
	for i := 0; i < 3; i++ {
		val, err := cache.Get()
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}
		if val != 42 {
			t.Fatalf("expected value 42, got %d", val)
		}
	}
	if count != 3 {
		t.Fatalf("expected initFunc to be called 3 times, but it was called %d times", count)
	}
}

// Test CacheMap basic functionality
func TestCacheMap_Basic(t *testing.T) {
	cacheMap := NewMap(
		func(key string) (int, error) {
			i, _ := strconv.Atoi(key)
			return i * 2, nil
		},
		func(key string) string { return key },
		nil,
	)

	val, err := cacheMap.Get("21")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if val != 42 {
		t.Fatalf("expected value 42, got %d", val)
	}
}

// Test CacheMap concurrency and initialization
func TestCacheMap_Concurrency(t *testing.T) {
	count := 0
	cacheMap := NewMap(
		func(key string) (int, error) {
			count++
			time.Sleep(100 * time.Millisecond)
			i, _ := strconv.Atoi(key)
			return i * 2, nil
		},
		func(key string) string { return key },
		nil,
	)

	var wg sync.WaitGroup
	wg.Add(3)

	for i := 0; i < 3; i++ {
		go func() {
			defer wg.Done()
			val, err := cacheMap.Get("21")
			if err != nil {
				t.Errorf("expected no error, got %v", err)
			}
			if val != 42 {
				t.Errorf("expected value 42, got %d", val)
			}
		}()
	}

	wg.Wait()
	if count != 1 {
		t.Fatalf("expected initFunc to be called once, but it was called %d times", count)
	}
}

// Test CacheMap bypass functionality
func TestCacheMap_Bypass(t *testing.T) {
	count := 0
	cacheMap := NewMap(
		func(key string) (int, error) {
			count++
			i, _ := strconv.Atoi(key)
			return i * 2, nil
		},
		func(key string) string { return key },
		func(key string) bool { return key == "bypass" },
	)

	// First access should initialize the value
	val, err := cacheMap.Get("21")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if val != 42 {
		t.Fatalf("expected value 42, got %d", val)
	}

	// Bypass should cause initFunc to be called every time
	for i := 0; i < 3; i++ {
		val, err := cacheMap.Get("bypass")
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}
		if val != 0 {
			t.Fatalf("expected value 0 for bypassed key, got %d", val)
		}
	}
	if count != 4 {
		t.Fatalf("expected initFunc to be called 4 times, but it was called %d times", count)
	}
}

// Test CacheMap error handling
func TestCacheMap_InitError(t *testing.T) {
	cacheMap := NewMap(
		func(key string) (int, error) {
			return 0, errors.New("init failed")
		},
		func(key string) string { return key },
		nil,
	)

	val, err := cacheMap.Get("error")
	if err == nil {
		t.Fatalf("expected error, got none")
	}
	if val != 0 {
		t.Fatalf("expected zero value, got %d", val)
	}
}

// Helper function that simulates a side effect in the init function
func sideEffectInit(counter *int) func() (int, error) {
	return func() (int, error) {
		*counter++
		time.Sleep(50 * time.Millisecond)
		return 42, nil
	}
}

// Test that concurrent initialization does not cause multiple initializations
func TestCache_ConcurrentInitialization(t *testing.T) {
	counter := 0
	cache := New(sideEffectInit(&counter), nil)

	var wg sync.WaitGroup
	wg.Add(3)

	for i := 0; i < 3; i++ {
		go func() {
			defer wg.Done()
			_, _ = cache.Get()
		}()
	}

	wg.Wait()
	if counter != 1 {
		t.Fatalf("expected initFunc to be called once, but it was called %d times", counter)
	}
}

// Test CacheMap for race conditions when keys are added concurrently
func TestCacheMap_ConcurrentKeyAccess(t *testing.T) {
	cacheMap := NewMap(
		func(key string) (int, error) {
			time.Sleep(50 * time.Millisecond)
			return len(key), nil
		},
		func(key string) string { return key },
		nil,
	)

	keys := []string{"key1", "key2", "key3"}
	var wg sync.WaitGroup
	wg.Add(len(keys) * 2)

	for _, key := range keys {
		go func(k string) {
			defer wg.Done()
			_, _ = cacheMap.Get(k)
		}(key)
		go func(k string) {
			defer wg.Done()
			_, _ = cacheMap.Get(k)
		}(key)
	}

	wg.Wait()
}

// Test that bypass function correctly forces reinitialization after cache has been initialized
func TestCache_BypassAfterInitialization(t *testing.T) {
	counter := 0
	cache := New(sideEffectInit(&counter), func() bool { return false })

	// First access initializes the cache
	val, err := cache.Get()
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if val != 42 {
		t.Fatalf("expected value 42, got %d", val)
	}
	if counter != 1 {
		t.Fatalf("expected initFunc to be called once, but it was called %d times", counter)
	}

	// Set bypass function to true after initialization
	cache.bypassFunc = func() bool { return true }

	// Access should reinitialize the value due to bypass
	val, err = cache.Get()
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if val != 42 {
		t.Fatalf("expected value 42, got %d", val)
	}
	if counter != 2 {
		t.Fatalf("expected initFunc to be called twice, but it was called %d times", counter)
	}
}

// Test that CacheMap correctly forces reinitialization after cache has been initialized when bypass is enabled
func TestCacheMap_BypassAfterInitialization(t *testing.T) {
	counter := 0
	cacheMap := NewMap(
		func(key string) (int, error) {
			counter++
			return len(key), nil
		},
		func(key string) string { return key },
		func(key string) bool { return false },
	)

	// First access initializes the cache
	val, err := cacheMap.Get("key")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if val != 3 {
		t.Fatalf("expected value 3, got %d", val)
	}
	if counter != 1 {
		t.Fatalf("expected initFunc to be called once, but it was called %d times", counter)
	}

	// Set bypass function to true after initialization
	cacheMap.mapBypassFunc = func(key string) bool { return true }

	// Access should reinitialize the value due to bypass
	val, err = cacheMap.Get("key")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if val != 3 {
		t.Fatalf("expected value 3, got %d", val)
	}
	if counter != 2 {
		t.Fatalf("expected initFunc to be called twice, but it was called %d times", counter)
	}
}

// Test Cache with different generic types (int, string)
func TestCache_GenericTypes(t *testing.T) {
	cacheInt := New(func() (int, error) { return 42, nil }, nil)
	cacheString := New(func() (string, error) { return "hello", nil }, nil)

	valInt, err := cacheInt.Get()
	if err != nil || valInt != 42 {
		t.Fatalf("expected 42, got %v (err: %v)", valInt, err)
	}

	valString, err := cacheString.Get()
	if err != nil || valString != "hello" {
		t.Fatalf("expected 'hello', got %v (err: %v)", valString, err)
	}
}

// Test CacheMap with different key types (string, int) and derived key functions
func TestCacheMap_GenericTypes(t *testing.T) {
	cacheMap := NewMap(
		func(key int) (string, error) {
			return strconv.Itoa(key * 2), nil
		},
		func(key int) int {
			return key
		},
		nil,
	)

	val, err := cacheMap.Get(21)
	if err != nil || val != "42" {
		t.Fatalf("expected '42', got %v (err: %v)", val, err)
	}
}

// Test CacheMap with complex derived key function
func TestCacheMap_ComplexDerivedKey(t *testing.T) {
	cacheMap := NewMap(
		func(key string) (string, error) {
			return key + "_value", nil
		},
		func(key string) string {
			return key + "_key"
		},
		nil,
	)

	val, err := cacheMap.Get("test")
	if err != nil || val != "test_value" {
		t.Fatalf("expected 'test_value', got %v (err: %v)", val, err)
	}

	// Check that the cache is reused with the same derived key
	val, err = cacheMap.Get("test")
	if err != nil || val != "test_value" {
		t.Fatalf("expected 'test_value', got %v (err: %v)", val, err)
	}
}

// Test CacheMap with bypass after initialization for generic types
func TestCacheMap_BypassAfterInitialization_Generic(t *testing.T) {
	counter := 0
	cacheMap := NewMap(
		func(key string) (int, error) {
			counter++
			return len(key), nil
		},
		func(key string) string { return key },
		func(key string) bool { return false },
	)

	val, err := cacheMap.Get("key")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if val != 3 {
		t.Fatalf("expected value 3, got %d", val)
	}
	if counter != 1 {
		t.Fatalf("expected initFunc to be called once, but it was called %d times", counter)
	}

	// Set bypass function to true after initialization
	cacheMap.mapBypassFunc = func(key string) bool { return true }

	val, err = cacheMap.Get("key")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if val != 3 {
		t.Fatalf("expected value 3, got %d", val)
	}
	if counter != 2 {
		t.Fatalf("expected initFunc to be called twice, but it was called %d times", counter)
	}
}

// Test CacheMap to ensure thread safety with complex derived key functions
func TestCacheMap_ComplexDerivedKey_Concurrency(t *testing.T) {
	cacheMap := NewMap(
		func(key string) (string, error) {
			return key + "_value", nil
		},
		func(key string) string {
			return key + "_key"
		},
		nil,
	)

	keys := []string{"test1", "test2", "test3"}
	var wg sync.WaitGroup
	wg.Add(len(keys) * 2)

	for _, key := range keys {
		go func(k string) {
			defer wg.Done()
			_, _ = cacheMap.Get(k)
		}(key)
		go func(k string) {
			defer wg.Done()
			_, _ = cacheMap.Get(k)
		}(key)
	}

	wg.Wait()
}

// Test that New panics when a nil initFunc is passed
func TestCache_NilInitFunc(t *testing.T) {
	defer func() {
		if r := recover(); r == nil {
			t.Fatalf("expected panic when passing nil initFunc to New, but got none")
		}
	}()

	// Attempt to create a Cache with a nil initFunc
	_ = New[int](nil, nil)
}

// Test that NewMap panics when a nil initFunc is passed
func TestCacheMap_NilInitFunc(t *testing.T) {
	defer func() {
		if r := recover(); r == nil {
			t.Fatalf("expected panic when passing nil initFunc to NewMap, but got none")
		}
	}()

	// Attempt to create a CacheMap with a nil initFunc
	_ = NewMap[string, string, int](nil, func(key string) string { return key }, nil)
}

// Test that NewMap panics when a nil mapToKeyFunc is passed
func TestCacheMap_NilMapToKeyFunc(t *testing.T) {
	defer func() {
		if r := recover(); r == nil {
			t.Fatalf("expected panic when passing nil mapToKeyFunc to NewMap, but got none")
		}
	}()

	// Attempt to create a CacheMap with a nil mapToKeyFunc
	_ = NewMap[string, string](func(key string) (int, error) { return 42, nil }, nil, nil)
}

// Test that New and NewMap handle nil bypassFunc correctly (should default to not bypassing)
func TestCache_NilBypassFunc(t *testing.T) {
	count := 0
	cache := New(func() (int, error) {
		count++
		return 42, nil
	}, nil)

	val, err := cache.Get()
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if val != 42 {
		t.Fatalf("expected value 42, got %d", val)
	}
	if count != 1 {
		t.Fatalf("expected initFunc to be called once, but it was called %d times", count)
	}

	// Ensure subsequent calls use the cached value
	val, err = cache.Get()
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if val != 42 {
		t.Fatalf("expected value 42, got %d", val)
	}
	if count != 1 {
		t.Fatalf("expected initFunc to be called once, but it was called %d times", count)
	}
}

func TestCacheMap_NilBypassFunc(t *testing.T) {
	count := 0
	cacheMap := NewMap(
		func(key string) (int, error) {
			count++
			return len(key), nil
		},
		func(key string) string { return key },
		nil, // nil bypassFunc should be handled gracefully
	)

	val, err := cacheMap.Get("test")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if val != 4 {
		t.Fatalf("expected value 4, got %d", val)
	}
	if count != 1 {
		t.Fatalf("expected initFunc to be called once, but it was called %d times", count)
	}

	// Ensure subsequent calls use the cached value
	val, err = cacheMap.Get("test")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if val != 4 {
		t.Fatalf("expected value 4, got %d", val)
	}
	if count != 1 {
		t.Fatalf("expected initFunc to be called once, but it was called %d times", count)
	}
}
