package main

import (
	"hwy-docs/internal/build"
	"hwy-docs/internal/platform"

	"github.com/sjc5/kiruna"
)

func main() {
	err := build.GenerateTypeScript(true)
	if err != nil {
		panic(err)
	}

	err = build.RunHwyBuild(true)
	if err != nil {
		panic(err)
	}

	platform.Kiruna.MustStartDev(&kiruna.DevConfig{
		HealthcheckEndpoint: "/healthz",
		IgnorePatterns: kiruna.IgnorePatterns{
			Dirs: []string{"__generated_ts_api"},
		},
		WatchedFiles: kiruna.WatchedFiles{
			goWatchedFile,
			tsWatchedFile,
			markdownWatchedFile,
			{Pattern: "**/*.go.html"},
		},
	})
}

var goWatchedFile = kiruna.WatchedFile{
	Pattern: "**/*.go",
	OnChangeCallbacks: []kiruna.OnChange{{
		Func: func(s string) error {
			return build.GenerateTypeScript(true)
		},
		Strategy: kiruna.OnChangeStrategyConcurrent,
	}},
}

var tsWatchedFile = kiruna.WatchedFile{
	Pattern: "**/*.{ts,tsx}",
	OnChangeCallbacks: []kiruna.OnChange{{
		Func: func(path string) error {
			return build.RunHwyBuild(true)
		}},
	},
	RestartApp: true,
}

var markdownWatchedFile = kiruna.WatchedFile{
	Pattern:    "**/*.md",
	RestartApp: true,
}
