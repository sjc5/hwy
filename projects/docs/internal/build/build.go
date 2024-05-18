package build

import (
	"hwy-docs/internal/datafuncsmap"

	"github.com/sjc5/hwy"
)

func getHwyBuildOptions(isDev bool) hwy.BuildOptions {
	return hwy.BuildOptions{
		IsDev:             isDev,
		ClientEntry:       "entry.client.tsx",
		PagesSrcDir:       "pages",
		HashedOutDir:      "static/public/__nohash",
		UnhashedOutDir:    "static/private",
		ClientEntryOut:    "static/public",
		UsePreactCompat:   true,
		GeneratedTSOutDir: "__generated_ts_api",
		DataFuncsMap:      datafuncsmap.DataFuncsMap,
	}
}

func GenerateTypeScript(isDev bool) error {
	return hwy.GenerateTypeScript(getHwyBuildOptions(isDev))
}

func RunHwyBuild(isDev bool) error {
	return hwy.Build(getHwyBuildOptions(isDev))
}
