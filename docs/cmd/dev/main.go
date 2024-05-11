package main

import (
	"fmt"

	root "hwy-docs"
	"hwy-docs/internal/build"
	"hwy-docs/internal/platform"

	"github.com/sjc5/kiruna"
)

func main() {
	err := build.GenerateTS(true)
	if err != nil {
		panic(err)
	}

	err = build.RunHwyBuild(true)
	if err != nil {
		panic(err)
	}

	root.Kiruna.MustStartDev(&kiruna.DevConfig{
		HealthcheckURL: fmt.Sprintf("http://localhost:%d/healthz", platform.GetEnv().Port),
		IgnoreDirs: []string{
			"dist",
			"node_modules",
			".git",
			"__generated_ts_api",
		},
		WatchedFiles: kiruna.WatchedFiles{
			".go":      goWatchedFile,
			".ts":      tsWatchedFile,
			".tsx":     tsWatchedFile,
			".md":      {RestartApp: true},
			".go.html": {},
		},
	})
}

var goWatchedFile = kiruna.WatchedFile{
	OnChangeCallbacks: []kiruna.OnChange{{
		Func: func(s string) error {
			return build.GenerateTS(true)
		},
		Strategy: kiruna.OnChangeStrategyConcurrent,
	}},
}

var tsWatchedFile = kiruna.WatchedFile{
	OnChangeCallbacks: []kiruna.OnChange{{
		Func: func(path string) error {
			return build.RunHwyBuild(true)
		}},
	},
	RestartApp: true,
}
