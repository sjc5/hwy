package router

import (
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"time"

	esbuild "github.com/evanw/esbuild/pkg/api"
	"github.com/sjc5/kit/pkg/rpc"
)

type BuildOptions struct {
	IsDev             bool
	ClientEntry       string
	PagesSrcDir       string
	HashedOutDir      string
	UnhashedOutDir    string
	ClientEntryOut    string
	UsePreactCompat   bool
	DataFuncsMap      DataFuncsMap
	GeneratedTSOutDir string
}

type ImportPath = string

type MetafileImport struct {
	Path ImportPath `json:"path"`
	Kind string     `json:"kind"`
}

type MetafileJSON struct {
	Outputs map[ImportPath]struct {
		Imports    []MetafileImport `json:"imports"`
		EntryPoint string           `json:"entryPoint"`
	} `json:"outputs"`
}

type PathsFile struct {
	Paths           []JSONSafePath `json:"paths"`
	ClientEntryDeps []ImportPath   `json:"clientEntryDeps"`
	BuildID         string         `json:"buildID"`
}

func walkPages(pagesSrcDir string) []JSONSafePath {
	var paths []JSONSafePath
	filepath.WalkDir(pagesSrcDir, func(patternArg string, d fs.DirEntry, err error) error {
		cleanPatternArg := filepath.Clean(strings.TrimPrefix(patternArg, pagesSrcDir))
		isPageFile := strings.Contains(cleanPatternArg, ".route.")
		if !isPageFile {
			return nil
		}
		ext := filepath.Ext(cleanPatternArg)
		preExtDelineator := ".route"
		pattern := strings.TrimSuffix(cleanPatternArg, preExtDelineator+ext)
		isIndex := false
		patternToSplit := strings.TrimPrefix(pattern, "/")

		// Clean out double underscore segments
		segmentsInitWithDubUnderscores := strings.Split(patternToSplit, "/")
		segmentsInit := make([]string, 0, len(segmentsInitWithDubUnderscores))
		for _, segment := range segmentsInitWithDubUnderscores {
			if strings.HasPrefix(segment, "__") {
				continue
			}
			segmentsInit = append(segmentsInit, segment)
		}

		segments := make([]SegmentObj, len(segmentsInit))
		for i, segmentStr := range segmentsInit {
			isSplat := false
			if segmentStr == "$" {
				isSplat = true
			}
			if segmentStr == "_index" {
				segmentStr = ""
				isIndex = true
			}
			segmentType := "normal"
			if isSplat {
				segmentType = "splat"
			} else if strings.HasPrefix(segmentStr, "$") {
				segmentType = "dynamic"
			} else if isIndex {
				segmentType = "index"
			}
			segments[i] = SegmentObj{
				SegmentType: segmentType,
				Segment:     segmentStr,
			}
		}
		segmentStrs := make([]string, len(segments))
		for i, segment := range segments {
			segmentStrs[i] = segment.Segment
		}
		SrcPath := filepath.Join(pagesSrcDir, pattern) + preExtDelineator + ext
		truthySegments := []string{}
		for _, segment := range segmentStrs {
			if segment != "" {
				truthySegments = append(truthySegments, segment)
			}
		}
		patternToUse := "/" + strings.Join(truthySegments, "/")
		if patternToUse != "/" && strings.HasSuffix(patternToUse, "/") {
			patternToUse = strings.TrimSuffix(patternToUse, "/")
		}
		pathType := PathTypeStaticLayout
		if isIndex {
			pathType = PathTypeIndex
			if patternToUse == "/" {
				patternToUse += "_index"
			} else {
				patternToUse += "/_index"
			}
		} else if segments[len(segments)-1].SegmentType == "splat" {
			pathType = PathTypeNonUltimateSplat
		} else if segments[len(segments)-1].SegmentType == "dynamic" {
			pathType = PathTypeDynamicLayout
		}
		if patternToUse == "/$" {
			pathType = PathTypeUltimateCatch
		}
		paths = append(paths, JSONSafePath{
			Pattern:  patternToUse,
			Segments: &segmentStrs,
			PathType: pathType,
			SrcPath:  SrcPath,
		})
		return nil
	})
	return paths
}

func writePathsToDisk(pagesSrcDir string, pathsJSONOut string) (*[]JSONSafePath, error) {
	paths := walkPages(pagesSrcDir)
	err := os.MkdirAll(filepath.Dir(pathsJSONOut), os.ModePerm)
	if err != nil {
		return nil, err
	}
	pathsAsJSON, err := json.Marshal(paths)
	if err != nil {
		return nil, err
	}
	err = os.WriteFile(pathsJSONOut, pathsAsJSON, os.ModePerm)
	if err != nil {
		return nil, err
	}
	return &paths, nil
}

func GenerateTypeScript(opts BuildOptions) error {
	var routeDefs []rpc.RouteDef

	for k, v := range opts.DataFuncsMap {
		loaderRouteDef := rpc.RouteDef{Key: k, Type: rpc.TypeQuery}

		if v.Loader != nil {
			loaderRouteDef.Output = v.Loader.GetOutputInstance()
		}

		routeDefs = append(routeDefs, loaderRouteDef)

		actionRouteDef := rpc.RouteDef{Key: k, Type: rpc.TypeMutation}

		if v.Action != nil {
			actionRouteDef.Input = v.Action.GetInputInstance()
			actionRouteDef.Output = v.Action.GetOutputInstance()
		}

		routeDefs = append(routeDefs, actionRouteDef)
	}

	err := rpc.GenerateTypeScript(rpc.Opts{
		OutDest:   opts.GeneratedTSOutDir,
		RouteDefs: routeDefs,
	})

	if err != nil {
		Log.Errorf("error generating typescript: %s", err)
		return err
	}

	return nil
}

func Build(opts BuildOptions) error {
	startTime := time.Now()
	buildID := fmt.Sprintf("%d", startTime.Unix())
	Log.Infof("new build id: %s", buildID)

	pathsJSONOut := filepath.Join(opts.UnhashedOutDir, "hwy_paths.json")
	paths, err := writePathsToDisk(opts.PagesSrcDir, pathsJSONOut)
	if err != nil {
		Log.Errorf("error writing paths to disk: %s", err)
		return err
	}

	// Remove all files in hashedOutDir starting with hwyChunkPrefix or hwyEntryPrefix.
	// This could theoretically be done in parallel with the esbuild step, but it's unlikely
	// that it would be perceptibly faster.
	err = cleanHashedOutDir(opts.HashedOutDir)
	if err != nil {
		Log.Errorf("error cleaning hashed out dir: %s", err)
		return err
	}

	result := runEsbuild(RunEsbuildOpts{
		IsDev:           opts.IsDev,
		UsePreactCompat: opts.UsePreactCompat,
		HashedOutDir:    opts.HashedOutDir,
		EntryPoints:     getEntrypoints(paths, opts),
	})
	if len(result.Errors) > 0 {
		err = errors.New(result.Errors[0].Text)
		Log.Errorf("error building: %s", err)
		return err
	}

	metafileJSONMap := MetafileJSON{}
	err = json.Unmarshal([]byte(result.Metafile), &metafileJSONMap)
	if err != nil {
		Log.Errorf("error unmarshalling metafile JSON: %s", err)
		return err
	}

	hwyClientEntry := ""
	hwyClientEntryDeps := []string{}
	for key, output := range metafileJSONMap.Outputs {
		entryPoint := output.EntryPoint
		deps, err := findAllDependencies(&metafileJSONMap, key)
		if err != nil {
			Log.Errorf("error finding all dependencies: %s", err)
			return err
		}
		if opts.ClientEntry == entryPoint {
			hwyClientEntry = filepath.Base(key)
			depsWithoutClientEntry := make([]string, 0, len(deps)-1)
			for _, dep := range deps {
				if dep != hwyClientEntry {
					depsWithoutClientEntry = append(depsWithoutClientEntry, dep)
				}
			}
			hwyClientEntryDeps = depsWithoutClientEntry
		} else {
			for i, path := range *paths {
				if path.SrcPath == entryPoint {
					(*paths)[i].OutPath = filepath.Base(key)
					(*paths)[i].Deps = &deps
				}
			}
		}
	}

	pathsAsJSON, err := json.Marshal(PathsFile{
		Paths:           *paths,
		ClientEntryDeps: hwyClientEntryDeps,
		BuildID:         buildID,
	})
	if err != nil {
		Log.Errorf("error marshalling paths to JSON: %s", err)
		return err
	}

	err = os.WriteFile(pathsJSONOut, pathsAsJSON, os.ModePerm)
	if err != nil {
		Log.Errorf("error writing paths to disk: %s", err)
		return err
	}

	clientEntryPath := filepath.Join(opts.HashedOutDir, hwyClientEntry)

	// Mv file at path stored in hwyClientEntry var to ../ in OutDir
	clientEntryFileBytes, err := os.ReadFile(clientEntryPath)
	if err != nil {
		Log.Errorf("error reading client entry file: %s", err)
		return err
	}

	err = os.WriteFile(filepath.Join(opts.ClientEntryOut, "hwy_client_entry.js"), clientEntryFileBytes, os.ModePerm)
	if err != nil {
		Log.Errorf("error writing client entry file: %s", err)
		return err
	}

	err = os.Remove(clientEntryPath)
	if err != nil {
		Log.Errorf("error removing client entry file: %s", err)
		return err
	}

	Log.Infof("build completed in %s", time.Since(startTime))
	return nil
}

func findAllDependencies(metafile *MetafileJSON, entry ImportPath) ([]ImportPath, error) {
	seen := make(map[ImportPath]bool)
	var result []ImportPath

	var recurse func(path ImportPath)
	recurse = func(path ImportPath) {
		if seen[path] {
			return
		}
		seen[path] = true
		result = append(result, path)

		if output, exists := metafile.Outputs[path]; exists {
			for _, imp := range output.Imports {
				recurse(imp.Path)
			}
		}
	}

	recurse(entry)

	cleanResults := make([]ImportPath, 0, len(result)+1)
	for _, res := range result {
		cleanResults = append(cleanResults, filepath.Base(res))
	}
	if !slices.Contains(cleanResults, filepath.Base(entry)) {
		cleanResults = append(cleanResults, filepath.Base(entry))
	}
	return cleanResults, nil
}

var preactCompatAlias = map[string]string{
	"react":                "preact/compat",
	"react-dom/test-utils": "preact/test-utils",
	"react-dom":            "preact/compat",
	"react/jsx-runtime":    "preact/jsx-runtime",
}

type RunEsbuildOpts struct {
	IsDev           bool
	UsePreactCompat bool
	HashedOutDir    string
	EntryPoints     []string
}

const hwyChunkPrefix = "hwy_chunk__"
const hwyEntryPrefix = "hwy_entry__"

var cachedEsbuildCtx esbuild.BuildContext
var latestCacheKey string

func runEsbuild(opts RunEsbuildOpts) esbuild.BuildResult {
	cacheKey := fmt.Sprintf("%v%v%v%v", opts.IsDev, opts.UsePreactCompat, opts.HashedOutDir, opts.EntryPoints)

	if cacheKey == latestCacheKey {
		Log.Infof("reusing esbuild context")
		return cachedEsbuildCtx.Rebuild()
	}
	latestCacheKey = cacheKey

	// downstream of isDev
	env := "production"
	if opts.IsDev {
		env = "development"
	}
	sourcemap := esbuild.SourceMapNone
	if opts.IsDev {
		sourcemap = esbuild.SourceMapLinked
	}

	// downstream of usePreactCompat
	var alias map[string]string
	if opts.UsePreactCompat {
		alias = preactCompatAlias
	}

	esbuildOpts := esbuild.BuildOptions{
		// totally dynamic, but only changes when you page list changes
		EntryPoints: opts.EntryPoints,

		// dynamic based on build opts
		Outdir:            opts.HashedOutDir,
		Alias:             alias,
		Sourcemap:         sourcemap,
		MinifyWhitespace:  !opts.IsDev,
		MinifyIdentifiers: !opts.IsDev,
		MinifySyntax:      !opts.IsDev,
		Define: map[string]string{
			"process.env.NODE_ENV": "\"" + env + "\"",
		},

		// static
		Bundle:      true,
		Splitting:   true,
		Write:       true,
		Metafile:    true,
		Format:      esbuild.FormatESModule,
		TreeShaking: esbuild.TreeShakingTrue,
		Platform:    esbuild.PlatformBrowser,
		ChunkNames:  hwyChunkPrefix + "[hash]",
		EntryNames:  hwyEntryPrefix + "[hash]",
	}

	ctx, err := esbuild.Context(esbuildOpts)
	if err != nil {
		Log.Error("failed to create esbuild context")
		panic(err)
	}
	cachedEsbuildCtx = ctx

	Log.Infof("created new esbuild context")
	return ctx.Rebuild()
}

func cleanHashedOutDir(hashedOutDir string) error {
	fileInfo, err := os.Stat(hashedOutDir)
	if err != nil {
		if os.IsNotExist(err) {
			Log.Warningf("hashed out dir does not exist: %s", hashedOutDir)
			return nil
		}
		return err
	}

	if !fileInfo.IsDir() {
		errMsg := fmt.Sprintf("%s is not a directory", hashedOutDir)
		Log.Errorf(errMsg)
		return errors.New(errMsg)
	}

	err = filepath.Walk(hashedOutDir, func(path string, info fs.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if strings.HasPrefix(filepath.Base(path), hwyChunkPrefix) || strings.HasPrefix(filepath.Base(path), hwyEntryPrefix) {
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

func getEntrypoints(paths *[]JSONSafePath, opts BuildOptions) []string {
	entryPoints := make([]string, 0, len(*paths)+1)
	entryPoints = append(entryPoints, opts.ClientEntry)
	for _, path := range *paths {
		entryPoints = append(entryPoints, path.SrcPath)
	}
	return entryPoints
}
