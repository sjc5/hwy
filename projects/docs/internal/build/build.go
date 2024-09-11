package build

import (
	"hwy-docs/internal/datafuncsmap"

	"github.com/sjc5/hwy"
)

var dataFuncs = hwy.DataFuncs{
	Loaders:      datafuncsmap.Loaders,
	QueryActions: datafuncsmap.QueryActions,
}

func GenerateTypeScript() error {
	return hwy.GenerateTypeScript(&hwy.TSGenOptions{
		GeneratedTSOutDir: "__generated_ts_api",
		DataFuncs:         dataFuncs,
	})
}

func RunHwyBuild(isDev bool) error {
	return hwy.Build(&hwy.BuildOptions{
		// inputs
		IsDev:           isDev,
		ClientEntry:     "entry.client.tsx",
		PagesSrcDir:     "pages",
		DataFuncs:       dataFuncs,
		UsePreactCompat: true,

		// outputs
		HashedOutDir:   "static/public/__nohash",
		UnhashedOutDir: "static/private",
	})
}
