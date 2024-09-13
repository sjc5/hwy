package router

import (
	"fmt"
	"reflect"
	"strings"
	"testing"
)

func TestGetHeadElements(t *testing.T) {
	routeData := &GetRouteDataOutput{
		Title: "Test Title",
		MetaHeadBlocks: []*HeadBlock{
			{Tag: "meta", Attributes: map[string]string{"name": "description", "content": "Test Description"}},
		},
		RestHeadBlocks: []*HeadBlock{
			{Tag: "link", Attributes: map[string]string{"rel": "stylesheet", "href": "/style.css"}},
		},
	}

	headElements, err := GetHeadElements(routeData)
	if err != nil {
		t.Errorf("Expected no error, but got %v", err)
	}
	if !strings.Contains(string(*headElements), "<title>Test Title</title>") {
		t.Errorf("Expected title tag, but it's missing")
	}
	if !strings.Contains(string(*headElements), `name="description"`) || !strings.Contains(string(*headElements), `content="Test Description"`) {
		t.Errorf("Expected meta description tag, but it's missing")
	}
	if !strings.Contains(string(*headElements), `rel="stylesheet"`) || !strings.Contains(string(*headElements), `href="/style.css"`) {
		t.Errorf("Expected link tag, but it's missing")
	}
}

// Test cases for dedupeHeadBlocks
func TestDedupeHeadBlocks(t *testing.T) {
	tests := []struct {
		name     string
		input    []HeadBlock
		expected []*HeadBlock
	}{
		{
			name: "No duplicates, with title and description",
			input: []HeadBlock{
				{Tag: "title", InnerHTML: "Hwy", Attributes: nil},
				{Tag: "meta", Attributes: map[string]string{"name": "description", "content": "Hwy is a simple, lightweight, and flexible web framework."}},
				{Tag: "meta", Attributes: map[string]string{"name": "og:image", "content": "create-hwy-snippet.webp"}},
			},
			expected: []*HeadBlock{
				{Tag: "title", InnerHTML: "Hwy", Attributes: nil},
				{Tag: "meta", Attributes: map[string]string{"name": "description", "content": "Hwy is a simple, lightweight, and flexible web framework."}},
				{Tag: "meta", Attributes: map[string]string{"name": "og:image", "content": "create-hwy-snippet.webp"}},
			},
		},
		{
			name: "With duplicates",
			input: []HeadBlock{
				{Tag: "title", InnerHTML: "Hwy", Attributes: nil},
				{Tag: "meta", Attributes: map[string]string{"name": "description", "content": "Hwy is a simple, lightweight, and flexible web framework."}},
				{Tag: "meta", Attributes: map[string]string{"name": "description", "content": "Hwy is a simple, lightweight, and flexible web framework."}},
			},
			expected: []*HeadBlock{
				{Tag: "title", InnerHTML: "Hwy", Attributes: nil},
				{Tag: "meta", Attributes: map[string]string{"name": "description", "content": "Hwy is a simple, lightweight, and flexible web framework."}},
			},
		},
		{
			name: "No title or description",
			input: []HeadBlock{
				{Tag: "meta", Attributes: map[string]string{"name": "keywords", "content": "go, test"}},
				{Tag: "link", Attributes: map[string]string{"rel": "stylesheet", "href": "/style.css"}},
			},
			expected: []*HeadBlock{
				{Tag: "meta", Attributes: map[string]string{"name": "keywords", "content": "go, test"}},
				{Tag: "link", Attributes: map[string]string{"rel": "stylesheet", "href": "/style.css"}},
			},
		},
		{
			name: "Multiple titles and descriptions",
			input: []HeadBlock{
				{Tag: "title", InnerHTML: "Hwy 1", Attributes: nil},
				{Tag: "title", InnerHTML: "Hwy 2", Attributes: nil},
				{Tag: "meta", Attributes: map[string]string{"name": "description", "content": "Description 1"}},
				{Tag: "meta", Attributes: map[string]string{"name": "description", "content": "Description 2"}},
			},
			expected: []*HeadBlock{
				{Tag: "title", InnerHTML: "Hwy 2", Attributes: nil},
				{Tag: "meta", Attributes: map[string]string{"name": "description", "content": "Description 2"}},
			},
		},
		{
			name: "Different tags with same attributes",
			input: []HeadBlock{
				{Tag: "meta", Attributes: map[string]string{"name": "viewport", "content": "width=device-width, initial-scale=1"}},
				{Tag: "link", Attributes: map[string]string{"rel": "stylesheet", "href": "/style.css"}},
				{Tag: "meta", Attributes: map[string]string{"name": "viewport", "content": "width=device-width, initial-scale=1"}},
			},
			expected: []*HeadBlock{
				{Tag: "meta", Attributes: map[string]string{"name": "viewport", "content": "width=device-width, initial-scale=1"}},
				{Tag: "link", Attributes: map[string]string{"rel": "stylesheet", "href": "/style.css"}},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := dedupeHeadBlocks(tt.input)
			if !reflect.DeepEqual(result, tt.expected) {
				fmt.Println("Result:")
				for _, block := range result {
					t.Logf("%+v", block)
				}

				fmt.Println("Expected:")
				for _, block := range tt.expected {
					t.Logf("%+v", block)
				}

				t.Errorf("dedupeHeadBlocks() = %v, expected %v", result, tt.expected)
			}
		})
	}
}

// Ensure stableHash function produces consistent hashes
func TestStableHash(t *testing.T) {
	tests := []struct {
		name     string
		input    HeadBlock
		expected string
	}{
		{
			name:     "Simple meta tag",
			input:    HeadBlock{Tag: "meta", Attributes: map[string]string{"name": "viewport", "content": "width=device-width, initial-scale=1"}},
			expected: "meta|content=width=device-width, initial-scale=1&name=viewport",
		},
		{
			name:     "Title tag",
			input:    HeadBlock{Tag: "title", InnerHTML: "Test Title", Attributes: nil},
			expected: "title|",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := headBlockStableHash(&tt.input)
			if result != tt.expected {
				t.Errorf("stableHash() = %v, expected %v", result, tt.expected)
			}
		})
	}
}

func TestDedupeHeadBlocksEdgeCases(t *testing.T) {
	tests := []struct {
		name     string
		input    []HeadBlock
		expected []*HeadBlock
	}{
		{
			name: "Same tag different attributes",
			input: []HeadBlock{
				{Tag: "meta", Attributes: map[string]string{"name": "viewport", "content": "width=device-width, initial-scale=1"}},
				{Tag: "meta", Attributes: map[string]string{"name": "charset", "content": "UTF-8"}},
			},
			expected: []*HeadBlock{
				{Tag: "meta", Attributes: map[string]string{"name": "viewport", "content": "width=device-width, initial-scale=1"}},
				{Tag: "meta", Attributes: map[string]string{"name": "charset", "content": "UTF-8"}},
			},
		},
		{
			name: "Script and link tags",
			input: []HeadBlock{
				{Tag: "script", Attributes: map[string]string{"src": "/script.js"}},
				{Tag: "link", Attributes: map[string]string{"rel": "stylesheet", "href": "/style.css"}},
			},
			expected: []*HeadBlock{
				{Tag: "script", Attributes: map[string]string{"src": "/script.js"}},
				{Tag: "link", Attributes: map[string]string{"rel": "stylesheet", "href": "/style.css"}},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := dedupeHeadBlocks(tt.input)
			if !reflect.DeepEqual(result, tt.expected) {
				fmt.Println("Result:")
				for _, block := range result {
					t.Logf("%+v", block)
				}

				fmt.Println("Expected:")
				for _, block := range tt.expected {
					t.Logf("%+v", block)
				}

				t.Errorf("dedupeHeadBlocks() = %v, expected %v", result, tt.expected)
			}
		})
	}
}
