package secureheaders

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestMiddleware_SetsSecurityHeaders(t *testing.T) {
	nextHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {})
	middleware := Middleware(nextHandler)

	// Create a new HTTP request to pass through the middleware
	req := httptest.NewRequest(http.MethodGet, "/", nil)

	// Create a response recorder to capture the response
	rr := httptest.NewRecorder()
	rr.Header().Set("X-Powered-By", "GoTestServer")

	// Serve the request through the middleware
	middleware.ServeHTTP(rr, req)

	// Check that all expected security headers are set
	for header, expectedValue := range securityHeadersMap {
		if value := rr.Header().Get(header); value != expectedValue {
			t.Errorf("expected header %s to be %s, but got %s", header, expectedValue, value)
		}
	}

	// Check that the X-Powered-By header is removed
	if value := rr.Header().Get("X-Powered-By"); value != "" {
		t.Errorf("expected header X-Powered-By to be removed, but got %s", value)
	}
}

func TestMiddleware_PassesToNextHandler(t *testing.T) {
	// Flag to ensure next handler was called
	nextHandlerCalled := false

	nextHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		nextHandlerCalled = true
	})

	middleware := Middleware(nextHandler)

	// Create a new HTTP request to pass through the middleware
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	// Create a response recorder to capture the response
	rr := httptest.NewRecorder()

	// Serve the request through the middleware
	middleware.ServeHTTP(rr, req)

	// Check that the next handler was called
	if !nextHandlerCalled {
		t.Error("expected next handler to be called, but it was not")
	}
}

func TestMiddleware_DoesNotOverrideExistingHeaders(t *testing.T) {
	nextHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Set a custom header that should not be overridden
		w.Header().Set("X-Custom-Header", "custom-value")
	})

	middleware := Middleware(nextHandler)

	// Create a new HTTP request to pass through the middleware
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	// Create a response recorder to capture the response
	rr := httptest.NewRecorder()

	// Serve the request through the middleware
	middleware.ServeHTTP(rr, req)

	// Check that the custom header is still present
	if value := rr.Header().Get("X-Custom-Header"); value != "custom-value" {
		t.Errorf("expected header X-Custom-Header to be custom-value, but got %s", value)
	}

	// Ensure that the security headers are still set correctly
	for header, expectedValue := range securityHeadersMap {
		if value := rr.Header().Get(header); value != expectedValue {
			t.Errorf("expected header %s to be %s, but got %s", header, expectedValue, value)
		}
	}
}
