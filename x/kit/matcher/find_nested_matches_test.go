package matcher

import (
	"fmt"
	"reflect"
	"runtime"
	"strings"
	"testing"
)

var NestedPatterns = []string{
	"/_index",                                         // Index
	"/articles/_index",                                // Index
	"/articles/test/articles/_index",                  // Index
	"/bear/_index",                                    // Index
	"/dashboard/_index",                               // Index
	"/dashboard/customers/_index",                     // Index
	"/dashboard/customers/:customer_id/_index",        // Index
	"/dashboard/customers/:customer_id/orders/_index", // Index
	"/dynamic-index/:pagename/_index",                 // Index
	"/lion/_index",                                    // Index
	"/tiger/_index",                                   // Index
	"/tiger/:tiger_id/_index",                         // Index
	"/*",
	"/bear",
	"/bear/:bear_id",
	"/bear/:bear_id/*",
	"/dashboard",
	"/dashboard/*",
	"/dashboard/customers",
	"/dashboard/customers/:customer_id",
	"/dashboard/customers/:customer_id/orders",
	"/dashboard/customers/:customer_id/orders/:order_id",
	"/dynamic-index/index",
	"/lion",
	"/lion/*",
	"/tiger",
	"/tiger/:tiger_id",
	"/tiger/:tiger_id/:tiger_cub_id",
	"/tiger/:tiger_id/*",
}

type TestNestedScenario struct {
	Path            string
	ExpectedMatches []Match
}

var NestedScenarios = []TestNestedScenario{
	{
		Path: "/does-not-exist",
		ExpectedMatches: []Match{
			{
				RegisteredPattern: &RegisteredPattern{normalizedPattern: "/*"},
				SplatValues:       []string{"does-not-exist"},
			},
		},
	},
	{
		Path: "/this-should-be-ignored",
		ExpectedMatches: []Match{
			{
				RegisteredPattern: &RegisteredPattern{normalizedPattern: "/*"},
				SplatValues:       []string{"this-should-be-ignored"},
			},
		},
	},
	{
		Path: "/",
		ExpectedMatches: []Match{
			{
				RegisteredPattern: &RegisteredPattern{normalizedPattern: "/"},
			},
		},
	},
	{
		Path: "/lion",
		ExpectedMatches: []Match{
			{
				RegisteredPattern: &RegisteredPattern{normalizedPattern: "/lion"},
			},
			{
				RegisteredPattern: &RegisteredPattern{normalizedPattern: "/lion/"},
			},
		},
	},
	{
		Path: "/lion/123",
		ExpectedMatches: []Match{
			{
				RegisteredPattern: &RegisteredPattern{normalizedPattern: "/lion"},
			},
			{
				RegisteredPattern: &RegisteredPattern{normalizedPattern: "/lion/*"},
				SplatValues:       []string{"123"},
			},
		},
	},
	{
		Path: "/lion/123/456",
		ExpectedMatches: []Match{
			{
				RegisteredPattern: &RegisteredPattern{normalizedPattern: "/lion"},
			},
			{
				RegisteredPattern: &RegisteredPattern{normalizedPattern: "/lion/*"},
				SplatValues:       []string{"123", "456"},
			},
		},
	},
	{
		Path: "/lion/123/456/789",
		ExpectedMatches: []Match{
			{
				RegisteredPattern: &RegisteredPattern{normalizedPattern: "/lion"},
			},
			{
				RegisteredPattern: &RegisteredPattern{normalizedPattern: "/lion/*"},
				SplatValues:       []string{"123", "456", "789"},
			},
		},
	},
	{
		Path: "/tiger",
		ExpectedMatches: []Match{
			{
				RegisteredPattern: &RegisteredPattern{normalizedPattern: "/tiger"},
			},
			{
				RegisteredPattern: &RegisteredPattern{normalizedPattern: "/tiger/"},
			},
		},
	},
	{
		Path: "/tiger/123",
		ExpectedMatches: []Match{
			{
				RegisteredPattern: &RegisteredPattern{normalizedPattern: "/tiger"},
			},
			{
				RegisteredPattern: &RegisteredPattern{normalizedPattern: "/tiger/:tiger_id"},
				Params:            Params{"tiger_id": "123"},
			},
			{
				RegisteredPattern: &RegisteredPattern{normalizedPattern: "/tiger/:tiger_id/"},
				Params:            Params{"tiger_id": "123"},
			},
		},
	},
	{
		Path: "/tiger/123/456",
		ExpectedMatches: []Match{
			{
				RegisteredPattern: &RegisteredPattern{normalizedPattern: "/tiger"},
			},
			{
				RegisteredPattern: &RegisteredPattern{normalizedPattern: "/tiger/:tiger_id"},
				Params:            Params{"tiger_id": "123"},
			},
			{
				RegisteredPattern: &RegisteredPattern{normalizedPattern: "/tiger/:tiger_id/:tiger_cub_id"},
				Params:            Params{"tiger_id": "123", "tiger_cub_id": "456"},
			},
		},
	},
	{
		Path: "/tiger/123/456/789",
		ExpectedMatches: []Match{
			{
				RegisteredPattern: &RegisteredPattern{normalizedPattern: "/tiger"},
			},
			{
				RegisteredPattern: &RegisteredPattern{normalizedPattern: "/tiger/:tiger_id"},
				Params:            Params{"tiger_id": "123"},
			},
			{
				RegisteredPattern: &RegisteredPattern{normalizedPattern: "/tiger/:tiger_id/*"},
				Params:            Params{"tiger_id": "123"},
				SplatValues:       []string{"456", "789"},
			},
		},
	},
	{
		Path: "/bear",
		ExpectedMatches: []Match{
			{
				RegisteredPattern: &RegisteredPattern{normalizedPattern: "/bear"},
			},
			{
				RegisteredPattern: &RegisteredPattern{normalizedPattern: "/bear/"},
			},
		},
	},
	{
		Path: "/bear/123",
		ExpectedMatches: []Match{
			{
				RegisteredPattern: &RegisteredPattern{normalizedPattern: "/bear"},
			},
			{
				RegisteredPattern: &RegisteredPattern{normalizedPattern: "/bear/:bear_id"},
				Params:            Params{"bear_id": "123"},
			},
		},
	},
	{
		Path: "/bear/123/456",
		ExpectedMatches: []Match{
			{
				RegisteredPattern: &RegisteredPattern{normalizedPattern: "/bear"},
			},
			{
				RegisteredPattern: &RegisteredPattern{normalizedPattern: "/bear/:bear_id"},
				Params:            Params{"bear_id": "123"},
			},
			{
				RegisteredPattern: &RegisteredPattern{normalizedPattern: "/bear/:bear_id/*"},
				Params:            Params{"bear_id": "123"},
				SplatValues:       []string{"456"},
			},
		},
	},
	{
		Path: "/bear/123/456/789",
		ExpectedMatches: []Match{
			{
				RegisteredPattern: &RegisteredPattern{normalizedPattern: "/bear"},
			},
			{
				RegisteredPattern: &RegisteredPattern{normalizedPattern: "/bear/:bear_id"},
				Params:            Params{"bear_id": "123"},
			},
			{
				RegisteredPattern: &RegisteredPattern{normalizedPattern: "/bear/:bear_id/*"},
				Params:            Params{"bear_id": "123"},
				SplatValues:       []string{"456", "789"},
			},
		},
	},
	{
		Path: "/dashboard",
		ExpectedMatches: []Match{
			{
				RegisteredPattern: &RegisteredPattern{normalizedPattern: "/dashboard"},
			},
			{
				RegisteredPattern: &RegisteredPattern{normalizedPattern: "/dashboard/"},
			},
		},
	},
	{
		Path: "/dashboard/asdf",
		ExpectedMatches: []Match{
			{
				RegisteredPattern: &RegisteredPattern{normalizedPattern: "/dashboard"},
			},
			{
				RegisteredPattern: &RegisteredPattern{normalizedPattern: "/dashboard/*"},
				SplatValues:       []string{"asdf"},
			},
		},
	},
	{
		Path: "/dashboard/customers",
		ExpectedMatches: []Match{
			{
				RegisteredPattern: &RegisteredPattern{normalizedPattern: "/dashboard"},
			},
			{
				RegisteredPattern: &RegisteredPattern{normalizedPattern: "/dashboard/customers"},
			},
			{
				RegisteredPattern: &RegisteredPattern{normalizedPattern: "/dashboard/customers/"},
			},
		},
	},
	{
		Path: "/dashboard/customers/123",
		ExpectedMatches: []Match{
			{
				RegisteredPattern: &RegisteredPattern{normalizedPattern: "/dashboard"},
			},
			{
				RegisteredPattern: &RegisteredPattern{normalizedPattern: "/dashboard/customers"},
			},
			{
				RegisteredPattern: &RegisteredPattern{normalizedPattern: "/dashboard/customers/:customer_id"},
				Params:            Params{"customer_id": "123"},
			},
			{
				RegisteredPattern: &RegisteredPattern{normalizedPattern: "/dashboard/customers/:customer_id/"},
				Params:            Params{"customer_id": "123"},
			},
		},
	},
	{
		Path: "/dashboard/customers/123/orders",
		ExpectedMatches: []Match{
			{
				RegisteredPattern: &RegisteredPattern{normalizedPattern: "/dashboard"},
			},
			{
				RegisteredPattern: &RegisteredPattern{normalizedPattern: "/dashboard/customers"},
			},
			{
				RegisteredPattern: &RegisteredPattern{normalizedPattern: "/dashboard/customers/:customer_id"},
				Params:            Params{"customer_id": "123"},
			},
			{
				RegisteredPattern: &RegisteredPattern{normalizedPattern: "/dashboard/customers/:customer_id/orders"},
				Params:            Params{"customer_id": "123"},
			},
			{
				RegisteredPattern: &RegisteredPattern{normalizedPattern: "/dashboard/customers/:customer_id/orders/"},
				Params:            Params{"customer_id": "123"},
			},
		},
	},
	{
		Path: "/dashboard/customers/123/orders/456",
		ExpectedMatches: []Match{
			{
				RegisteredPattern: &RegisteredPattern{normalizedPattern: "/dashboard"},
			},
			{
				RegisteredPattern: &RegisteredPattern{normalizedPattern: "/dashboard/customers"},
			},
			{
				RegisteredPattern: &RegisteredPattern{normalizedPattern: "/dashboard/customers/:customer_id"},
				Params:            Params{"customer_id": "123"},
			},
			{
				RegisteredPattern: &RegisteredPattern{normalizedPattern: "/dashboard/customers/:customer_id/orders"},
				Params:            Params{"customer_id": "123"},
			},
			{
				RegisteredPattern: &RegisteredPattern{normalizedPattern: "/dashboard/customers/:customer_id/orders/:order_id"},
				Params:            Params{"customer_id": "123", "order_id": "456"},
			},
		},
	},
	{
		Path: "/articles",
		ExpectedMatches: []Match{
			{
				RegisteredPattern: &RegisteredPattern{normalizedPattern: "/articles/"},
			},
		},
	},
	{
		Path: "/articles/bob",
		ExpectedMatches: []Match{
			{
				RegisteredPattern: &RegisteredPattern{normalizedPattern: "/*"},
				SplatValues:       []string{"articles", "bob"},
			},
		},
	},
	{
		Path: "/articles/test",
		ExpectedMatches: []Match{
			{
				RegisteredPattern: &RegisteredPattern{normalizedPattern: "/*"},
				SplatValues:       []string{"articles", "test"},
			},
		},
	},
	{
		Path: "/articles/test/articles",
		ExpectedMatches: []Match{
			{
				RegisteredPattern: &RegisteredPattern{normalizedPattern: "/articles/test/articles/"},
			},
		},
	},
	{
		Path: "/dynamic-index/index",
		ExpectedMatches: []Match{
			{
				// no underscore prefix, so not really an index!
				RegisteredPattern: &RegisteredPattern{normalizedPattern: "/dynamic-index/index"},
			},
		},
	},
}

func TestFindAllMatches(t *testing.T) {
	for _, opts := range differentOptsToTest {
		m := New(opts)

		for _, p := range modifyPatternsToOpts(NestedPatterns, "_index", opts) {
			m.RegisterPattern(p)
		}

		for _, tc := range NestedScenarios {
			t.Run(tc.Path, func(t *testing.T) {
				results, ok := m.FindNestedMatches(tc.Path)
				actualMatches := results.Matches

				var errors []string

				// Check if there's a failure
				expectedCount := len(tc.ExpectedMatches)
				actualCount := len(actualMatches)

				fail := (!ok && expectedCount > 0) || (expectedCount != actualCount)

				// Compare each matched pattern
				for i := range max(expectedCount, actualCount) {
					if i < expectedCount && i < actualCount {
						expected := tc.ExpectedMatches[i]
						actual := actualMatches[i]

						// ---- Use helper functions to compare maps/slices ----
						if expected.normalizedPattern != actual.normalizedPattern ||
							!equalParams(expected.Params, actual.Params) ||
							!equalSplat(expected.SplatValues, actual.SplatValues) {
							fail = true
							break
						}
					} else {
						fail = true
						break
					}
				}

				// Only output errors if a failure occurred
				if fail {
					errors = append(errors, fmt.Sprintf("\n===== Path: %q =====", tc.Path))

					// Expected matches exist but got none
					if !ok && expectedCount > 0 {
						errors = append(errors, "Expected matches but got none.")
					}

					// Length mismatch
					if expectedCount != actualCount {
						errors = append(errors, fmt.Sprintf("Expected %d matches, got %d", expectedCount, actualCount))
					}

					// Always output all expected and actual matches for debugging
					errors = append(errors, "Expected Matches:")
					for i, expected := range tc.ExpectedMatches {
						errors = append(errors, fmt.Sprintf(
							"  [%d] {Pattern: %q, Params: %v, SplatValues: %v}",
							i, expected.normalizedPattern, expected.Params, expected.SplatValues,
						))
					}

					errors = append(errors, "Actual Matches:")
					for i, actual := range actualMatches {
						errors = append(errors, fmt.Sprintf(
							"  [%d] {Pattern: %q, Params: %v, SplatValues: %v}",
							i, actual.normalizedPattern, actual.Params, actual.SplatValues,
						))
					}

					// Detailed mismatches
					for i := range max(expectedCount, actualCount) {
						if i < expectedCount && i < actualCount {
							expected := tc.ExpectedMatches[i]
							actual := actualMatches[i]

							if expected.normalizedPattern != actual.normalizedPattern ||
								!equalParams(expected.Params, actual.Params) ||
								!equalSplat(expected.SplatValues, actual.SplatValues) {
								errors = append(errors, fmt.Sprintf(
									"Match %d mismatch:\n  Expected: {Pattern: %q, Params: %v, SplatValues: %v}\n  Got:      {Pattern: %q, Params: %v, SplatValues: %v}",
									i,
									expected.normalizedPattern, expected.Params, expected.SplatValues,
									actual.normalizedPattern, actual.Params, actual.SplatValues,
								))
							}
						} else if i < expectedCount {
							// Missing expected match
							expected := tc.ExpectedMatches[i]
							errors = append(errors, fmt.Sprintf(
								"Missing expected match %d: {Pattern: %q, Params: %v, SplatValues: %v}",
								i, expected.normalizedPattern, expected.Params, expected.SplatValues,
							))
						} else {
							// Unexpected extra match
							actual := actualMatches[i]
							errors = append(errors, fmt.Sprintf(
								"Unexpected extra match %d: {Pattern: %q, Params: %v, SplatValues: %v}",
								i, actual.normalizedPattern, actual.Params, actual.SplatValues,
							))
						}
					}

					// Print only if something went wrong
					t.Error(strings.Join(errors, "\n"))
				}
			})
		}
	}
}

// ---------------------------------------------------------------------------
// Helper functions to treat nil maps/slices as empty, avoiding false mismatches
// ---------------------------------------------------------------------------

func equalParams(a, b Params) bool {
	// Consider nil and empty as the same
	if len(a) == 0 && len(b) == 0 {
		return true
	}
	return reflect.DeepEqual(a, b)
}

func equalSplat(a, b []string) bool {
	// Consider nil and empty slice as the same
	if len(a) == 0 && len(b) == 0 {
		return true
	}
	return reflect.DeepEqual(a, b)
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func modifyPatternsToOpts(incomingPatterns []string, incomingIndexSegment string, opts_ *Options) []string {
	opts := mungeOptsToDefaults(opts_)

	m := New(&Options{ExplicitIndexSegment: incomingIndexSegment, Quiet: true})

	rps := make([]*RegisteredPattern, len(incomingPatterns))
	for i, p := range incomingPatterns {
		rps[i] = m.NormalizePattern(p)
	}

	newPatterns := make([]string, 0, len(rps))

	for _, rp := range rps {
		var sb strings.Builder

		for _, seg := range rp.normalizedSegments {
			sb.WriteString("/")
			if seg.segType == segTypes.static {
				sb.WriteString(seg.normalizedVal)
			} else if seg.segType == segTypes.dynamic {
				sb.WriteString(string(opts.DynamicParamPrefixRune))
				sb.WriteString(seg.normalizedVal[1:])
			} else if seg.segType == segTypes.splat {
				sb.WriteString(string(opts.SplatSegmentRune))
			} else if seg.segType == segTypes.index {
				sb.WriteString(string(opts.ExplicitIndexSegment))
			}
		}

		newPatterns = append(newPatterns, sb.String())
	}

	return newPatterns
}

/////////////////////////////////////////////////////////////////////
/////// BENCHMARKS
/////////////////////////////////////////////////////////////////////

func setupNestedMatcherForBenchmark() *Matcher {
	m := New(&Options{Quiet: true})

	for _, pattern := range NestedPatterns {
		m.RegisterPattern(pattern)
	}
	return m
}

func generateNestedPathsForBenchmark() []string {
	return []string{
		"/",                                   // Root index
		"/dashboard",                          // Static path with index
		"/dashboard/customers",                // Nested static path
		"/dashboard/customers/123",            // Path with params
		"/dashboard/customers/123/orders",     // Deep nested path
		"/dashboard/customers/123/orders/456", // Deep nested path with multiple params
		"/tiger",                              // Another static path
		"/tiger/123",                          // Dynamic path
		"/tiger/123/456",                      // Dynamic path with multiple params
		"/tiger/123/456/789",                  // Path with splat
		"/bear/123/456/789",                   // Different path with splat
		"/articles/test/articles",             // Deeply nested static path
		"/does-not-exist",                     // Non-existent path (tests splat handling)
		"/dashboard/unknown/path",             // Tests dashboard splat path
	}
}

func BenchmarkFindNestedMatches(b *testing.B) {
	cases := []struct {
		name     string
		pathType string
		paths    []string
	}{
		{
			name:     "StaticPatterns",
			pathType: "static",
			paths:    []string{"/", "/dashboard", "/dashboard/customers", "/tiger", "/lion"},
		},
		{
			name:     "DynamicPatterns",
			pathType: "dynamic",
			paths: []string{
				"/dashboard/customers/123",
				"/dashboard/customers/456/orders",
				"/tiger/123",
				"/bear/123",
			},
		},
		{
			name:     "DeepNestedPatterns",
			pathType: "deep",
			paths: []string{
				"/dashboard/customers/123/orders/456",
				"/tiger/123/456/789",
				"/bear/123/456/789",
				"/articles/test/articles",
			},
		},
		{
			name:     "SplatPatterns",
			pathType: "splat",
			paths: []string{
				"/does-not-exist",
				"/dashboard/unknown/path",
				"/tiger/123/456/789/extra",
				"/bear/123/456/789/extra",
			},
		},
		{
			name:     "MixedPatterns",
			pathType: "mixed",
			paths:    generateNestedPathsForBenchmark(),
		},
	}

	for _, tc := range cases {
		b.Run(tc.name, func(b *testing.B) {
			m := setupNestedMatcherForBenchmark()
			b.ReportAllocs()
			for i := 0; i < b.N; i++ {
				path := tc.paths[i%len(tc.paths)]
				matches, _ := m.FindNestedMatches(path)
				runtime.KeepAlive(matches)
			}
		})
	}
}
