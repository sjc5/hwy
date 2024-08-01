package router

import (
	"net/http"
	"slices"
	"sync"

	"github.com/sjc5/kit/pkg/lru"
)

type BaseLoaderProps struct {
	Request       *http.Request
	Params        *map[string]string
	SplatSegments *[]string
}

type ActionProps struct {
	Request        *http.Request
	Params         *map[string]string
	SplatSegments  *[]string
	ResponseWriter http.ResponseWriter // __TODO -- consider doing the LoaderProps way
}

type DecoratedPath struct {
	DataFuncs *DataFuncs
	PathType  string // technically only needed for testing
}

type ActivePathData struct {
	MatchingPaths       *[]*DecoratedPath
	HeadBlocks          *[]*HeadBlock
	LoadersData         *[]any
	ImportURLs          *[]string
	OutermostErrorIndex int
	ActionData          *[]any
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

type didRedirect = bool

func (h *Hwy) getMatchingPathData(w http.ResponseWriter, r *http.Request) (
	*ActivePathData,
	*BaseLoaderProps,
	didRedirect,
) {
	realPath := r.URL.Path
	if realPath != "/" && realPath[len(realPath)-1] == '/' {
		realPath = realPath[:len(realPath)-1]
	}

	cachedItem, cachedItemExists := gmpdCache.Get(realPath)

	var item *gmpdItem

	if cachedItemExists {
		item = cachedItem
	} else {
		// initialize
		item = &gmpdItem{}

		// matcher
		var initialMatchingPaths []MatchingPath
		for _, path := range h.paths {
			matcherOutput := matcher(path.Pattern, realPath)
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

		// get matching paths internal
		splatSegments, matchingPaths := getMatchingPathsInternal(&initialMatchingPaths, realPath)

		// import URLs
		importURLs := make([]string, 0, len(*matchingPaths))
		item.ImportURLs = &importURLs
		for _, path := range *matchingPaths {
			importURLs = append(importURLs, "/"+path.OutPath)
		}

		// last path
		var lastPath = &MatchingPath{}
		if len(*matchingPaths) > 0 {
			lastPath = (*matchingPaths)[len(*matchingPaths)-1]
		}

		// miscellanenous
		item.FullyDecoratedMatchingPaths = decoratePaths(matchingPaths)
		item.SplatSegments = splatSegments
		item.Params = lastPath.Params

		// deps
		deps := h.getDeps(matchingPaths)
		item.Deps = &deps

		// cache
		// isSpam if no matching paths --> avoids cache poisoning while still allowing for cache hits
		isSpam := len(*matchingPaths) == 0
		gmpdCache.Set(realPath, item, isSpam)
	}

	// last path
	var lastPath = &DecoratedPath{}
	if len(*item.FullyDecoratedMatchingPaths) > 0 {
		lastPath = (*item.FullyDecoratedMatchingPaths)[len(*item.FullyDecoratedMatchingPaths)-1]
	}

	// action data
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

	numberOfLoaders := len(*item.FullyDecoratedMatchingPaths)

	// loaders data
	loadersData := make([]any, numberOfLoaders)
	loadersErrors := make([]error, numberOfLoaders)
	loadersHeaders := make([]http.Header, numberOfLoaders)
	loadersCookies := make([][]*http.Cookie, numberOfLoaders)
	loadersRedirects := make([]*Redirect, numberOfLoaders)
	loadersHeadBlocks := make([][]*HeadBlock, numberOfLoaders)

	var wg sync.WaitGroup
	baseLoaderProps := &BaseLoaderProps{
		Request:       r,
		Params:        item.Params,
		SplatSegments: item.SplatSegments,
	}

	// run loaders in parallel
	for i, path := range *item.FullyDecoratedMatchingPaths {
		wg.Add(1)
		go func(i int, dataFuncs *DataFuncs) {
			defer wg.Done()

			if dataFuncs == nil || dataFuncs.Loader == nil {
				loadersData[i], loadersErrors[i] = nil, nil
				return
			}

			loaderProps := dataFuncs.Loader.GetExecutePropsInstance()
			dataFuncs.Loader.Execute(loaderProps)

			loadersData[i] = loaderProps.(LoaderPropsGetter).getData()
			loadersErrors[i] = loaderProps.(LoaderPropsGetter).getError()
			loadersHeaders[i] = loaderProps.(LoaderPropsGetter).getHeaders()
			loadersCookies[i] = loaderProps.(LoaderPropsGetter).getCookies()
			loadersRedirects[i] = loaderProps.(LoaderPropsGetter).getRedirect()
			loadersHeadBlocks[i] = loaderProps.(LoaderPropsGetter).getHeadBlocks()
		}(i, path.DataFuncs)
	}
	wg.Wait()

	// apply first redirect and return
	for _, redirect := range loadersRedirects {
		if redirect != nil && redirect.URL != "" && redirect.Code != 0 {
			http.Redirect(w, r, redirect.URL, redirect.Code)
			return nil, baseLoaderProps, true
		}
	}

	dedupedCookies := make(map[string]*http.Cookie)

	// Merge headers and cookies
	for i := range numberOfLoaders {
		if loadersHeaders[i] != nil {
			for k, v := range loadersHeaders[i] {
				w.Header()[k] = v
			}
		}

		// dedupe and apply cookies
		if loadersCookies[i] != nil {
			for _, cookie := range loadersCookies[i] {
				dedupedCookies[cookie.Name] = cookie
			}
		}
	}

	for _, cookie := range dedupedCookies {
		http.SetCookie(w, cookie)
	}

	var thereAreErrors bool
	outermostErrorIndex := -1
	for i, err := range loadersErrors {
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

	// __TODO -- this is a bit of a mess, also should dedupe
	if thereAreErrors {
		var activePathData ActivePathData = ActivePathData{}
		locMatchingPaths := (*item.FullyDecoratedMatchingPaths)[:outermostErrorIndex+1]
		activePathData.MatchingPaths = &locMatchingPaths
		locLoadersData := loadersData[:outermostErrorIndex]
		activePathData.LoadersData = &locLoadersData
		locImportURLs := (*item.ImportURLs)[:outermostErrorIndex+1]
		activePathData.ImportURLs = &locImportURLs
		activePathData.OutermostErrorIndex = outermostErrorIndex
		locActionData := make([]any, len(*activePathData.ImportURLs))
		activePathData.ActionData = &locActionData
		activePathData.SplatSegments = item.SplatSegments
		activePathData.Params = item.Params

		locHeadBlocksOuter := loadersHeadBlocks[:outermostErrorIndex]
		locHeadBlocksInner := make([]*HeadBlock, 0, len(locHeadBlocksOuter))
		for _, headBlocks := range locHeadBlocksOuter {
			locHeadBlocksInner = append(locHeadBlocksInner, headBlocks...)
		}
		activePathData.HeadBlocks = &locHeadBlocksInner

		return &activePathData, baseLoaderProps, false
	}

	var activePathData ActivePathData = ActivePathData{}
	activePathData.MatchingPaths = item.FullyDecoratedMatchingPaths
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

	locHeadBlocksInner := make([]*HeadBlock, 0, len(loadersHeadBlocks))
	for _, headBlocks := range loadersHeadBlocks {
		locHeadBlocksInner = append(locHeadBlocksInner, headBlocks...)
	}
	activePathData.HeadBlocks = &locHeadBlocksInner

	return &activePathData, baseLoaderProps, false
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
