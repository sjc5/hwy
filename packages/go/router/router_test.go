package router

import (
	"encoding/json"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"testing"
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

func init() {
	setup()
}

func TestRouter(t *testing.T) {
	defer clean()

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
	"pages/$.ui.tsx",
	"pages/_index.ui.tsx",
	"pages/articles/_index.ui.tsx",
	"pages/articles/test/articles/_index.ui.tsx",
	"pages/bear/$bear_id/$.ui.tsx",
	"pages/bear/$bear_id.ui.tsx",
	"pages/bear/_index.ui.tsx",
	"pages/bear.ui.tsx",
	"pages/dashboard/$.ui.tsx",
	"pages/dashboard/_index.ui.tsx",
	"pages/dashboard/customers/$customer_id/_index.ui.tsx",
	"pages/dashboard/customers/$customer_id/orders/$order_id.ui.tsx",
	"pages/dashboard/customers/$customer_id/orders/_index.ui.tsx",
	"pages/dashboard/customers/$customer_id/orders.ui.tsx",
	"pages/dashboard/customers/$customer_id.ui.tsx",
	"pages/dashboard/customers/_index.ui.tsx",
	"pages/dashboard/customers.ui.tsx",
	"pages/dashboard.ui.tsx",
	"pages/dynamic-index/$pagename/_index.ui.tsx",
	"pages/dynamic-index/__site_index/index.ui.tsx",
	"pages/lion/$.ui.tsx",
	"pages/lion/_index.ui.tsx",
	"pages/lion.ui.tsx",
	"pages/tiger/$tiger_id/$.ui.tsx",
	"pages/tiger/$tiger_id/$tiger_cub_id.ui.tsx",
	"pages/tiger/$tiger_id/_index.ui.tsx",
	"pages/tiger/$tiger_id.ui.tsx",
	"pages/tiger/_index.ui.tsx",
	"pages/tiger.ui.tsx",
}

func testGetMatchingPathData(path string) *ActivePathData {
	var r http.Request = http.Request{}
	r.URL = &url.URL{}
	r.URL.Path = path
	r.Method = "GET"
	return getMatchingPathData(nil, &r)
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

	// Run the Hwy build
	err := Build(BuildOptions{
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
	instancePaths = &paths

	// Off to the races!
}
