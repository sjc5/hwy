package router

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"sync"
	"testing"
	"time"
)

type expectedOutput struct {
	MatchingPaths []string
	Params        map[string]string
	SplatSegments []string
}

type testPath struct {
	Path           string
	ExpectedOutput struct {
		MatchingPaths []string
		Params        map[string]string
		SplatSegments []string
	}
}

var testHwyInstance Hwy

func init() {
	setup()
}

func TestRouter(t *testing.T) {
	// TEST "getMatchingPathData"
	for _, path := range testPaths {
		matchingPathData := testGetMatchingPathData(path.Path)

		// Has expected number of matching paths
		if len(*matchingPathData.MatchingPaths) != len(path.ExpectedOutput.MatchingPaths) {
			Log.Errorf("Path: %s", path.Path)
			t.Errorf("Expected %d matching paths, but got %d", len(path.ExpectedOutput.MatchingPaths), len(*matchingPathData.MatchingPaths))
		}

		for i, matchingPath := range *matchingPathData.MatchingPaths {
			// Each matching path is of the expected type
			if matchingPath.PathType != path.ExpectedOutput.MatchingPaths[i] {
				Log.Errorf("Path: %s", path.Path)
				t.Errorf("Expected matching path %d to be of type %s, but got %s", i, path.ExpectedOutput.MatchingPaths[i], matchingPath.PathType)
			}
		}

		// Has expected number of params
		if len(*matchingPathData.Params) != len(path.ExpectedOutput.Params) {
			Log.Errorf("Path: %s", path.Path)
			t.Errorf("Expected %d params, but got %d", len(path.ExpectedOutput.Params), len(*matchingPathData.Params))
		}

		for key, expectedParam := range path.ExpectedOutput.Params {
			// Each param has the expected value
			if (*matchingPathData.Params)[key] != expectedParam {
				Log.Errorf("Path: %s", path.Path)
				t.Errorf("Expected param %s to be %s, but got %s", key, expectedParam, (*matchingPathData.Params)[key])
			}
		}

		// Has expected number of splat segments
		if matchingPathData.SplatSegments != nil && len(*matchingPathData.SplatSegments) != len(path.ExpectedOutput.SplatSegments) {
			Log.Errorf("Path: %s", path.Path)
			t.Errorf("Expected %d splat segments, but got %d", len(path.ExpectedOutput.SplatSegments), len(*matchingPathData.SplatSegments))
		}

		for i, expectedSplatSegment := range path.ExpectedOutput.SplatSegments {
			// Each splat segment has the expected value
			if (*matchingPathData.SplatSegments)[i] != expectedSplatSegment {
				Log.Errorf("Path: %s", path.Path)
				t.Errorf("Expected splat segment %d to be %s, but got %s", i, expectedSplatSegment, (*matchingPathData.SplatSegments)[i])
			}
		}
	}
}

var testPaths = []testPath{
	{
		Path: "/does-not-exist",
		ExpectedOutput: expectedOutput{
			MatchingPaths: []string{PathTypeUltimateCatch},
			SplatSegments: []string{"does-not-exist"},
		},
	},
	{
		Path: "/this-should-be-ignored",
		ExpectedOutput: expectedOutput{
			MatchingPaths: []string{PathTypeUltimateCatch},
			SplatSegments: []string{"this-should-be-ignored"},
		},
	},
	{
		Path: "/",
		ExpectedOutput: expectedOutput{
			MatchingPaths: []string{PathTypeIndex},
		},
	},
	{
		Path: "/lion",
		ExpectedOutput: expectedOutput{
			MatchingPaths: []string{PathTypeStaticLayout, PathTypeIndex},
		},
	},
	{
		Path: "/lion/123",
		ExpectedOutput: expectedOutput{
			MatchingPaths: []string{PathTypeStaticLayout, PathTypeNonUltimateSplat},
			SplatSegments: []string{"123"},
		},
	},
	{
		Path: "/lion/123/456",
		ExpectedOutput: expectedOutput{
			MatchingPaths: []string{PathTypeStaticLayout, PathTypeNonUltimateSplat},
			SplatSegments: []string{"123", "456"},
		},
	},
	{
		Path: "/lion/123/456/789",
		ExpectedOutput: expectedOutput{
			MatchingPaths: []string{PathTypeStaticLayout, PathTypeNonUltimateSplat},
			SplatSegments: []string{"123", "456", "789"},
		},
	},
	{
		Path: "/tiger",
		ExpectedOutput: expectedOutput{
			MatchingPaths: []string{PathTypeStaticLayout, PathTypeIndex},
		},
	},
	{
		Path: "/tiger/123",
		ExpectedOutput: expectedOutput{
			MatchingPaths: []string{PathTypeStaticLayout, PathTypeDynamicLayout, PathTypeIndex},
			Params:        map[string]string{"tiger_id": "123"},
		},
	},
	{
		Path: "/tiger/123/456",
		ExpectedOutput: expectedOutput{
			MatchingPaths: []string{PathTypeStaticLayout, PathTypeDynamicLayout, PathTypeDynamicLayout},
			Params:        map[string]string{"tiger_id": "123", "tiger_cub_id": "456"},
		},
	},
	{
		Path: "/tiger/123/456/789",
		ExpectedOutput: expectedOutput{
			MatchingPaths: []string{PathTypeStaticLayout, PathTypeDynamicLayout, PathTypeNonUltimateSplat},
			Params:        map[string]string{"tiger_id": "123"},
			SplatSegments: []string{"456", "789"},
		},
	},
	{
		Path: "/bear",
		ExpectedOutput: expectedOutput{
			MatchingPaths: []string{PathTypeStaticLayout, PathTypeIndex},
		},
	},
	{
		Path: "/bear/123",
		ExpectedOutput: expectedOutput{
			MatchingPaths: []string{PathTypeStaticLayout, PathTypeDynamicLayout},
			Params:        map[string]string{"bear_id": "123"},
		},
	},
	{
		Path: "/bear/123/456",
		ExpectedOutput: expectedOutput{
			MatchingPaths: []string{PathTypeStaticLayout, PathTypeDynamicLayout, PathTypeNonUltimateSplat},
			Params:        map[string]string{"bear_id": "123"},
			SplatSegments: []string{"456"},
		},
	},
	{
		Path: "/bear/123/456/789",
		ExpectedOutput: expectedOutput{
			MatchingPaths: []string{PathTypeStaticLayout, PathTypeDynamicLayout, PathTypeNonUltimateSplat},
			Params:        map[string]string{"bear_id": "123"},
			SplatSegments: []string{"456", "789"},
		},
	},
	{
		Path: "/dashboard",
		ExpectedOutput: expectedOutput{
			MatchingPaths: []string{PathTypeStaticLayout, PathTypeIndex},
		},
	},
	{
		Path: "/dashboard/asdf",
		ExpectedOutput: expectedOutput{
			MatchingPaths: []string{PathTypeStaticLayout, PathTypeNonUltimateSplat},
			SplatSegments: []string{"asdf"},
		},
	},
	{
		Path: "/dashboard/customers",
		ExpectedOutput: expectedOutput{
			MatchingPaths: []string{PathTypeStaticLayout, PathTypeStaticLayout, PathTypeIndex},
		},
	},
	{
		Path: "/dashboard/customers/123",
		ExpectedOutput: expectedOutput{
			MatchingPaths: []string{PathTypeStaticLayout, PathTypeStaticLayout, PathTypeDynamicLayout, PathTypeIndex},
			Params:        map[string]string{"customer_id": "123"},
		},
	},
	{
		Path: "/dashboard/customers/123/orders",
		ExpectedOutput: expectedOutput{
			MatchingPaths: []string{PathTypeStaticLayout, PathTypeStaticLayout, PathTypeDynamicLayout, PathTypeStaticLayout, PathTypeIndex},
			Params:        map[string]string{"customer_id": "123"},
		},
	},
	{
		Path: "/dashboard/customers/123/orders/456",
		ExpectedOutput: expectedOutput{
			MatchingPaths: []string{PathTypeStaticLayout, PathTypeStaticLayout, PathTypeDynamicLayout, PathTypeStaticLayout, PathTypeDynamicLayout},
			Params:        map[string]string{"customer_id": "123", "order_id": "456"},
		},
	},
	{
		Path: "/articles",
		ExpectedOutput: expectedOutput{
			MatchingPaths: []string{PathTypeIndex},
		},
	},
	{
		Path: "/articles/bob",
		ExpectedOutput: expectedOutput{
			MatchingPaths: []string{PathTypeUltimateCatch},
			SplatSegments: []string{"articles", "bob"},
		},
	},
	{
		Path: "/articles/test",
		ExpectedOutput: expectedOutput{
			MatchingPaths: []string{PathTypeUltimateCatch},
			SplatSegments: []string{"articles", "test"},
		},
	},
	{
		Path: "/articles/test/articles",
		ExpectedOutput: expectedOutput{
			MatchingPaths: []string{PathTypeIndex},
		},
	},
	{
		Path: "/dynamic-index/index",
		ExpectedOutput: expectedOutput{
			MatchingPaths: []string{PathTypeStaticLayout},
		},
	},
}

func clean() {
	os.RemoveAll("../tmp")
	Log.Infof("removed temporary fixtures")
}

var filesToMock = []string{
	"client.entry.tsx",
	"pages/$.route.tsx",
	"pages/_index.route.tsx",
	"pages/articles/_index.route.tsx",
	"pages/articles/test/articles/_index.route.tsx",
	"pages/bear/$bear_id/$.route.tsx",
	"pages/bear/$bear_id.route.tsx",
	"pages/bear/_index.route.tsx",
	"pages/bear.route.tsx",
	"pages/dashboard/$.route.tsx",
	"pages/dashboard/_index.route.tsx",
	"pages/dashboard/customers/$customer_id/_index.route.tsx",
	"pages/dashboard/customers/$customer_id/orders/$order_id.route.tsx",
	"pages/dashboard/customers/$customer_id/orders/_index.route.tsx",
	"pages/dashboard/customers/$customer_id/orders.route.tsx",
	"pages/dashboard/customers/$customer_id.route.tsx",
	"pages/dashboard/customers/_index.route.tsx",
	"pages/dashboard/customers.route.tsx",
	"pages/dashboard.route.tsx",
	"pages/dynamic-index/$pagename/_index.route.tsx",
	"pages/dynamic-index/__site_index/index.route.tsx",
	"pages/lion/$.route.tsx",
	"pages/lion/_index.route.tsx",
	"pages/lion.route.tsx",
	"pages/tiger/$tiger_id/$.route.tsx",
	"pages/tiger/$tiger_id/$tiger_cub_id.route.tsx",
	"pages/tiger/$tiger_id/_index.route.tsx",
	"pages/tiger/$tiger_id.route.tsx",
	"pages/tiger/_index.route.tsx",
	"pages/tiger.route.tsx",
}

func testGetMatchingPathData(path string) *ActivePathData {
	var r http.Request = http.Request{}
	r.URL = &url.URL{}
	r.URL.Path = path
	r.Method = "GET"
	return testHwyInstance.getMatchingPathData(nil, &r)
}

func setup() {
	// temporarily create fixtures for testing
	for _, file := range filesToMock {
		targetPath := "../tmp/fixtures/" + file
		err := os.MkdirAll(filepath.Dir(targetPath), 0755)
		if err != nil {
			panic(err)
		}
		err = os.WriteFile(targetPath, []byte{}, 0644)
		if err != nil {
			panic(err)
		}
	}
	Log.Infof("created temporary fixtures for testing")

	// Write the root template to the temporary directory
	templateDir := "../tmp/fixtures/templates"
	err := os.MkdirAll(templateDir, 0755)
	if err != nil {
		panic(err)
	}
	templateContent := `
		<!DOCTYPE html>
		<html lang="en">
			<head>
				<meta charset="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				{{.HeadElements}} {{.SSRInnerHTML}}
			</head>
			<body>
				<div id="root"></div>
			</body>
		</html>
	`
	err = os.WriteFile(filepath.Join(templateDir, "root.html"), []byte(templateContent), 0644)
	if err != nil {
		panic(err)
	}

	testHwyInstance = Hwy{
		FS:                   os.DirFS("../tmp/fixtures"),
		RootTemplateLocation: "templates/root.html",
	}

	// Run the Hwy build
	err = Build(BuildOptions{
		PagesSrcDir:    "../tmp/fixtures/pages",
		HashedOutDir:   "../tmp/out",
		UnhashedOutDir: "../tmp/out",
		ClientEntryOut: "../tmp/out",
		ClientEntry:    "../tmp/fixtures/client.entry.tsx",
	})
	if err != nil {
		panic(err)
	}

	// Grab the generated paths file
	pathsFileLocation := "../tmp/out/hwy_paths.json"
	pathsFileBytes, err := os.ReadFile(pathsFileLocation)
	if err != nil {
		panic(err)
	}
	pathsFileJSON := PathsFile{}
	err = json.Unmarshal(pathsFileBytes, &pathsFileJSON)
	if err != nil {
		panic(err)
	}

	// Populate the global in-memory instancePaths
	var paths []Path
	for _, jsonSafePath := range pathsFileJSON.Paths {
		paths = append(paths, Path{
			Pattern:  jsonSafePath.Pattern,
			Segments: jsonSafePath.Segments,
			PathType: jsonSafePath.PathType,
			OutPath:  jsonSafePath.OutPath,
			SrcPath:  jsonSafePath.SrcPath,
			Deps:     jsonSafePath.Deps,
		})
	}
	testHwyInstance.paths = paths
}

func TestGetMatchingPathDataConcurrency(t *testing.T) {
	// Simulate long-running and error-prone loaders
	loader1 := LoaderFunc[string](func(props LoaderProps) (string, error) {
		time.Sleep(100 * time.Millisecond)
		return "loader1 result", nil
	})

	loader2 := LoaderFunc[any](func(props LoaderProps) (any, error) {
		time.Sleep(100 * time.Millisecond)
		Log.Infof(`Below should say "ERROR: loader2 error":`)
		return nil, errors.New("loader2 error")
	})

	// Define test paths with these loaders
	testHwyInstance.paths = []Path{
		{Pattern: "/test1", DataFuncs: &DataFuncs{Loader: loader1}, Segments: &[]string{""}},
		{Pattern: "/test2", DataFuncs: &DataFuncs{Loader: loader2}, Segments: &[]string{""}},
	}

	// Create a WaitGroup to manage concurrency
	var wg sync.WaitGroup
	wg.Add(2)

	// Define test function to run in goroutines
	testFunc := func(path string, expectedLoaderData any, expectedError bool) {
		defer wg.Done()
		r := http.Request{URL: &url.URL{Path: path}, Method: "GET"}
		data := testHwyInstance.getMatchingPathData(nil, &r)

		// Validate the output
		if expectedError {
			if len(*data.LoadersData) != 0 {
				t.Errorf("Expected 0 loader data due to error, but got %d", len(*data.LoadersData))
			}
			if data.OutermostErrorIndex == -1 {
				t.Error("Expected error boundary index to be set, but it was -1")
			}
		} else {
			if len(*data.LoadersData) != 1 {
				t.Errorf("Expected 1 loader data, but got %d", len(*data.LoadersData))
			}
			if (*data.LoadersData)[0] != expectedLoaderData {
				t.Errorf("Expected loader data %v, but got %v", expectedLoaderData, (*data.LoadersData)[0])
			}
			if data.OutermostErrorIndex != -1 {
				t.Errorf("Expected error boundary index to be -1, but got %d", data.OutermostErrorIndex)
			}
		}

		if len(*data.MatchingPaths) != 1 {
			t.Errorf("Expected 1 matching path, but got %d", len(*data.MatchingPaths))
		}
	}

	// Run test functions concurrently
	go testFunc("/test1", "loader1 result", false)
	go testFunc("/test2", nil, true)

	// Wait for all goroutines to finish
	wg.Wait()
}

func TestGetHeadElements(t *testing.T) {
	routeData := &GetRouteDataOutput{
		Title: "Test Title",
		MetaHeadBlocks: &[]*HeadBlock{
			{Tag: "meta", Attributes: map[string]string{"name": "description", "content": "Test Description"}},
		},
		RestHeadBlocks: &[]*HeadBlock{
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

func TestGetSSRInnerHTML(t *testing.T) {
	routeData := &GetRouteDataOutput{
		BuildID: "test-build-id",
	}

	ssrInnerHTML, err := GetSSRInnerHTML(routeData, true)
	if err != nil {
		t.Errorf("Expected no error, but got %v", err)
	}
	if !strings.Contains(string(*ssrInnerHTML), "test-build-id") {
		t.Errorf("Expected build ID in SSR inner HTML, but it's missing")
	}
}

func TestGetRootHandler(t *testing.T) {
	defer clean()

	// Initialize the handler
	handler := testHwyInstance.GetRootHandler()

	// Create a response recorder and request
	rr := httptest.NewRecorder()
	req, err := http.NewRequest("GET", "/", nil)
	if err != nil {
		t.Fatalf("Failed to create request: %v", err)
	}

	// Serve the request
	handler.ServeHTTP(rr, req)

	// Check the response status code
	if status := rr.Code; status != http.StatusOK {
		t.Errorf("Handler returned wrong status code: got %v want %v", status, http.StatusOK)
	}

	// Check the response body for expected content
	expected := "<title>"
	if !strings.Contains(rr.Body.String(), expected) {
		t.Errorf("Handler returned unexpected body: got %v want %v", rr.Body.String(), expected)
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
				{Tag: "", Title: "Hwy", Attributes: nil},
				{Tag: "meta", Title: "", Attributes: map[string]string{"name": "description", "content": "Hwy is a simple, lightweight, and flexible web framework."}},
				{Tag: "meta", Title: "", Attributes: map[string]string{"name": "og:image", "content": "create-hwy-snippet.webp"}},
			},
			expected: []*HeadBlock{
				{Tag: "", Title: "Hwy", Attributes: nil},
				{Tag: "meta", Title: "", Attributes: map[string]string{"name": "description", "content": "Hwy is a simple, lightweight, and flexible web framework."}},
				{Tag: "meta", Title: "", Attributes: map[string]string{"name": "og:image", "content": "create-hwy-snippet.webp"}},
			},
		},
		{
			name: "With duplicates",
			input: []HeadBlock{
				{Tag: "", Title: "Hwy", Attributes: nil},
				{Tag: "meta", Title: "", Attributes: map[string]string{"name": "description", "content": "Hwy is a simple, lightweight, and flexible web framework."}},
				{Tag: "meta", Title: "", Attributes: map[string]string{"name": "description", "content": "Hwy is a simple, lightweight, and flexible web framework."}},
			},
			expected: []*HeadBlock{
				{Tag: "", Title: "Hwy", Attributes: nil},
				{Tag: "meta", Title: "", Attributes: map[string]string{"name": "description", "content": "Hwy is a simple, lightweight, and flexible web framework."}},
			},
		},
		{
			name: "No title or description",
			input: []HeadBlock{
				{Tag: "meta", Title: "", Attributes: map[string]string{"name": "keywords", "content": "go, test"}},
				{Tag: "link", Title: "", Attributes: map[string]string{"rel": "stylesheet", "href": "/style.css"}},
			},
			expected: []*HeadBlock{
				{Tag: "meta", Title: "", Attributes: map[string]string{"name": "keywords", "content": "go, test"}},
				{Tag: "link", Title: "", Attributes: map[string]string{"rel": "stylesheet", "href": "/style.css"}},
			},
		},
		{
			name: "Multiple titles and descriptions",
			input: []HeadBlock{
				{Tag: "", Title: "Hwy 1", Attributes: nil},
				{Tag: "", Title: "Hwy 2", Attributes: nil},
				{Tag: "meta", Title: "", Attributes: map[string]string{"name": "description", "content": "Description 1"}},
				{Tag: "meta", Title: "", Attributes: map[string]string{"name": "description", "content": "Description 2"}},
			},
			expected: []*HeadBlock{
				{Tag: "", Title: "Hwy 2", Attributes: nil},
				{Tag: "meta", Title: "", Attributes: map[string]string{"name": "description", "content": "Description 2"}},
			},
		},
		{
			name: "Different tags with same attributes",
			input: []HeadBlock{
				{Tag: "meta", Title: "", Attributes: map[string]string{"name": "viewport", "content": "width=device-width, initial-scale=1"}},
				{Tag: "link", Title: "", Attributes: map[string]string{"rel": "stylesheet", "href": "/style.css"}},
				{Tag: "meta", Title: "", Attributes: map[string]string{"name": "viewport", "content": "width=device-width, initial-scale=1"}},
			},
			expected: []*HeadBlock{
				{Tag: "meta", Title: "", Attributes: map[string]string{"name": "viewport", "content": "width=device-width, initial-scale=1"}},
				{Tag: "link", Title: "", Attributes: map[string]string{"rel": "stylesheet", "href": "/style.css"}},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := dedupeHeadBlocks(&tt.input)
			if !reflect.DeepEqual(*result, tt.expected) {
				fmt.Println("Result:")
				for _, block := range *result {
					t.Logf("%+v", block)
				}

				fmt.Println("Expected:")
				for _, block := range tt.expected {
					t.Logf("%+v", block)
				}

				t.Errorf("dedupeHeadBlocks() = %v, expected %v", *result, tt.expected)
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
			input:    HeadBlock{Tag: "title", Title: "Test Title", Attributes: nil},
			expected: "title|",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := stableHash(&tt.input)
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
			result := dedupeHeadBlocks(&tt.input)
			if !reflect.DeepEqual(*result, tt.expected) {
				fmt.Println("Result:")
				for _, block := range *result {
					t.Logf("%+v", block)
				}

				fmt.Println("Expected:")
				for _, block := range tt.expected {
					t.Logf("%+v", block)
				}

				t.Errorf("dedupeHeadBlocks() = %v, expected %v", *result, tt.expected)
			}
		})
	}
}
