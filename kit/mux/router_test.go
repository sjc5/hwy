package mux

// import (
// 	"fmt"
// 	"net/http"
// 	"net/http/httptest"
// 	"testing"
// )

// func TestRouterBasics(t *testing.T) {
// 	t.Run("NewRouter", func(t *testing.T) {
// 		r := NewRouter(nil)
// 		if r.methodToMatcherMap == nil {
// 			t.Error("methodToMatcherMap should be initialized")
// 		}
// 		if r.matcherOptions == nil {
// 			t.Error("matcherOptions should be initialized")
// 		}
// 	})

// 	t.Run("RouterOptions", func(t *testing.T) {
// 		opts := &Options{DynamicParamPrefixRune: '@', SplatSegmentRune: '*'}
// 		r := NewRouter(opts)
// 		if r.matcherOptions.DynamicParamPrefixRune != '@' {
// 			t.Error("DynamicParamPrefixRune not set correctly")
// 		}
// 		if r.matcherOptions.SplatSegmentRune != '*' {
// 			t.Error("SplatSegmentRune not set correctly")
// 		}
// 	})
// }

// func TestHTTPMethods(t *testing.T) {
// 	methods := []string{
// 		http.MethodGet,
// 		http.MethodHead,
// 		http.MethodPost,
// 		http.MethodPut,
// 		http.MethodPatch,
// 		http.MethodDelete,
// 		http.MethodConnect,
// 		http.MethodOptions,
// 		http.MethodTrace,
// 	}

// 	r := NewRouter(nil)

// 	for _, method := range methods {
// 		t.Run(fmt.Sprintf("Method_%s", method), func(t *testing.T) {
// 			// Test matcher creation
// 			matcher, ok := r.getMatcher(method)
// 			if !ok {
// 				t.Errorf("getMatcher failed for valid method %s", method)
// 			}
// 			if matcher == nil {
// 				t.Errorf("nil matcher returned for valid method %s", method)
// 			}

// 			// Test handler registration
// 			called := false
// 			r.MethodFunc(method, "/test", func(w http.ResponseWriter, r *http.Request) {
// 				called = true
// 			})

// 			req := httptest.NewRequest(method, "/test", nil)
// 			w := httptest.NewRecorder()
// 			r.ServeHTTP(w, req)

// 			if !called {
// 				t.Errorf("Handler not called for method %s", method)
// 			}
// 		})
// 	}

// 	t.Run("Invalid_Method", func(t *testing.T) {
// 		_, ok := r.getMatcher("INVALID")
// 		if ok {
// 			t.Error("getMatcher should return false for invalid method")
// 		}

// 		req := httptest.NewRequest("INVALID", "/test", nil)
// 		w := httptest.NewRecorder()
// 		r.ServeHTTP(w, req)

// 		if w.Code != http.StatusMethodNotAllowed {
// 			t.Errorf("Expected status %d for invalid method, got %d", http.StatusMethodNotAllowed, w.Code)
// 		}
// 	})
// }

// func TestMiddleware(t *testing.T) {
// 	t.Run("Middleware_Order", func(t *testing.T) {
// 		r := NewRouter(nil)
// 		var order []string

// 		// Add middlewares at different levels
// 		r.AddGlobalMiddleware(func(next ClassicHandler) ClassicHandler {
// 			return ClassicHandlerFunc(func(w http.ResponseWriter, req *http.Request) {
// 				order = append(order, "global1")
// 				next.ServeHTTP(w, req)
// 			})
// 		})

// 		r.AddMiddlewareToMethod("GET", func(next ClassicHandler) ClassicHandler {
// 			return ClassicHandlerFunc(func(w http.ResponseWriter, req *http.Request) {
// 				order = append(order, "method1")
// 				next.ServeHTTP(w, req)
// 			})
// 		})

// 		pattern := r.MethodFunc("GET", "/test", func(w http.ResponseWriter, req *http.Request) {
// 			order = append(order, "handler")
// 		})

// 		pattern.AddMiddleware(func(next ClassicHandler) ClassicHandler {
// 			return ClassicHandlerFunc(func(w http.ResponseWriter, req *http.Request) {
// 				order = append(order, "pattern1")
// 				next.ServeHTTP(w, req)
// 			})
// 		})

// 		req := httptest.NewRequest("GET", "/test", nil)
// 		w := httptest.NewRecorder()
// 		r.ServeHTTP(w, req)

// 		expected := []string{"global1", "method1", "pattern1", "handler"}
// 		if !sliceEqual(order, expected) {
// 			t.Errorf("Wrong middleware execution order. Expected %v, got %v", expected, order)
// 		}
// 	})

// 	t.Run("Middleware_ShortCircuit", func(t *testing.T) {
// 		r := NewRouter(nil)
// 		var executed []string

// 		r.AddGlobalMiddleware(func(next ClassicHandler) ClassicHandler {
// 			return ClassicHandlerFunc(func(w http.ResponseWriter, req *http.Request) {
// 				executed = append(executed, "global1")
// 				http.Error(w, "stopped", http.StatusUnauthorized)
// 				// Don't call next.ServeHTTP()
// 			})
// 		})

// 		r.AddGlobalMiddleware(func(next ClassicHandler) ClassicHandler {
// 			return ClassicHandlerFunc(func(w http.ResponseWriter, req *http.Request) {
// 				executed = append(executed, "global2")
// 				next.ServeHTTP(w, req)
// 			})
// 		})

// 		r.MethodFunc("GET", "/test", func(w http.ResponseWriter, req *http.Request) {
// 			executed = append(executed, "handler")
// 		})

// 		req := httptest.NewRequest("GET", "/test", nil)
// 		w := httptest.NewRecorder()
// 		r.ServeHTTP(w, req)

// 		if w.Code != http.StatusUnauthorized {
// 			t.Errorf("Expected status %d, got %d", http.StatusUnauthorized, w.Code)
// 		}

// 		if len(executed) != 1 || executed[0] != "global1" {
// 			t.Errorf("Expected only first middleware to execute, got %v", executed)
// 		}
// 	})
// }

// func TestNotFound(t *testing.T) {
// 	t.Run("Default_NotFound", func(t *testing.T) {
// 		r := NewRouter(nil)
// 		r.MethodFunc("GET", "/test", func(w http.ResponseWriter, req *http.Request) {})

// 		req := httptest.NewRequest("GET", "/nonexistent", nil)
// 		w := httptest.NewRecorder()
// 		r.ServeHTTP(w, req)

// 		if w.Code != http.StatusNotFound {
// 			t.Errorf("Expected status %d, got %d", http.StatusNotFound, w.Code)
// 		}
// 	})

// 	t.Run("Custom_NotFound", func(t *testing.T) {
// 		r := NewRouter(nil)
// 		r.SetNotFoundHandler(ClassicHandlerFunc(func(w http.ResponseWriter, req *http.Request) {
// 			http.Error(w, "custom not found", http.StatusNotFound)
// 		}))

// 		req := httptest.NewRequest("GET", "/nonexistent", nil)
// 		w := httptest.NewRecorder()
// 		r.ServeHTTP(w, req)

// 		if w.Code != http.StatusNotFound {
// 			t.Errorf("Expected status %d, got %d", http.StatusNotFound, w.Code)
// 		}
// 		if body := w.Body.String(); !contains(body, "custom not found") {
// 			t.Errorf("Expected body to contain custom message, got %q", body)
// 		}
// 	})
// }

// func TestPatternRegistration(t *testing.T) {
// 	t.Run("Simple_Patterns", func(t *testing.T) {
// 		patterns := []struct {
// 			pattern string
// 			path    string
// 			match   bool
// 		}{
// 			{"/test", "/test", true},
// 			{"/test", "/test2", false},
// 			{"/users/:id", "/users/123", true},
// 			{"/users/:id", "/users/abc", true},
// 			{"/users/:id", "/users/", false},
// 			{"/api/*", "/api/anything/here", true},
// 			{"/api/*", "/other", false},
// 		}

// 		for _, tt := range patterns {
// 			t.Run(fmt.Sprintf("Pattern_%s", tt.pattern), func(t *testing.T) {
// 				r := NewRouter(nil)

// 				matched := false
// 				r.MethodFunc("GET", tt.pattern, func(w http.ResponseWriter, req *http.Request) {
// 					matched = true
// 				})

// 				req := httptest.NewRequest("GET", tt.path, nil)
// 				w := httptest.NewRecorder()
// 				r.ServeHTTP(w, req)

// 				if matched != tt.match {
// 					t.Errorf("Pattern %q with path %q: expected match=%v, got %v",
// 						tt.pattern, tt.path, tt.match, matched)
// 				}
// 			})
// 		}
// 	})

// 	t.Run("Pattern_Middleware", func(t *testing.T) {
// 		r := NewRouter(nil)

// 		pattern := "/test/:param"
// 		r.MethodFunc("GET", pattern, func(w http.ResponseWriter, req *http.Request) {})

// 		var middlewareCalled bool
// 		r.AddMiddlewareToPattern("GET", pattern, func(next ClassicHandler) ClassicHandler {
// 			return ClassicHandlerFunc(func(w http.ResponseWriter, req *http.Request) {
// 				middlewareCalled = true
// 				next.ServeHTTP(w, req)
// 			})
// 		})

// 		req := httptest.NewRequest("GET", "/test/value", nil)
// 		w := httptest.NewRecorder()
// 		r.ServeHTTP(w, req)

// 		if !middlewareCalled {
// 			t.Error("Pattern middleware was not called")
// 		}
// 	})
// }

// // Helper functions
// func sliceEqual(a, b []string) bool {
// 	if len(a) != len(b) {
// 		return false
// 	}
// 	for i := range a {
// 		if a[i] != b[i] {
// 			return false
// 		}
// 	}
// 	return true
// }

// func contains(s, substr string) bool {
// 	return s != "" && s != substr && len(s) >= len(substr) && s[0:len(substr)] == substr
// }

// // Helper to create a typical API router setup
// func setupAPIRouterForBenchmarks() *Router {
// 	r := NewRouter(nil)

// 	// Common middleware
// 	loggingMW := func(next ClassicHandler) ClassicHandler {
// 		return ClassicHandlerFunc(func(w http.ResponseWriter, r *http.Request) {
// 			// Simulate basic logging overhead
// 			_ = r.Method + " " + r.URL.Path
// 			next.ServeHTTP(w, r)
// 		})
// 	}

// 	authMW := func(next ClassicHandler) ClassicHandler {
// 		return ClassicHandlerFunc(func(w http.ResponseWriter, r *http.Request) {
// 			// Simulate auth check overhead
// 			if r.Header.Get("Authorization") == "" {
// 				next.ServeHTTP(w, r)
// 			}
// 			next.ServeHTTP(w, r)
// 		})
// 	}

// 	// Global middleware
// 	r.AddGlobalMiddleware(loggingMW)
// 	r.AddGlobalMiddleware(authMW)

// 	// REST-style routes
// 	r.MethodFunc("GET", "/api/users", func(w http.ResponseWriter, r *http.Request) {
// 		w.WriteHeader(http.StatusOK)
// 	})
// 	r.MethodFunc("GET", "/api/users/:id", func(w http.ResponseWriter, r *http.Request) {
// 		w.WriteHeader(http.StatusOK)
// 	})
// 	r.MethodFunc("POST", "/api/users", func(w http.ResponseWriter, r *http.Request) {
// 		w.WriteHeader(http.StatusCreated)
// 	})
// 	r.MethodFunc("PUT", "/api/users/:id", func(w http.ResponseWriter, r *http.Request) {
// 		w.WriteHeader(http.StatusOK)
// 	})
// 	r.MethodFunc("DELETE", "/api/users/:id", func(w http.ResponseWriter, r *http.Request) {
// 		w.WriteHeader(http.StatusNoContent)
// 	})

// 	// Nested resources
// 	r.MethodFunc("GET", "/api/users/:userId/posts", func(w http.ResponseWriter, r *http.Request) {
// 		w.WriteHeader(http.StatusOK)
// 	})
// 	r.MethodFunc("GET", "/api/users/:userId/posts/:postId", func(w http.ResponseWriter, r *http.Request) {
// 		w.WriteHeader(http.StatusOK)
// 	})

// 	return r
// }

// // Helper to create a router with many routes
// func setupLargeRouterForBenchmarks(numRoutes int) *Router {
// 	r := NewRouter(nil)

// 	// Add a mix of static and dynamic routes
// 	for i := 0; i < numRoutes; i++ {
// 		if i%2 == 0 {
// 			r.MethodFunc("GET", "/static/path/"+string(rune(i)), func(w http.ResponseWriter, r *http.Request) {
// 				w.WriteHeader(http.StatusOK)
// 			})
// 		} else {
// 			r.MethodFunc("GET", "/dynamic/:param/"+string(rune(i)), func(w http.ResponseWriter, r *http.Request) {
// 				w.WriteHeader(http.StatusOK)
// 			})
// 		}
// 	}

// 	return r
// }

// func BenchmarkRouter(b *testing.B) {
// 	b.Run("SimpleStaticRoute", func(b *testing.B) {
// 		r := NewRouter(nil)
// 		r.MethodFunc("GET", "/ping", func(w http.ResponseWriter, r *http.Request) {
// 			w.WriteHeader(http.StatusOK)
// 		})

// 		req := httptest.NewRequest("GET", "/ping", nil)
// 		w := httptest.NewRecorder()

// 		b.ResetTimer()
// 		b.ReportAllocs()
// 		for i := 0; i < b.N; i++ {
// 			r.ServeHTTP(w, req)
// 		}
// 	})

// 	b.Run("DynamicRoute", func(b *testing.B) {
// 		r := NewRouter(nil)
// 		r.MethodFunc("GET", "/users/:id", func(w http.ResponseWriter, r *http.Request) {
// 			w.WriteHeader(http.StatusOK)
// 		})

// 		req := httptest.NewRequest("GET", "/users/123", nil)
// 		w := httptest.NewRecorder()

// 		b.ResetTimer()
// 		b.ReportAllocs()
// 		for i := 0; i < b.N; i++ {
// 			r.ServeHTTP(w, req)
// 		}
// 	})

// 	b.Run("WithMiddleware", func(b *testing.B) {
// 		r := NewRouter(nil)
// 		r.AddGlobalMiddleware(func(next ClassicHandler) ClassicHandler {
// 			return ClassicHandlerFunc(func(w http.ResponseWriter, r *http.Request) {
// 				next.ServeHTTP(w, r)
// 			})
// 		})
// 		r.MethodFunc("GET", "/test", func(w http.ResponseWriter, r *http.Request) {
// 			w.WriteHeader(http.StatusOK)
// 		})

// 		req := httptest.NewRequest("GET", "/test", nil)
// 		w := httptest.NewRecorder()

// 		b.ResetTimer()
// 		b.ReportAllocs()
// 		for i := 0; i < b.N; i++ {
// 			r.ServeHTTP(w, req)
// 		}
// 	})

// 	b.Run("RESTfulAPI", func(b *testing.B) {
// 		r := setupAPIRouterForBenchmarks()
// 		paths := []string{
// 			"/api/users",
// 			"/api/users/123",
// 			"/api/users/456/posts",
// 			"/api/users/789/posts/999",
// 		}
// 		methods := []string{"GET", "POST", "PUT", "DELETE"}

// 		reqs := make([]*http.Request, 0, len(paths)*len(methods))
// 		for _, path := range paths {
// 			for _, method := range methods {
// 				reqs = append(reqs, httptest.NewRequest(method, path, nil))
// 			}
// 		}
// 		w := httptest.NewRecorder()

// 		b.ResetTimer()
// 		b.ReportAllocs()
// 		for i := 0; i < b.N; i++ {
// 			// Use modulo to cycle through requests
// 			r.ServeHTTP(w, reqs[i%len(reqs)])
// 		}
// 	})

// 	b.Run("LargeRouterMatch", func(b *testing.B) {
// 		r := setupLargeRouterForBenchmarks(100)                     // 100 routes
// 		req := httptest.NewRequest("GET", "/dynamic/param/99", nil) // Match last route
// 		w := httptest.NewRecorder()

// 		b.ResetTimer()
// 		b.ReportAllocs()
// 		for i := 0; i < b.N; i++ {
// 			r.ServeHTTP(w, req)
// 		}
// 	})

// 	b.Run("WorstCaseMatch", func(b *testing.B) {
// 		r := setupLargeRouterForBenchmarks(100)
// 		req := httptest.NewRequest("GET", "/nomatch", nil) // Force full traversal with no match
// 		w := httptest.NewRecorder()

// 		b.ResetTimer()
// 		b.ReportAllocs()
// 		for i := 0; i < b.N; i++ {
// 			r.ServeHTTP(w, req)
// 		}
// 	})

// 	b.Run("NestedDynamicRoute", func(b *testing.B) {
// 		r := NewRouter(nil)
// 		r.MethodFunc("GET", "/api/:version/users/:userId/posts/:postId/comments/:commentId",
// 			func(w http.ResponseWriter, r *http.Request) {
// 				w.WriteHeader(http.StatusOK)
// 			})

// 		req := httptest.NewRequest("GET", "/api/v1/users/123/posts/456/comments/789", nil)
// 		w := httptest.NewRecorder()

// 		b.ResetTimer()
// 		b.ReportAllocs()
// 		for i := 0; i < b.N; i++ {
// 			r.ServeHTTP(w, req)
// 		}
// 	})
// }
