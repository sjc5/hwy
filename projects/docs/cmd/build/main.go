package main

import (
	"fmt"
	"hwy-docs/internal/build"
	"hwy-docs/internal/platform"
)

func main() {
	fmt.Println("Building...")

	// Generate TS
	err := build.GenerateTypeScript()
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
