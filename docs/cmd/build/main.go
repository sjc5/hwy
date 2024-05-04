package main

import (
	root "hwy-docs"
	"hwy-docs/internal/build"
)

func main() {
	build.RunHwyBuild(false)
	root.Kiruna.BuildWithoutCompilingGo()
}
