package hwy_test

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/sjc5/hwy"
	"github.com/sjc5/hwy/packages/go/router"
)

type expectedOutput struct {
	MatchingPaths []string
	Params        router.Params
	SplatSegments router.SplatSegments
}

type testPath struct {
	Path           string
	ExpectedOutput struct {
		MatchingPaths []string
		Params        router.Params
		SplatSegments router.SplatSegments
	}
}

var testHwyInstance router.Hwy

func init() {
	setup()
}

func TestRouter(t *testing.T) {
	// TEST "GetMatchingPathData"
	for _, path := range testPaths {
		matchingPathData := testGetMatchingPathData(path.Path)

		// Has expected number of matching paths
		if len(matchingPathData.MatchingPaths) != len(path.ExpectedOutput.MatchingPaths) {
			router.Log.Error(fmt.Sprintf("Path: %s", path.Path))
			t.Errorf("Expected %d matching paths, but got %d", len(path.ExpectedOutput.MatchingPaths), len(matchingPathData.MatchingPaths))
		}

		for i, matchingPath := range matchingPathData.MatchingPaths {
			// Each matching path is of the expected type
			if matchingPath.PathType != path.ExpectedOutput.MatchingPaths[i] {
				router.Log.Error(fmt.Sprintf("Path: %s", path.Path))
				t.Errorf("Expected matching path %d to be of type %s, but got %s", i, path.ExpectedOutput.MatchingPaths[i], matchingPath.PathType)
			}
		}

		// Has expected number of params
		if len(matchingPathData.Params) != len(path.ExpectedOutput.Params) {
			router.Log.Error(fmt.Sprintf("Path: %s", path.Path))
			t.Errorf("Expected %d params, but got %d", len(path.ExpectedOutput.Params), len(matchingPathData.Params))
		}

		for key, expectedParam := range path.ExpectedOutput.Params {
			// Each param has the expected value
			if matchingPathData.Params[key] != expectedParam {
				router.Log.Error(fmt.Sprintf("Path: %s", path.Path))
				t.Errorf("Expected param %s to be %s, but got %s", key, expectedParam, matchingPathData.Params[key])
			}
		}

		// Has expected number of splat segments
		if matchingPathData.SplatSegments != nil && len(matchingPathData.SplatSegments) != len(path.ExpectedOutput.SplatSegments) {
			router.Log.Error(fmt.Sprintf("Path: %s", path.Path))
			t.Errorf("Expected %d splat segments, but got %d", len(path.ExpectedOutput.SplatSegments), len(matchingPathData.SplatSegments))
		}

		for i, expectedSplatSegment := range path.ExpectedOutput.SplatSegments {
			// Each splat segment has the expected value
			if matchingPathData.SplatSegments[i] != expectedSplatSegment {
				router.Log.Error(fmt.Sprintf("Path: %s", path.Path))
				t.Errorf("Expected splat segment %d to be %s, but got %s", i, expectedSplatSegment, matchingPathData.SplatSegments[i])
			}
		}
	}
}

var testPaths = []testPath{
	{
		Path: "/does-not-exist",
		ExpectedOutput: expectedOutput{
			MatchingPaths: []string{router.PathTypeUltimateCatch},
			SplatSegments: router.SplatSegments{"does-not-exist"},
		},
	},
	{
		Path: "/this-should-be-ignored",
		ExpectedOutput: expectedOutput{
			MatchingPaths: []string{router.PathTypeUltimateCatch},
			SplatSegments: router.SplatSegments{"this-should-be-ignored"},
		},
	},
	{
		Path: "/",
		ExpectedOutput: expectedOutput{
			MatchingPaths: []string{router.PathTypeIndex},
		},
	},
	{
		Path: "/lion",
		ExpectedOutput: expectedOutput{
			MatchingPaths: []string{router.PathTypeStaticLayout, router.PathTypeIndex},
		},
	},
	{
		Path: "/lion/123",
		ExpectedOutput: expectedOutput{
			MatchingPaths: []string{router.PathTypeStaticLayout, router.PathTypeNonUltimateSplat},
			SplatSegments: router.SplatSegments{"123"},
		},
	},
	{
		Path: "/lion/123/456",
		ExpectedOutput: expectedOutput{
			MatchingPaths: []string{router.PathTypeStaticLayout, router.PathTypeNonUltimateSplat},
			SplatSegments: router.SplatSegments{"123", "456"},
		},
	},
	{
		Path: "/lion/123/456/789",
		ExpectedOutput: expectedOutput{
			MatchingPaths: []string{router.PathTypeStaticLayout, router.PathTypeNonUltimateSplat},
			SplatSegments: router.SplatSegments{"123", "456", "789"},
		},
	},
	{
		Path: "/tiger",
		ExpectedOutput: expectedOutput{
			MatchingPaths: []string{router.PathTypeStaticLayout, router.PathTypeIndex},
		},
	},
	{
		Path: "/tiger/123",
		ExpectedOutput: expectedOutput{
			MatchingPaths: []string{router.PathTypeStaticLayout, router.PathTypeDynamicLayout, router.PathTypeIndex},
			Params:        router.Params{"tiger_id": "123"},
		},
	},
	{
		Path: "/tiger/123/456",
		ExpectedOutput: expectedOutput{
			MatchingPaths: []string{router.PathTypeStaticLayout, router.PathTypeDynamicLayout, router.PathTypeDynamicLayout},
			Params:        router.Params{"tiger_id": "123", "tiger_cub_id": "456"},
		},
	},
	{
		Path: "/tiger/123/456/789",
		ExpectedOutput: expectedOutput{
			MatchingPaths: []string{router.PathTypeStaticLayout, router.PathTypeDynamicLayout, router.PathTypeNonUltimateSplat},
			Params:        router.Params{"tiger_id": "123"},
			SplatSegments: router.SplatSegments{"456", "789"},
		},
	},
	{
		Path: "/bear",
		ExpectedOutput: expectedOutput{
			MatchingPaths: []string{router.PathTypeStaticLayout, router.PathTypeIndex},
		},
	},
	{
		Path: "/bear/123",
		ExpectedOutput: expectedOutput{
			MatchingPaths: []string{router.PathTypeStaticLayout, router.PathTypeDynamicLayout},
			Params:        router.Params{"bear_id": "123"},
		},
	},
	{
		Path: "/bear/123/456",
		ExpectedOutput: expectedOutput{
			MatchingPaths: []string{router.PathTypeStaticLayout, router.PathTypeDynamicLayout, router.PathTypeNonUltimateSplat},
			Params:        router.Params{"bear_id": "123"},
			SplatSegments: router.SplatSegments{"456"},
		},
	},
	{
		Path: "/bear/123/456/789",
		ExpectedOutput: expectedOutput{
			MatchingPaths: []string{router.PathTypeStaticLayout, router.PathTypeDynamicLayout, router.PathTypeNonUltimateSplat},
			Params:        router.Params{"bear_id": "123"},
			SplatSegments: router.SplatSegments{"456", "789"},
		},
	},
	{
		Path: "/dashboard",
		ExpectedOutput: expectedOutput{
			MatchingPaths: []string{router.PathTypeStaticLayout, router.PathTypeIndex},
		},
	},
	{
		Path: "/dashboard/asdf",
		ExpectedOutput: expectedOutput{
			MatchingPaths: []string{router.PathTypeStaticLayout, router.PathTypeNonUltimateSplat},
			SplatSegments: router.SplatSegments{"asdf"},
		},
	},
	{
		Path: "/dashboard/customers",
		ExpectedOutput: expectedOutput{
			MatchingPaths: []string{router.PathTypeStaticLayout, router.PathTypeStaticLayout, router.PathTypeIndex},
		},
	},
	{
		Path: "/dashboard/customers/123",
		ExpectedOutput: expectedOutput{
			MatchingPaths: []string{router.PathTypeStaticLayout, router.PathTypeStaticLayout, router.PathTypeDynamicLayout, router.PathTypeIndex},
			Params:        router.Params{"customer_id": "123"},
		},
	},
	{
		Path: "/dashboard/customers/123/orders",
		ExpectedOutput: expectedOutput{
			MatchingPaths: []string{router.PathTypeStaticLayout, router.PathTypeStaticLayout, router.PathTypeDynamicLayout, router.PathTypeStaticLayout, router.PathTypeIndex},
			Params:        router.Params{"customer_id": "123"},
		},
	},
	{
		Path: "/dashboard/customers/123/orders/456",
		ExpectedOutput: expectedOutput{
			MatchingPaths: []string{router.PathTypeStaticLayout, router.PathTypeStaticLayout, router.PathTypeDynamicLayout, router.PathTypeStaticLayout, router.PathTypeDynamicLayout},
			Params:        router.Params{"customer_id": "123", "order_id": "456"},
		},
	},
	{
		Path: "/articles",
		ExpectedOutput: expectedOutput{
			MatchingPaths: []string{router.PathTypeIndex},
		},
	},
	{
		Path: "/articles/bob",
		ExpectedOutput: expectedOutput{
			MatchingPaths: []string{router.PathTypeUltimateCatch},
			SplatSegments: router.SplatSegments{"articles", "bob"},
		},
	},
	{
		Path: "/articles/test",
		ExpectedOutput: expectedOutput{
			MatchingPaths: []string{router.PathTypeUltimateCatch},
			SplatSegments: router.SplatSegments{"articles", "test"},
		},
	},
	{
		Path: "/articles/test/articles",
		ExpectedOutput: expectedOutput{
			MatchingPaths: []string{router.PathTypeIndex},
		},
	},
	{
		Path: "/dynamic-index/index",
		ExpectedOutput: expectedOutput{
			MatchingPaths: []string{router.PathTypeStaticLayout},
		},
	},
}

func clean() {
	os.RemoveAll("../tmp")
	router.Log.Info("removed temporary fixtures")
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

func testGetMatchingPathData(path string) *router.ActivePathData {
	var r http.Request = http.Request{}
	r.URL = &url.URL{}
	r.URL.Path = path
	r.Method = "GET"
	apd, _, _ := testHwyInstance.Hwy__internal__getMatchingPathData(nil, &r)
	return apd
}

func setup() {
	// temporarily create fixtures for testing
	for _, file := range filesToMock {
		targetPath := "../tmp/" + file
		err := os.MkdirAll(filepath.Dir(targetPath), 0755)
		if err != nil {
			panic(err)
		}
		err = os.WriteFile(targetPath, []byte{}, 0644)
		if err != nil {
			panic(err)
		}
	}
	router.Log.Info("created temporary fixtures for testing")

	// Write the root template to the temporary directory
	templateDir := "../tmp/templates"
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

	testHwyInstance = router.Hwy{
		FS:                   os.DirFS("../tmp"),
		RootTemplateLocation: "templates/root.html",
		PublicURLResolver:    func(path string) string { return path },
	}

	// Run the Hwy build
	err = router.Build(&router.BuildOptions{
		PagesSrcDir:         "../tmp/pages",
		StaticPublicOutDir:  "../tmp/",
		StaticPrivateOutDir: "../tmp/",
		ClientEntry:         "../tmp/client.entry.tsx",
	})
	if err != nil {
		panic(err)
	}

	err = testHwyInstance.Init()
	if err != nil {
		panic(err)
	}
}

type TestLoaderOutput struct {
	Asdf string
}

func TestGetMatchingPathDataConcurrency(t *testing.T) {
	// Simulate long-running and error-prone loaders
	loader1 := hwy.Loader[TestLoaderOutput](
		func(ctx hwy.LoaderCtx[TestLoaderOutput]) {
			time.Sleep(100 * time.Millisecond)
			ctx.Res.Data = TestLoaderOutput{Asdf: "loader1 result"}
		},
	)

	loader2 := hwy.Loader[struct{}](
		func(ctx hwy.LoaderCtx[struct{}]) {
			time.Sleep(100 * time.Millisecond)
			router.Log.Info(`Below should say "ERROR: loader2 error":`)
			ctx.Res.ErrMsg = "loader2 error"
		},
	)

	// Define test paths with these loaders
	testHwyInstance.Hwy__internal__setPaths([]router.Path{
		{PathBase: router.PathBase{Pattern: "/test1", Segments: []string{""}}, DataFunction: loader1},
		{PathBase: router.PathBase{Pattern: "/test2", Segments: []string{""}}, DataFunction: loader2},
	})

	// Create a WaitGroup to manage concurrency
	var wg sync.WaitGroup
	wg.Add(2)

	// Define test function to run in goroutines
	testFunc := func(path string, expectedLoaderData any, expectedError bool) {
		defer wg.Done()
		r := http.Request{URL: &url.URL{Path: path}, Method: "GET"}
		data, _, _ := testHwyInstance.Hwy__internal__getMatchingPathData(nil, &r)

		// Validate the output
		if expectedError {
			if len(data.LoadersData) != 0 {
				t.Errorf("Expected 0 loader data due to error, but got %d", len(data.LoadersData))
			}
			if data.OutermostErrorIndex == -1 {
				t.Error("Expected error boundary index to be set, but it was -1")
			}
		} else {
			if len(data.LoadersData) != 1 {
				t.Errorf("Expected 1 loader data, but got %d", len(data.LoadersData))
			}
			if data.LoadersData[0] != expectedLoaderData {
				t.Errorf("Expected loader data %v, but got %v", expectedLoaderData, data.LoadersData[0])
			}
			if data.OutermostErrorIndex != -1 {
				t.Errorf("Expected error boundary index to be -1, but got %d", data.OutermostErrorIndex)
			}
		}

		if len(data.MatchingPaths) != 1 {
			t.Errorf("Expected 1 matching path, but got %d", len(data.MatchingPaths))
		}
	}

	// Run test functions concurrently
	go testFunc("/test1", TestLoaderOutput{Asdf: "loader1 result"}, false)
	go testFunc("/test2", nil, true)

	// Wait for all goroutines to finish
	wg.Wait()
}

func TestGetRootHandler(t *testing.T) {
	defer clean()

	// Init the handler
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
