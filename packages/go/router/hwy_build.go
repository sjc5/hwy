package router

import (
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/sjc5/kit/pkg/grace"
	"github.com/sjc5/kit/pkg/id"
	"github.com/sjc5/kit/pkg/matcher"
	"github.com/sjc5/kit/pkg/rpc"
	"github.com/sjc5/kit/pkg/stringsutil"
	"github.com/sjc5/kit/pkg/viteutil"
)

const (
	HwyPathsStageOneJSONFileName  = "hwy_paths_stage_1.json"
	HwyPathsStageTwoJSONFileName  = "hwy_paths_stage_2.json"
	HwyViteConfigHelperTSFileName = "hwy_vite_config_helper.ts"
)

type AdHocType = rpc.AdHocType

type DataFuncs struct {
	QueryActions    DataFunctionMap
	MutationActions DataFunctionMap
}

// __TODO shouldn't this just be combined with Base Hwy struct?
type BuildOptions struct {
	// inputs
	IsDev       bool
	ClientEntry string
	DataFuncs   *DataFuncs

	// outputs
	PagesSrcDir         string
	StaticPublicOutDir  string
	StaticPrivateOutDir string
}

type PathsFile struct {
	// both stages one and two
	Stage          string           `json:"stage"`
	IsDev          bool             `json:"isDev"`
	BuildID        string           `json:"buildID"`
	ClientEntrySrc string           `json:"clientEntrySrc"`
	Paths          map[string]*Path `json:"paths"`

	// stage two only
	ClientEntryOut    string            `json:"clientEntryOut,omitempty"`
	ClientEntryDeps   []string          `json:"clientEntryDeps,omitempty"`
	DepToCSSBundleMap map[string]string `json:"depToCSSBundleMap,omitempty"`
}

func (opts *BuildOptions) walkPages(pagesSrcDir string) map[string]*Path {
	paths := make(map[string]*Path)

	filepath.WalkDir(pagesSrcDir, func(patternArg string, _ fs.DirEntry, err error) error {
		cleanPatternArg := filepath.Clean(strings.TrimPrefix(patternArg, pagesSrcDir))

		isPageFile := strings.Contains(cleanPatternArg, ".route.")
		if !isPageFile {
			return nil
		}

		ext := filepath.Ext(cleanPatternArg)
		preExtDelineator := ".route"

		pattern := strings.TrimSuffix(cleanPatternArg, preExtDelineator+ext)

		segments := matcher.ParseSegments(pattern)
		cleanSegments := make([]string, 0, len(segments))
		for _, segment := range segments {
			if strings.HasPrefix(segment, "__") {
				continue
			}
			cleanSegments = append(cleanSegments, segment)
		}

		finalPattern := "/" + strings.Join(cleanSegments, "/")
		paths[finalPattern] = &Path{
			Pattern: finalPattern,
			SrcPath: filepath.Join(pagesSrcDir, pattern) + preExtDelineator + ext,
		}

		return nil
	})

	return paths
}

func (opts *BuildOptions) writePathsToDisk_StageOne(pagesSrcDir string, buildID string) (map[string]*Path, error) {
	paths := opts.walkPages(pagesSrcDir)

	pathsJSONOut_StageOne := filepath.Join(opts.StaticPrivateOutDir, HwyPathsStageOneJSONFileName)
	err := os.MkdirAll(filepath.Dir(pathsJSONOut_StageOne), os.ModePerm)
	if err != nil {
		return nil, err
	}

	pathsAsJSON, err := json.MarshalIndent(PathsFile{
		Stage:          "one",
		IsDev:          opts.IsDev,
		Paths:          paths,
		ClientEntrySrc: opts.ClientEntry,
		BuildID:        buildID,
	}, "", "\t")
	if err != nil {
		return nil, err
	}

	err = os.WriteFile(pathsJSONOut_StageOne, pathsAsJSON, os.ModePerm)
	if err != nil {
		return nil, err
	}

	return paths, nil
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

	sb.Return()

	// Now do a helper that is a function that inside calls await import(x) for each of the input files
	// sb.Line("export async function loadEntrypoints() {")
	// for _, entrypoint := range entrypoints {
	// 	sb.Tab().Linef(`import("../../%s");`, entrypoint)
	// }
	// sb.Line("}")

	return sb.String()
}

func (h *Hwy) HandleViteConfigHelper(paths map[string]*Path, opts *BuildOptions) error {
	entrypoints := getEntrypoints(paths, opts)

	err := os.WriteFile(
		filepath.Join(opts.StaticPrivateOutDir, HwyViteConfigHelperTSFileName),
		[]byte(toRollupOptions(entrypoints)),
		os.ModePerm,
	)
	if err != nil {
		Log.Error(fmt.Sprintf("HandleEntrypoints: error writing entrypoints to disk: %s", err))
		return err
	}

	return nil
}

func (h *Hwy) Build(opts *BuildOptions) error {
	h.mu.Lock()
	defer h.mu.Unlock()

	h._isDev = opts.IsDev

	startTime := time.Now()

	buildID, err := id.New(16)
	if err != nil {
		Log.Error(fmt.Sprintf("error generating random ID: %s", err))
		return err
	}
	Log.Info(fmt.Sprintf("new build id: %s", buildID))

	paths, err := opts.writePathsToDisk_StageOne(opts.PagesSrcDir, buildID)
	if err != nil {
		Log.Error(fmt.Sprintf("error writing paths to disk: %s", err))
		return err
	}

	// Remove all files in StaticPublicOutDir starting with hwyChunkPrefix or hwyEntryPrefix.
	// This could theoretically be done in parallel with the esbuild step, but it's unlikely
	// that it would be perceptibly faster.
	err = cleanStaticPublicOutDir(opts.StaticPublicOutDir)
	if err != nil {
		Log.Error(fmt.Sprintf("error cleaning static public out dir: %s", err))
		return err
	}

	if err = h.HandleViteConfigHelper(paths, opts); err != nil {
		// already logged internally in HandleViteConfigHelper
		return err
	}

	splitCommand := strings.Fields(h.JSPackageManagerBaseCmd)

	if opts.IsDev {
		if h._viteCmd != nil {
			if err = grace.TerminateProcess(h._viteCmd.Process, 3*time.Second, nil); err != nil {
				Log.Error(fmt.Sprintf("error terminating vite process: %s", err))
				return err
			} else {
				Log.Info("terminated vite process", "pid", h._viteCmd.Process.Pid)
			}
		}

		vitePort, err := viteutil.InitPort(5199)
		if err != nil {
			Log.Error(fmt.Sprintf("error initializing vite port: %s", err))
			return err
		}

		h._viteCmd = exec.Command(splitCommand[0], splitCommand[1:]...)
		h._viteCmd.Args = append(h._viteCmd.Args, "vite", "--port", fmt.Sprintf("%d", vitePort), "--clearScreen", "false", "--strictPort", "true")

		Log.Info("Running vite serve (dev)", "command", fmt.Sprintf(`"%s"`, strings.Join(h._viteCmd.Args, " ")))

		if h.JSPackagerManagerCmdDir != "" {
			h._viteCmd.Dir = h.JSPackagerManagerCmdDir
		}

		h._viteCmd.Stdout = os.Stdout
		h._viteCmd.Stderr = os.Stderr

		go h._viteCmd.Run()
	} else {
		cmd := exec.Command(splitCommand[0], splitCommand[1:]...)
		cmd.Args = append(cmd.Args, "vite", "build", "--outDir", filepath.Join(opts.StaticPublicOutDir), "--assetsDir", ".", "--manifest")

		Log.Info("Running vite build (prod)", "command", fmt.Sprintf(`"%s"`, strings.Join(cmd.Args, " ")))

		if h.JSPackagerManagerCmdDir != "" {
			h._viteCmd.Dir = h.JSPackagerManagerCmdDir
		}

		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr

		if err = cmd.Run(); err != nil {
			Log.Error(fmt.Sprintf("error running vite build: %s", err))
			return err
		}

		Log.Info(fmt.Sprintf("build completed in %s", time.Since(startTime)))

		// Must come after Vite -- only needed in prod (the stage "one" version is fine in dev)
		pf, err := toPathsFile_StageTwo(opts, paths, buildID)
		if err != nil {
			Log.Error(fmt.Sprintf("error converting paths to paths file: %s", err))
			return err
		}

		pathsAsJSON, err := json.MarshalIndent(pf, "", "\t")

		if err != nil {
			Log.Error(fmt.Sprintf("error marshalling paths to JSON: %s", err))
			return err
		}

		pathsJSONOut_StageTwo := filepath.Join(opts.StaticPrivateOutDir, HwyPathsStageTwoJSONFileName)
		err = os.WriteFile(pathsJSONOut_StageTwo, pathsAsJSON, os.ModePerm)
		if err != nil {
			Log.Error(fmt.Sprintf("error writing paths to disk: %s", err))
			return err
		}
	}

	return nil
}

func (h *Hwy) getViteDevURL() string {
	if !h._isDev {
		return ""
	}
	return fmt.Sprintf("http://localhost:%s", viteutil.GetVitePortStr())
}

const (
	hwyPrehashedFilePrefix = "hwy_vite_"
)

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

func getEntrypoints(paths map[string]*Path, opts *BuildOptions) []string {
	entryPoints := make([]string, 0, len(paths)+1)
	entryPoints = append(entryPoints, opts.ClientEntry)
	for _, path := range paths {
		if path.SrcPath != "" {
			entryPoints = append(entryPoints, path.SrcPath)
		}
	}
	return entryPoints
}

func toPathsFile_StageTwo(opts *BuildOptions, paths map[string]*Path, buildID string) (*PathsFile, error) {
	hwyClientEntry := ""
	hwyClientEntryDeps := []string{}
	depToCSSBundleMap := make(map[string]string)

	viteManifest, err := viteutil.ReadManifest(filepath.Join(opts.StaticPublicOutDir, ".vite", "manifest.json"))
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
		if chunk.IsEntry && opts.ClientEntry == chunk.Src {
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
			for i, path := range paths {
				// Compare with source path instead of entryPoint
				if path.SrcPath == chunk.Src {
					paths[i].OutPath = cleanKey
					paths[i].Deps = deps
				}
			}
		}
	}

	return &PathsFile{
		Stage:             "two",
		IsDev:             opts.IsDev,
		DepToCSSBundleMap: depToCSSBundleMap,
		Paths:             paths,
		ClientEntrySrc:    opts.ClientEntry,
		ClientEntryOut:    hwyClientEntry,
		ClientEntryDeps:   hwyClientEntryDeps,
		BuildID:           buildID,
	}, nil
}
