package hi

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
	"github.com/sjc5/river/x/kit/esbuildutil"
	"github.com/sjc5/river/x/kit/id"
	"github.com/sjc5/river/x/kit/stringsutil"
	"github.com/sjc5/river/x/kit/viteutil"
)

const (
	hwyPrehashedFilePrefix        = "hwy_vite_"
	HwyPathsStageOneJSONFileName  = "hwy_paths_stage_1.json"
	HwyPathsStageTwoJSONFileName  = "hwy_paths_stage_2.json"
	HwyViteConfigHelperTSFileName = "hwy_vite_config_helper.ts"
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

func (h *Hwy[C]) writePathsToDisk_StageOne() error {
	pathsJSONOut_StageOne := filepath.Join(h.StaticPrivateOutDir, HwyPathsStageOneJSONFileName)
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

func toRollupOptions(entrypoints []string) string {
	var sb stringsutil.Builder

	sb.Line("export const rollupOptions = {")
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
	sb.Tab().Tab().Line(`assetFileNames: "` + hwyPrehashedFilePrefix + `[name]-[hash][extname]",`)
	sb.Tab().Tab().Line(`chunkFileNames: "` + hwyPrehashedFilePrefix + `[name]-[hash].js",`)
	sb.Tab().Tab().Line(`entryFileNames: "` + hwyPrehashedFilePrefix + `[name]-[hash].js",`)
	sb.Tab().Line("},")
	sb.Line("} as const;")

	// Now do a helper that is a function that inside calls await import(x) for each of the input files
	// sb.Line("export async function loadEntrypoints() {")
	// for _, entrypoint := range entrypoints {
	// 	sb.Tab().Linef(`import("../../%s");`, entrypoint)
	// }
	// sb.Line("}")

	return sb.String()
}

func (h *Hwy[C]) handleViteConfigHelper() error {
	entrypoints := h.getEntrypoints()

	err := os.WriteFile(
		filepath.Join(h.StaticPrivateOutDir, HwyViteConfigHelperTSFileName),
		[]byte(toRollupOptions(entrypoints)),
		os.ModePerm,
	)
	if err != nil {
		Log.Error(fmt.Sprintf("HandleEntrypoints: error writing entrypoints to disk: %s", err))
		return err
	}

	return nil
}

var nodeScript = `
const path = await import('node:path');
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

func (h *Hwy[C]) Build(isDev bool) error {
	h.mu.Lock()
	defer h.mu.Unlock()

	h._isDev = isDev

	startTime := time.Now()

	buildID, err := id.New(16)
	if err != nil {
		Log.Error(fmt.Sprintf("error generating random ID: %s", err))
		return err
	}
	Log.Info("Starting new Hwy build", "buildID", buildID)
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

	tempDirName, err := os.MkdirTemp(".", "hwy-build")
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
		Log.Error(fmt.Sprintf("error running node script: %s", err))
		return err
	}

	var nodeScriptResult NodeScriptResult
	if err := json.Unmarshal(output, &nodeScriptResult); err != nil {
		Log.Error(fmt.Sprintf("error unmarshalling node script output: %s", err))
	}

	Log.Info("Completed walk for route files", "found", len(nodeScriptResult))

	h._paths = make(map[string]*Path)

	for _, item := range nodeScriptResult {
		h._paths[item.Pattern] = &Path{Pattern: item.Pattern, SrcPath: item.Module}
	}

	if err = h.writePathsToDisk_StageOne(); err != nil {
		Log.Error(fmt.Sprintf("error writing paths to disk: %s", err))
		return err
	}

	// Remove all files in StaticPublicOutDir starting with hwyChunkPrefix or hwyEntryPrefix.
	// This could theoretically be done in parallel with the esbuild step, but it's unlikely
	// that it would be perceptibly faster.
	err = cleanStaticPublicOutDir(h.StaticPublicOutDir)
	if err != nil {
		Log.Error(fmt.Sprintf("error cleaning static public out dir: %s", err))
		return err
	}

	if err = h.handleViteConfigHelper(); err != nil {
		// already logged internally in handleViteConfigHelper
		return err
	}

	Log.Info("Done interpreting TypeScript route definitions", "file", h.ClientRoutesFile, "duration", time.Since(startTime))

	return nil
}

func (h *Hwy[C]) getViteDevURL() string {
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

	// delete all files starting with hwyPrehashedFilePrefix
	err = filepath.Walk(staticPublicOutDir, func(path string, info fs.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if strings.HasPrefix(filepath.Base(path), hwyPrehashedFilePrefix) {
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

func (h *Hwy[C]) getEntrypoints() []string {
	entryPoints := make([]string, 0, len(h._paths)+1)
	entryPoints = append(entryPoints, h.ClientEntry)
	for _, path := range h._paths {
		if path.SrcPath != "" {
			entryPoints = append(entryPoints, path.SrcPath)
		}
	}
	slices.SortStableFunc(entryPoints, strings.Compare)
	return entryPoints
}

/////////////////////////////////////////////////////////////////////
/////// TO PATHS FILE -- STAGE TWO
/////////////////////////////////////////////////////////////////////

func (h *Hwy[C]) toPathsFile_StageTwo() (*PathsFile, error) {
	hwyClientEntry := ""
	hwyClientEntryDeps := []string{}
	depToCSSBundleMap := make(map[string]string)

	viteManifest, err := viteutil.ReadManifest(filepath.Join(h.StaticPublicOutDir, ".vite", "manifest.json"))
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
			hwyClientEntry = cleanKey
			depsWithoutClientEntry := make([]string, 0, len(deps)-1)
			for _, dep := range deps {
				if dep != hwyClientEntry {
					depsWithoutClientEntry = append(depsWithoutClientEntry, dep)
				}
			}
			hwyClientEntryDeps = depsWithoutClientEntry
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
		ClientEntryOut:    hwyClientEntry,
		ClientEntryDeps:   hwyClientEntryDeps,
		BuildID:           h._buildID,
	}, nil
}
