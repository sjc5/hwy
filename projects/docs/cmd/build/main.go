package main

import (
	"hwy-docs/internal/build"
	"hwy-docs/internal/platform"
)

func main() {
	// Generate TS
	err := build.GenerateTypeScript(false)
	if err != nil {
		panic(err)
	}

	// Build HWY (esbuild, tsx, etc)
	err = build.RunHwyBuild(false)
	if err != nil {
		panic(err)
	}

	// Build Kiruna (static assets)
	err = platform.Kiruna.BuildWithoutCompilingGo()
	if err != nil {
		panic(err)
	}
}
