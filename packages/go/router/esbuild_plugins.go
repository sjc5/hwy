package router

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	esbuild "github.com/evanw/esbuild/pkg/api"
)

func CreateCSSURLFuncResolverPlugin(resolverFunc func(string) string) esbuild.Plugin {
	return esbuild.Plugin{
		Name: "hwy.CreateCSSURLFuncResolverPlugin",
		Setup: func(build esbuild.PluginBuild) {
			build.OnResolve(
				esbuild.OnResolveOptions{Filter: `.*`},
				func(args esbuild.OnResolveArgs) (esbuild.OnResolveResult, error) {
					if args.Kind != esbuild.ResolveCSSURLToken {
						return esbuild.OnResolveResult{}, nil
					}

					return esbuild.OnResolveResult{
						Path:     resolverFunc(args.Path),
						External: true,
					}, nil
				},
			)
		},
	}
}

func CreatePublicURLResolverPlugin(
	placeholderFuncName string,
	resolverFunc func(string) string,
) esbuild.Plugin {
	var extToLoader = map[string]esbuild.Loader{
		".js":  esbuild.LoaderJS,
		".ts":  esbuild.LoaderTS,
		".jsx": esbuild.LoaderJSX,
		".tsx": esbuild.LoaderTSX,
	}

	publicURLResolverRegex := regexp.MustCompile(
		fmt.Sprintf(
			`%s\((\"[^\"]*\"|'[^']*'|`+"`[^`]*`"+`)\)`,
			placeholderFuncName,
		),
	)

	return esbuild.Plugin{
		Name: "hwy.CreatePublicURLResolverPlugin__" + placeholderFuncName,
		Setup: func(build esbuild.PluginBuild) {
			build.OnLoad(esbuild.OnLoadOptions{Filter: `.js$|.ts$|.jsx$|.tsx$`},
				func(args esbuild.OnLoadArgs) (esbuild.OnLoadResult, error) {
					data, err := os.ReadFile(args.Path)
					if err != nil {
						return esbuild.OnLoadResult{}, err
					}

					oldContents := string(data)
					revised := false

					newContents := publicURLResolverRegex.ReplaceAllStringFunc(oldContents, func(match string) string {
						submatches := publicURLResolverRegex.FindStringSubmatch(match)[1]

						cleanedURL := strings.TrimSpace(strings.Trim(submatches, "\"'`"))
						resolved := resolverFunc(cleanedURL)
						if resolved == cleanedURL {
							return match
						}

						revised = true
						return fmt.Sprintf(`"%s"`, resolved)
					})

					if !revised || newContents == oldContents {
						return esbuild.OnLoadResult{}, nil
					}

					res := esbuild.OnLoadResult{
						Contents: &newContents,
						Loader:   extToLoader[filepath.Ext(args.Path)],
					}

					return res, nil
				})
		},
	}
}
