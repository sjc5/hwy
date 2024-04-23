package build

import (
	hwy "github.com/sjc5/hwy-go"
)

func RunHwyBuild(isDev bool) error {
	return hwy.Build(hwy.BuildOptions{
		IsDev:           isDev,
		ClientEntry:     "entry.client.tsx",
		PagesSrcDir:     "pages",
		HashedOutDir:    "static/public/__nohash",
		UnhashedOutDir:  "static/private",
		ClientEntryOut:  "static/public",
		UsePreactCompat: true,
	})
}
