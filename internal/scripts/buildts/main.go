package main

import (
	"fmt"
	"log"
	"os"
	"os/exec"
	"strings"

	esbuild "github.com/evanw/esbuild/pkg/api"
)

var targetDir = "./npm_dist"

var tsConfigs = []string{
	"./internal/framework/_typescript/client/tsconfig.json",
	"./internal/framework/_typescript/react/tsconfig.json",
	"./internal/framework/_typescript/solid/tsconfig.json",
	"./kit/_typescript/tsconfig.json",
}

func main() {
	if err := os.RemoveAll(targetDir); err != nil {
		log.Fatalf("failed to remove target dir: %v", err)
	}

	if err := os.MkdirAll(targetDir, 0755); err != nil {
		log.Fatalf("failed to create target dir: %v", err)
	}

	fmtStr := "pnpm tsc" +
		" --project %s" +
		" --declaration" +
		" --emitDeclarationOnly" +
		" --outDir ./npm_dist" +
		" --noEmit false" +
		" --rootDir ./" +
		" --sourceMap" +
		" --declarationMap"

	for _, tsConfig := range tsConfigs {
		cmdStr := fmt.Sprintf(fmtStr, tsConfig)
		log.Printf("running command: %s", cmdStr)
		fields := strings.Fields(cmdStr)
		cmd := exec.Command(fields[0], fields[1:]...)
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr
		if err := cmd.Run(); err != nil {
			log.Fatalf("failed to run command: %v", err)
		}
	}

	log.Println("tsc succeeded")

	opts := esbuild.BuildOptions{
		Sourcemap:   esbuild.SourceMapLinked,
		Target:      esbuild.ESNext,
		Format:      esbuild.FormatESModule,
		TreeShaking: esbuild.TreeShakingTrue,
		Splitting:   true,
		Write:       true,
		Bundle:      true,
		EntryPoints: []string{
			"./internal/framework/_typescript/client/index.ts",
			"./internal/framework/_typescript/react/index.tsx",
			"./internal/framework/_typescript/solid/index.tsx",
			"./kit/_typescript/converters/converters.ts",
			"./kit/_typescript/debounce/debounce.ts",
			"./kit/_typescript/fmt/fmt.ts",
			"./kit/_typescript/json/json.ts",
			"./kit/_typescript/listeners/listeners.ts",
			"./kit/_typescript/theme/theme.ts",
			"./kit/_typescript/url/url.ts",
		},
		External: []string{
			"jotai",
			"solid-js",
			"react",
			"react-dom",
			"preact",
		},
		Outdir: "./npm_dist",
	}

	result := esbuild.Build(opts)

	if len(result.Errors) > 0 {
		for _, err := range result.Errors {
			println(err.Text)
		}
		log.Fatalf("esbuild failed")
	}

	if len(result.Warnings) > 0 {
		for _, warn := range result.Warnings {
			println(warn.Text)
		}
		log.Fatalf("esbuild had warnings")
	}

	log.Println("esbuild succeeded")
}
