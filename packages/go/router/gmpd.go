package router

import (
	"net/http"
	"slices"
	"sync"

	"github.com/sjc5/kit/pkg/lru"
)

type LoaderProps struct {
	Request       *http.Request
	Params        *map[string]string
	SplatSegments *[]string
}

type ActionProps struct {
	Request        *http.Request
	Params         *map[string]string
	SplatSegments  *[]string
	ResponseWriter http.ResponseWriter
}

type DecoratedPath struct {
	DataFuncs *DataFuncs
	PathType  string // technically only needed for testing
}

type ActivePathData struct {
	MatchingPaths       *[]*DecoratedPath
	LoadersData         *[]any
	ImportURLs          *[]string
	OutermostErrorIndex int
	ActionData          *[]any
	ActiveHeads         *[]DataFunction
	SplatSegments       *[]string
	Params              *map[string]string
	Deps                *[]string
}

type gmpdItem struct {
	SplatSegments               *[]string
	Params                      *map[string]string
	FullyDecoratedMatchingPaths *[]*DecoratedPath
	ImportURLs                  *[]string
	Deps                        *[]string
}

var acceptedMethods = map[string]int{
	"POST": 0, "PUT": 0, "PATCH": 0, "DELETE": 0,
}

var gmpdCache = lru.NewCache[string, *gmpdItem](500_000)

func (h *Hwy) getMatchingPathData(w http.ResponseWriter, r *http.Request) (*ActivePathData, *LoaderProps) {
	realPath := r.URL.Path
	if realPath != "/" && realPath[len(realPath)-1] == '/' {
		realPath = realPath[:len(realPath)-1]
	}

	cached, ok := gmpdCache.Get(realPath)
	item := &gmpdItem{}
	if ok {
		item = cached
	} else {
		initialMatchingPaths := h.getInitialMatchingPaths(realPath)
		splatSegments, matchingPaths := getMatchingPathsInternal(initialMatchingPaths, realPath)
		importURLs := make([]string, 0, len(*matchingPaths))
		item.ImportURLs = &importURLs
		for _, path := range *matchingPaths {
			importURLs = append(importURLs, "/"+path.OutPath)
		}
		var lastPath = &MatchingPath{}
		if len(*matchingPaths) > 0 {
			lastPath = (*matchingPaths)[len(*matchingPaths)-1]
		}
		item.FullyDecoratedMatchingPaths = decoratePaths(matchingPaths)
		item.SplatSegments = splatSegments
		item.Params = lastPath.Params
		deps := h.getDeps(matchingPaths)
		item.Deps = &deps
		isSpam := len(*matchingPaths) == 0
		gmpdCache.Set(realPath, item, isSpam)
	}

	var lastPath = &DecoratedPath{}
	if len(*item.FullyDecoratedMatchingPaths) > 0 {
		lastPath = (*item.FullyDecoratedMatchingPaths)[len(*item.FullyDecoratedMatchingPaths)-1]
	}

	var actionData any
	var actionDataError error
	actionExists := lastPath.DataFuncs != nil && lastPath.DataFuncs.Action != nil
	_, shouldRunAction := acceptedMethods[r.Method]
	if actionExists && shouldRunAction {
		actionData, actionDataError = getActionData(
			lastPath.DataFuncs.Action,
			&ActionProps{
				Request:        r,
				Params:         item.Params,
				SplatSegments:  item.SplatSegments,
				ResponseWriter: w,
			},
		)
	}
	loadersData := make([]any, len(*item.FullyDecoratedMatchingPaths))
	errors := make([]error, len(*item.FullyDecoratedMatchingPaths))
	var wg sync.WaitGroup
	loaderProps := &LoaderProps{
		Request:       r,
		Params:        item.Params,
		SplatSegments: item.SplatSegments,
	}
	for i, path := range *item.FullyDecoratedMatchingPaths {
		wg.Add(1)
		go func(i int, dataFuncs *DataFuncs) {
			defer wg.Done()
			if dataFuncs == nil || dataFuncs.Loader == nil {
				loadersData[i], errors[i] = nil, nil
				return
			}
			loadersData[i], errors[i] = (dataFuncs.Loader).Execute(loaderProps)
		}(i, path.DataFuncs)
	}
	wg.Wait()

	// Response mutation needs to be in sync, with the last path being the most important
	for _, path := range *item.FullyDecoratedMatchingPaths {
		if path.DataFuncs != nil && path.DataFuncs.HandlerFunc != nil {
			path.DataFuncs.HandlerFunc(w, r)
		}
	}

	var thereAreErrors bool
	outermostErrorIndex := -1
	for i, err := range errors {
		if err != nil {
			Log.Errorf("ERROR: %v", err)
			thereAreErrors = true
			outermostErrorIndex = i
			break
		}
	}

	if actionDataError != nil {
		Log.Errorf("ERROR: %v", actionDataError)
		thereAreErrors = true // __TODO -- test this
		actionDataErrorIndex := len(loadersData) - 1
		if actionDataErrorIndex < outermostErrorIndex || outermostErrorIndex < 0 {
			outermostErrorIndex = actionDataErrorIndex
		}
	}

	var activeHeads []DataFunction
	for _, path := range *item.FullyDecoratedMatchingPaths {
		if path.DataFuncs == nil || path.DataFuncs.Head == nil {
			activeHeads = append(activeHeads, nil)
		} else {
			activeHeads = append(activeHeads, path.DataFuncs.Head)
		}
	}

	// __TODO -- this is a bit of a mess, also should dedupe
	if thereAreErrors {
		var activePathData ActivePathData = ActivePathData{}
		locMatchingPaths := (*item.FullyDecoratedMatchingPaths)[:outermostErrorIndex+1]
		activePathData.MatchingPaths = &locMatchingPaths
		locActiveHeads := activeHeads[:outermostErrorIndex]
		activePathData.ActiveHeads = &locActiveHeads
		locLoadersData := loadersData[:outermostErrorIndex]
		activePathData.LoadersData = &locLoadersData
		locImportURLs := (*item.ImportURLs)[:outermostErrorIndex+1]
		activePathData.ImportURLs = &locImportURLs
		activePathData.OutermostErrorIndex = outermostErrorIndex
		locActionData := make([]any, len(*activePathData.ImportURLs))
		activePathData.ActionData = &locActionData
		activePathData.SplatSegments = item.SplatSegments
		activePathData.Params = item.Params

		return &activePathData, loaderProps
	}

	var activePathData ActivePathData = ActivePathData{}
	activePathData.MatchingPaths = item.FullyDecoratedMatchingPaths
	activePathData.ActiveHeads = &activeHeads
	activePathData.LoadersData = &loadersData
	activePathData.ImportURLs = item.ImportURLs
	activePathData.OutermostErrorIndex = outermostErrorIndex
	locActionData := make([]any, len(*activePathData.ImportURLs))
	if len(locActionData) > 0 {
		locActionData[len(locActionData)-1] = actionData
	}
	activePathData.ActionData = &locActionData
	activePathData.SplatSegments = item.SplatSegments
	activePathData.Params = item.Params
	activePathData.Deps = item.Deps

	return &activePathData, loaderProps
}

func (h *Hwy) getInitialMatchingPaths(pathToUse string) *[]MatchingPath {
	var initialMatchingPaths []MatchingPath
	for _, path := range h.paths {
		matcherOutput := matcher(path.Pattern, pathToUse)
		if matcherOutput.matches {
			initialMatchingPaths = append(initialMatchingPaths, MatchingPath{
				Score:              matcherOutput.score,
				RealSegmentsLength: matcherOutput.realSegmentsLength,
				PathType:           path.PathType,
				OutPath:            path.OutPath,
				Segments:           path.Segments,
				DataFuncs:          path.DataFuncs,
				Params:             matcherOutput.params,
				Deps:               path.Deps,
			})
		}
	}
	return &initialMatchingPaths
}

func decoratePaths(paths *[]*MatchingPath) *[]*DecoratedPath {
	decoratedPaths := make([]*DecoratedPath, 0, len(*paths))
	for _, path := range *paths {
		decoratedPaths = append(decoratedPaths, &DecoratedPath{
			DataFuncs: path.DataFuncs,
			PathType:  path.PathType,
		})
	}
	return &decoratedPaths
}

func getActionData(action DataFunction, actionProps *ActionProps) (any, error) {
	if action == nil {
		return nil, nil
	}
	actionFunc := action
	return actionFunc.Execute(actionProps)
}

func (h *Hwy) getDeps(matchingPaths *[]*MatchingPath) []string {
	var deps []string
	for _, path := range *matchingPaths {
		if path.Deps == nil {
			continue
		}
		for _, dep := range *path.Deps {
			if !slices.Contains(deps, dep) {
				deps = append(deps, dep)
			}
		}
	}
	if h.clientEntryDeps == nil {
		return deps
	}
	for _, dep := range h.clientEntryDeps {
		if !slices.Contains(deps, dep) {
			deps = append(deps, dep)
		}
	}
	return deps
}
