package router

import (
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
	"time"

	esbuild "github.com/evanw/esbuild/pkg/api"
	"github.com/sjc5/kit/pkg/esbuildutil"
	"github.com/sjc5/kit/pkg/id"
	"github.com/sjc5/kit/pkg/rpc"
)

const (
	HwyPathsFileName = "hwy_paths.json"
)

type AdHocType = rpc.AdHocType

type DataFuncs struct {
	Loaders         DataFunctionMap
	QueryActions    DataFunctionMap
	MutationActions DataFunctionMap
}

type BuildOptions struct {
	// inputs
	IsDev           bool
	ClientEntry     string
	DataFuncs       *DataFuncs
	UsePreactCompat bool

	// outputs
	PagesSrcDir         string
	StaticPublicOutDir  string
	StaticPrivateOutDir string

	// esbuild passthroughs
	ESBuildPlugins   []esbuild.Plugin
	ESBuildNodePaths []string
}

type PathsFile struct {
	Paths             []PathBase        `json:"paths"`
	ClientEntry       string            `json:"clientEntry"`
	ClientEntryDeps   []string          `json:"clientEntryDeps"`
	BuildID           string            `json:"buildID"`
	DepToCSSBundleMap map[string]string `json:"depToCSSBundleMap"`
}

type SegmentObj struct {
	SegmentType string
	Segment     string
}

func (opts *BuildOptions) walkPages(pagesSrcDir string) []PathBase {
	var paths []PathBase

	filepath.WalkDir(
		pagesSrcDir,

		func(patternArg string, _ fs.DirEntry, err error) error {
			cleanPatternArg := filepath.Clean(strings.TrimPrefix(patternArg, pagesSrcDir))

			isPageFile := strings.Contains(cleanPatternArg, ".route.")
			if !isPageFile {
				return nil
			}

			ext := filepath.Ext(cleanPatternArg)
			preExtDelineator := ".route"

			pattern := strings.TrimSuffix(cleanPatternArg, preExtDelineator+ext)

			segmentsInit := segmentsInitFromPattern(pattern)

			pathBase := pathBaseFromSegmentsInit(segmentsInit)
			pathBase.SrcPath = filepath.Join(pagesSrcDir, pattern) + preExtDelineator + ext

			paths = append(paths, *pathBase)

			return nil
		},
	)

	return paths
}

func segmentsInitFromPattern(pattern string) []string {
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

	return segmentsInit
}

func pathBaseFromSegmentsInit(segmentsInit []string) *PathBase {
	isIndex := false
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

	return &PathBase{
		Pattern:  patternToUse,
		Segments: segmentStrs,
		PathType: pathType,
	}
}

func (opts *BuildOptions) writePathsToDisk(pagesSrcDir string, pathsJSONOut string) ([]PathBase, error) {
	paths := opts.walkPages(pagesSrcDir)

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

	return paths, nil
}

func Build(opts *BuildOptions) error {
	startTime := time.Now()

	buildID, err := id.New(16)
	if err != nil {
		Log.Error(fmt.Sprintf("error generating random ID: %s", err))
		return err
	}
	Log.Info(fmt.Sprintf("new build id: %s", buildID))

	pathsJSONOut := filepath.Join(opts.StaticPrivateOutDir, HwyPathsFileName)
	paths, err := opts.writePathsToDisk(opts.PagesSrcDir, pathsJSONOut)
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

	result := runEsbuild(runEsbuildOpts{
		IsDev:              opts.IsDev,
		UsePreactCompat:    opts.UsePreactCompat,
		StaticPublicOutDir: opts.StaticPublicOutDir,
		EntryPoints:        getEntrypoints(paths, opts),
		Plugins:            opts.ESBuildPlugins,
		NodePaths:          opts.ESBuildNodePaths,
	})
	if len(result.Errors) > 0 {
		err = errors.New(result.Errors[0].Text)
		Log.Error(fmt.Sprintf("error building: %s", err))
		return err
	}

	metafileJSONMap := esbuildutil.ESBuildMetafileSubset{}
	err = json.Unmarshal([]byte(result.Metafile), &metafileJSONMap)
	if err != nil {
		Log.Error(fmt.Sprintf("error unmarshalling metafile JSON: %s", err))
		return err
	}

	hwyClientEntry := ""
	hwyClientEntryDeps := []string{}

	var depToCSSBundleMap = map[string]string{}

	for key, output := range metafileJSONMap.Outputs {
		cleanKey := filepath.Base(key)
		if output.CSSBundle != "" {
			depToCSSBundleMap[cleanKey] = filepath.Base(output.CSSBundle)
		}

		entryPoint := output.EntryPoint
		deps := esbuildutil.FindAllDependencies(&metafileJSONMap, key)
		if opts.ClientEntry == entryPoint {
			hwyClientEntry = cleanKey
			depsWithoutClientEntry := make([]string, 0, len(deps)-1)
			for _, dep := range deps {
				if dep != hwyClientEntry {
					depsWithoutClientEntry = append(depsWithoutClientEntry, dep)
				}
			}
			hwyClientEntryDeps = depsWithoutClientEntry
		} else {
			for i, path := range paths {
				if path.SrcPath == entryPoint {
					paths[i].OutPath = cleanKey
					paths[i].Deps = deps
				}
			}
		}
	}

	pf := PathsFile{
		Paths:             paths,
		ClientEntry:       hwyClientEntry,
		ClientEntryDeps:   hwyClientEntryDeps,
		BuildID:           buildID,
		DepToCSSBundleMap: depToCSSBundleMap,
	}

	var pathsAsJSON []byte
	if opts.IsDev {
		pathsAsJSON, err = json.MarshalIndent(pf, "", "\t")
	} else {
		pathsAsJSON, err = json.Marshal(pf)
	}

	if err != nil {
		Log.Error(fmt.Sprintf("error marshalling paths to JSON: %s", err))
		return err
	}

	err = os.WriteFile(pathsJSONOut, pathsAsJSON, os.ModePerm)
	if err != nil {
		Log.Error(fmt.Sprintf("error writing paths to disk: %s", err))
		return err
	}

	Log.Info(fmt.Sprintf("build completed in %s", time.Since(startTime)))
	return nil
}

var preactCompatAlias = map[string]string{
	"react":                "preact/compat",
	"react/jsx-runtime":    "preact/jsx-runtime",
	"react-dom":            "preact/compat",
	"react-dom/test-utils": "preact/test-utils",
}

type runEsbuildOpts struct {
	IsDev              bool
	UsePreactCompat    bool
	StaticPublicOutDir string
	EntryPoints        []string
	Plugins            []esbuild.Plugin
	NodePaths          []string
}

const (
	hwyChunkPrefix = "hwy_chunk__"
	hwyEntryPrefix = "hwy_entry__"
)

var (
	cachedEsbuildCtx esbuild.BuildContext
	latestCacheKey   string
)

func runEsbuild(opts runEsbuildOpts) esbuild.BuildResult {
	cacheKey := fmt.Sprintf("%v%v%v%v", opts.IsDev, opts.UsePreactCompat, opts.StaticPublicOutDir, opts.EntryPoints)

	if cacheKey == latestCacheKey {
		Log.Info("reusing esbuild context")
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
		NodePaths: opts.NodePaths,

		// totally dynamic, but only changes when you page list changes
		EntryPoints: opts.EntryPoints,

		// dynamic based on build opts
		Outdir:            opts.StaticPublicOutDir,
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

	if opts.Plugins != nil {
		esbuildOpts.Plugins = opts.Plugins
	}

	ctx, err := esbuild.Context(esbuildOpts)
	if err != nil {
		Log.Error("failed to create esbuild context")
		panic(err)
	}
	cachedEsbuildCtx = ctx

	Log.Info("created new esbuild context")
	return ctx.Rebuild()
}

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

	err = filepath.Walk(staticPublicOutDir, func(path string, info fs.FileInfo, err error) error {
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

func getEntrypoints(paths []PathBase, opts *BuildOptions) []string {
	entryPoints := make([]string, 0, len(paths)+1)
	entryPoints = append(entryPoints, opts.ClientEntry)
	for _, path := range paths {
		if path.SrcPath != "" {
			entryPoints = append(entryPoints, path.SrcPath)
		}
	}
	return entryPoints
}
