package main

import (
	root "hwy-docs"
	"hwy-docs/internal/build"
)

func main() {
	// Generate TS
	err := build.GenerateTS(false)
	if err != nil {
		panic(err)
	}

	// Build HWY (esbuild, tsx, etc)
	err = build.RunHwyBuild(false)
	if err != nil {
		panic(err)
	}

	// Build Kiruna (static assets)
	err = root.Kiruna.BuildWithoutCompilingGo()
	if err != nil {
		panic(err)
	}
}
