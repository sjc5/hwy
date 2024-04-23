package main

import (
	"fmt"

	root "github.com/sjc5/hwy-go-tester"
	"github.com/sjc5/hwy-go-tester/internal/build"
	"github.com/sjc5/hwy-go-tester/internal/platform"
	"github.com/sjc5/kiruna"
)

func main() {
	build.RunHwyBuild(true)

	DevConfig := kiruna.DevConfig{
		HealthcheckURL: fmt.Sprintf("http://localhost:%d/healthz", platform.GetEnv().Port),
		IgnoreDirs:     []string{"node_modules", ".git"},
		WatchedFiles: kiruna.WatchedFiles{
			".ts":      tsWatchedFile,
			".tsx":     tsWatchedFile,
			".go.html": {},
			".md":      {RestartApp: true},
		},
	}
	root.Kiruna.Dev(&DevConfig)
}

var tsWatchedFile = kiruna.WatchedFile{
	OnChangeCallbacks: []kiruna.OnChange{{
		Func: func(path string) error {
			return build.RunHwyBuild(true)
		}},
	},
	RestartApp: true,
}
