package framework

import (
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"os/exec"
	"path/filepath"
	"slices"
	"strings"
	"time"

	esbuild "github.com/evanw/esbuild/pkg/api"
	"github.com/sjc5/river/kiruna"
	"github.com/sjc5/river/kit/esbuildutil"
	"github.com/sjc5/river/kit/id"
	"github.com/sjc5/river/kit/matcher"
	"github.com/sjc5/river/kit/stringsutil"
	"github.com/sjc5/river/kit/viteutil"
)

const (
	riverPrehashedFilePrefix        = "river_vite_"
	RiverPathsStageOneJSONFileName  = "river_paths_stage_1.json"
	RiverPathsStageTwoJSONFileName  = "river_paths_stage_2.json"
	RiverViteConfigHelperTSFileName = "river_vite_config_helper.ts"
)

type PathsFile struct {
	// both stages one and two
	Stage          string           `json:"stage"`
	BuildID        string           `json:"buildID"`
	ClientEntrySrc string           `json:"clientEntrySrc"`
	Paths          map[string]*Path `json:"paths"`

	// stage two only
	ClientEntryOut    string            `json:"clientEntryOut,omitempty"`
	ClientEntryDeps   []string          `json:"clientEntryDeps,omitempty"`
	DepToCSSBundleMap map[string]string `json:"depToCSSBundleMap,omitempty"`
}

func (h *River[C]) writePathsToDisk_StageOne() error {
	pathsJSONOut_StageOne := filepath.Join(h.Kiruna.GetPrivateStaticDir(), RiverPathsStageOneJSONFileName)
	err := os.MkdirAll(filepath.Dir(pathsJSONOut_StageOne), os.ModePerm)
	if err != nil {
		return err
	}

	pathsAsJSON, err := json.MarshalIndent(PathsFile{
		Stage:          "one",
		Paths:          h._paths,
		ClientEntrySrc: h.ClientEntry,
		BuildID:        h._buildID,
	}, "", "\t")
	if err != nil {
		return err
	}

	err = os.WriteFile(pathsJSONOut_StageOne, pathsAsJSON, os.ModePerm)
	if err != nil {
		return err
	}

	return nil
}

// 0 = func name, 1,2 = backtick literal, 3 = public dir, 4 = backtick literal
const vitePluginTemplateStr = `
export function riverVitePlugin(): Plugin {
	return {
		name: "river-vite-plugin",
		config(c) {
			return { ...c, build: { ...c.build, rollupOptions } };
		},
		transform(code, id) {
			const isNodeModules = /node_modules/.test(id);
			if (isNodeModules) return null;
			const assetRegex = /%s\s*\(\s*(["'%s])(.*?)\1\s*\)/g;
			const needsReplacement = assetRegex.test(code);
			if (!needsReplacement) return null;
			const replacedCode = code.replace(assetRegex, (original, _, _assetPath) => {
				let assetPath = _assetPath;
				if (assetPath.startsWith("/")) {
					assetPath = assetPath.slice(1);
				}
				const hashed = (publicFileMap as any)[assetPath];
				if (!hashed) return original;
				return %s"/%s/${hashed}"%s;
			});
			if (replacedCode === code) return null;
			return replacedCode;
		},
	};
}
`

func (h *River[C]) toRollupOptions(entrypoints []string, fileMap map[string]string) (string, error) {
	var sb stringsutil.Builder

	sb.Line("import type { Plugin } from \"vite\";")
	sb.Return()

	sb.Line("const rollupOptions = {")
	sb.Tab().Line("input: [")
	for i, entrypoint := range entrypoints {
		if i > 0 {
			sb.Write(",").Return()
		}
		sb.Tab().Tab().Writef(`"%s"`, entrypoint)
	}
	sb.Line(",")
	sb.Tab().Line("] as string[],")
	sb.Tab().Line(`preserveEntrySignatures: "exports-only",`)
	sb.Tab().Line("output: {")
	sb.Tab().Tab().Line(`assetFileNames: "` + riverPrehashedFilePrefix + `[name]-[hash][extname]",`)
	sb.Tab().Tab().Line(`chunkFileNames: "` + riverPrehashedFilePrefix + `[name]-[hash].js",`)
	sb.Tab().Tab().Line(`entryFileNames: "` + riverPrehashedFilePrefix + `[name]-[hash].js",`)
	sb.Tab().Line("},")
	sb.Line("} as const;")

	sb.Return()
	sb.Write("const publicFileMap = ")
	mapAsJSON, err := json.MarshalIndent(fileMap, "", "\t")
	if err != nil {
		return "", fmt.Errorf("error marshalling map to JSON: %v", err)
	}
	sb.Line(string(mapAsJSON) + ";")

	publicPrefixToUse := filepath.Clean(h.PublicPrefix)
	publicPrefixToUse = matcher.StripLeadingSlash(publicPrefixToUse)
	publicPrefixToUse = matcher.StripTrailingSlash(publicPrefixToUse)
	tick := "`"
	sb.Write(fmt.Sprintf(vitePluginTemplateStr, h.PublicURLFuncName, tick, tick, publicPrefixToUse, tick))

	return sb.String(), nil
}

func (h *River[C]) handleViteConfigHelper() error {
	entrypoints := h.getEntrypoints()

	publicFileMap, err := h.Kiruna.GetSimplePublicFileMapBuildtime()
	if err != nil {
		Log.Error(fmt.Sprintf("HandleEntrypoints: error getting public file map: %s", err))
		return err
	}

	rollupOptions, err := h.toRollupOptions(entrypoints, publicFileMap)
	if err != nil {
		Log.Error(fmt.Sprintf("HandleEntrypoints: error converting entrypoints to rollup options: %s", err))
		return err
	}

	target := filepath.Join(".", h.VitePluginOutpath)

	err = os.MkdirAll(filepath.Dir(target), os.ModePerm)
	if err != nil {
		Log.Error(fmt.Sprintf("HandleEntrypoints: error creating directory: %s", err))
		return err
	}

	if err = os.WriteFile(target, []byte(rollupOptions), os.ModePerm); err != nil {
		Log.Error(fmt.Sprintf("HandleEntrypoints: error writing entrypoints to disk: %s", err))
		return err
	}

	return nil
}

var nodeScript = `
const path = await import("node:path");
const importPath = path.resolve(".", process.argv.slice(1)[0]);
const routesFile = await import(importPath);
console.log(JSON.stringify(routesFile.default.__all_routes()));
`

type NodeScriptResultItem struct {
	Pattern string `json:"p"`
	Module  string `json:"m"`
	Key     string `json:"k"`
}

type NodeScriptResult []NodeScriptResultItem

func (h *River[C]) Build(isDev bool) error {
	h.mu.Lock()
	defer h.mu.Unlock()

	h._isDev = isDev

	startTime := time.Now()

	buildID, err := id.New(16)
	if err != nil {
		Log.Error(fmt.Sprintf("error generating random ID: %s", err))
		return err
	}
	Log.Info("Starting new River build", "buildID", buildID)
	h._buildID = buildID

	esbuildResult := esbuild.Build(esbuild.BuildOptions{
		EntryPoints: []string{h.ClientRoutesFile},
		Bundle:      false,
		Write:       false,
		Format:      esbuild.FormatESModule,
		Platform:    esbuild.PlatformNode,
		Metafile:    true,
	})
	if err := esbuildutil.CollectErrors(esbuildResult); err != nil {
		Log.Error(fmt.Sprintf("esbuild errors: %s", err))
		return err
	}

	metafile, err := esbuildutil.UnmarshalOutput(esbuildResult)
	if err != nil {
		Log.Error(fmt.Sprintf("error unmarshalling esbuild output: %s", err))
		return err
	}

	importsUnfiltered := metafile.Outputs["routes.js"].Imports
	var imports []string
	for _, imp := range importsUnfiltered {
		if imp.Kind != esbuildutil.KindDymanicImport {
			continue
		}
		imports = append(imports, imp.Path)
	}

	tempDirName, err := os.MkdirTemp(".", "river-build")
	if err != nil {
		Log.Error(fmt.Sprintf("error creating temp dir: %s", err))
		return err
	}
	defer os.RemoveAll(tempDirName)

	code := string(esbuildResult.OutputFiles[0].Contents)

	code = `function RoutesBuilder() {
	const routes = [];
	const Component = (x) => x;
	function Register(pattern, component) {
		routes.push({
			p: pattern,
			m: component.module,
			k: component.export ?? "default",
		});
	}
	return { Register, Component, __all_routes: () => routes };
}
const routes = RoutesBuilder();
` + code

	routesSrcFile := filepath.Join(".", h.ClientRoutesFile)
	routesDir := filepath.Dir(routesSrcFile)

	for _, imp := range imports {
		doubleQuotes := fmt.Sprintf(`import("%s")`, imp)
		singleQuotes := fmt.Sprintf("import('%s')", imp)
		backticks := fmt.Sprintf("import(`%s`)", imp)
		replacement := fmt.Sprintf(`"%s"`, filepath.Join(routesDir, imp))
		code = strings.ReplaceAll(code, doubleQuotes, replacement)
		code = strings.ReplaceAll(code, singleQuotes, replacement)
		code = strings.ReplaceAll(code, backticks, replacement)
	}

	location := filepath.Join(".", tempDirName, "routes.js")
	err = os.MkdirAll(filepath.Dir(location), os.ModePerm)
	if err != nil {
		Log.Error(fmt.Sprintf("error creating directory: %s", err))
		return err
	}
	err = os.WriteFile(location, []byte(code), os.ModePerm)
	if err != nil {
		Log.Error(fmt.Sprintf("error writing file to disk: %s", err))
		return err
	}

	cmd := exec.Command("node", "--input-type=module", "-e", nodeScript)
	cmd.Args = append(cmd.Args, location)

	output, err := cmd.Output()
	if err != nil {
		Log.Error(fmt.Sprintf("error running node script: %s | output: %s", err, string(output)))
		return err
	}

	var nodeScriptResult NodeScriptResult
	if err := json.Unmarshal(output, &nodeScriptResult); err != nil {
		Log.Error(fmt.Sprintf("error unmarshalling node script output: %s", err))
	}

	Log.Info("Interpreted TypeScript route definitions",
		"src", h.ClientRoutesFile,
		"found", len(nodeScriptResult),
		"duration", time.Since(startTime),
	)

	h._paths = make(map[string]*Path)

	for _, item := range nodeScriptResult {
		h._paths[item.Pattern] = &Path{Pattern: item.Pattern, SrcPath: item.Module, ExportKey: item.Key}
	}

	if err = h.writePathsToDisk_StageOne(); err != nil {
		Log.Error(fmt.Sprintf("error writing paths to disk: %s", err))
		return err
	}

	// Remove all files in StaticPublicOutDir starting with riverChunkPrefix or riverEntryPrefix.
	err = cleanStaticPublicOutDir(h.toStaticPublicOutDir())
	if err != nil {
		Log.Error(fmt.Sprintf("error cleaning static public out dir: %s", err))
		return err
	}

	if err = h.handleViteConfigHelper(); err != nil {
		// already logged internally in handleViteConfigHelper
		return err
	}

	return nil
}

func (h *River[C]) toStaticPublicOutDir() string {
	return filepath.Join(h.Kiruna.GetPublicStaticDir(), kiruna.PrehashedDirname)
}

func (h *River[C]) getViteDevURL() string {
	if !h._isDev {
		return ""
	}
	return fmt.Sprintf("http://localhost:%s", viteutil.GetVitePortStr())
}

/////////////////////////////////////////////////////////////////////
/////// CLEAN STATIC PUBLIC OUT DIR
/////////////////////////////////////////////////////////////////////

func cleanStaticPublicOutDir(staticPublicOutDir string) error {
	fileInfo, err := os.Stat(staticPublicOutDir)
	if err != nil {
		if os.IsNotExist(err) {
			Log.Warn(fmt.Sprintf("static public out dir does not exist: %s", staticPublicOutDir))
			return nil
		}
		return err
	}

	if !fileInfo.IsDir() {
		errMsg := fmt.Sprintf("%s is not a directory", staticPublicOutDir)
		Log.Error(errMsg)
		return errors.New(errMsg)
	}

	// delete the ".vite" directory
	err = os.RemoveAll(filepath.Join(staticPublicOutDir, ".vite"))
	if err != nil {
		errMsg := fmt.Sprintf("error removing .vite directory: %s", err)
		Log.Error(errMsg)
		return errors.New(errMsg)
	}

	// delete all files starting with riverPrehashedFilePrefix
	err = filepath.Walk(staticPublicOutDir, func(path string, info fs.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if strings.HasPrefix(filepath.Base(path), riverPrehashedFilePrefix) {
			err = os.Remove(path)
			if err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return err
	}

	return nil
}

/////////////////////////////////////////////////////////////////////
/////// GET ENTRYPOINTS
/////////////////////////////////////////////////////////////////////

func (h *River[C]) getEntrypoints() []string {
	entryPoints := make(map[string]struct{}, len(h._paths)+1)
	entryPoints[h.ClientEntry] = struct{}{}
	for _, path := range h._paths {
		if path.SrcPath != "" {
			entryPoints[path.SrcPath] = struct{}{}
		}
	}
	keys := make([]string, 0, len(entryPoints))
	for key := range entryPoints {
		keys = append(keys, key)
	}
	slices.SortStableFunc(keys, strings.Compare)
	return keys
}

/////////////////////////////////////////////////////////////////////
/////// TO PATHS FILE -- STAGE TWO
/////////////////////////////////////////////////////////////////////

func (h *River[C]) toPathsFile_StageTwo() (*PathsFile, error) {
	riverClientEntry := ""
	riverClientEntryDeps := []string{}
	depToCSSBundleMap := make(map[string]string)

	viteManifest, err := viteutil.ReadManifest(filepath.Join(h.toStaticPublicOutDir(), ".vite", "manifest.json"))
	if err != nil {
		Log.Error(fmt.Sprintf("error reading vite manifest: %s", err))
		return nil, err
	}

	// Assuming manifestJSON is your Vite manifest
	for key, chunk := range viteManifest {
		cleanKey := filepath.Base(chunk.File)

		// Handle CSS bundles
		// In Vite, CSS is handled through the CSS array
		if len(chunk.CSS) > 0 {
			for _, cssFile := range chunk.CSS {
				depToCSSBundleMap[cleanKey] = filepath.Base(cssFile)
			}
		}

		// Get dependencies
		deps := viteutil.FindAllDependencies(viteManifest, key)

		// Handle client entry
		if chunk.IsEntry && h.ClientEntry == chunk.Src {
			riverClientEntry = cleanKey
			depsWithoutClientEntry := make([]string, 0, len(deps)-1)
			for _, dep := range deps {
				if dep != riverClientEntry {
					depsWithoutClientEntry = append(depsWithoutClientEntry, dep)
				}
			}
			riverClientEntryDeps = depsWithoutClientEntry
		} else {
			// Handle other paths
			for i, path := range h._paths {
				// Compare with source path instead of entryPoint
				if path.SrcPath == chunk.Src {
					h._paths[i].OutPath = cleanKey
					h._paths[i].Deps = deps
				}
			}
		}
	}

	return &PathsFile{
		Stage:             "two",
		DepToCSSBundleMap: depToCSSBundleMap,
		Paths:             h._paths,
		ClientEntrySrc:    h.ClientEntry,
		ClientEntryOut:    riverClientEntry,
		ClientEntryDeps:   riverClientEntryDeps,
		BuildID:           h._buildID,
	}, nil
}
