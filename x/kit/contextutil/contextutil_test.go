package contextutil

import (
	"context"
	"net/http"
	"testing"
)

func genericTest[T comparable](t *testing.T, val T) {
	store := NewStore[T]("key")

	ctx := store.GetContextWithValue(context.Background(), val)

	if store.GetValueFromContext(ctx) != val {
		t.Error("expected 'hello', got", store.GetValueFromContext(ctx))
	}

	r := store.GetRequestWithContext(&http.Request{}, val)

	if store.GetValueFromContext(r.Context()) != val {
		t.Error("expected 'world', got", store.GetValueFromContext(r.Context()))
	}
}

func Test(t *testing.T) {
	genericTest(t, "hello")
	genericTest(t, "world")
	genericTest(t, 42)
	genericTest(t, 3.14)
	genericTest(t, true)
	genericTest(t, false)
	genericTest(t, struct{}{})
	genericTest(t, struct{ Name string }{Name: "Bob"})
}
