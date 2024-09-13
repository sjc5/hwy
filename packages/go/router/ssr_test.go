package router

import (
	"strings"
	"testing"
)

func TestGetSSRInnerHTML(t *testing.T) {
	routeData := &GetRouteDataOutput{
		BuildID: "test-build-id",
	}

	ssrInnerHTML, err := GetSSRInnerHTML(routeData, true)
	if err != nil {
		t.Errorf("Expected no error, but got %v", err)
	}
	if !strings.Contains(string(*ssrInnerHTML.Script), "test-build-id") {
		t.Errorf("Expected build ID in SSR inner HTML, but it's missing")
	}
}
