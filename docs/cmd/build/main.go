package main

import (
	root "github.com/sjc5/hwy-go-tester"
	"github.com/sjc5/hwy-go-tester/internal/build"
)

func main() {
	build.RunHwyBuild(false)
	root.Kiruna.MustBuildWithoutCompilingGo()
}
