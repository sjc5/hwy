package main

import (
	"fmt"
	"hwy-go-tester/internal/platform"
	"os"

	"github.com/sjc5/hwy"
	"github.com/sjc5/kiruna"
)

func main() {
	os.Setenv("PORT", "7778")

	buildHwy("")

	DevConfig := kiruna.DevConfig{
		HealthcheckEndpoint: "/",
		WatchedFiles: kiruna.WatchedFiles{
			tsWatchedFile,
			{Pattern: "**/*.go.html"},
		},
	}
	platform.Kiruna.MustStartDev(&DevConfig)
}

var tsWatchedFile = kiruna.WatchedFile{
	Pattern:           "**/*.{ts,tsx}",
	OnChangeCallbacks: []kiruna.OnChange{{Func: buildHwy}},
	RestartApp:        true,
}

func buildHwy(path string) error {
	err := hwy.Build(hwy.BuildOptions{
		IsDev:          true,
		ClientEntry:    "entry.client.tsx",
		PagesSrcDir:    "pages",
		HashedOutDir:   "static/public/__nohash",
		UnhashedOutDir: "static/private",
		ClientEntryOut: "static/public",
	})
	if err != nil {
		fmt.Println(err)
		return err
	}
	return nil
}
