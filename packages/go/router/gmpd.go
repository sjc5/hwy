package router

import (
	"net/http"
	"slices"
	"sync"

	"github.com/sjc5/kit/pkg/lru"
)

type LoaderProps struct {
	Request       *http.Request
	Params        map[string]string
	SplatSegments []string
}

type DecoratedPath struct {
	DataFunction DataFunction
	PathType     string // technically only needed for testing
}

type ActivePathData struct {
	MatchingPaths       []*DecoratedPath
	HeadBlocks          []*HeadBlock
	LoadersData         []any
	LoadersErrors       []error
	ImportURLs          []string
	OutermostErrorIndex int
	SplatSegments       []string
	Params              map[string]string
	Deps                []string
}

type RouteType = string

var RouteTypesEnum = struct {
	Loader         RouteType
	MutationAction RouteType
	QueryAction    RouteType
}{
	Loader:         "loader",
	MutationAction: "mutation-action",
	QueryAction:    "query-action",
}

type gmpdItem struct {
	SplatSegments               []string
	Params                      map[string]string
	FullyDecoratedMatchingPaths []*DecoratedPath
	ImportURLs                  []string
	Deps                        []string
	routeType                   RouteType
}

var gmpdCache = lru.NewCache[string, *gmpdItem](500_000)

type didRedirect = bool

var (
	queryAcceptedMethods    = map[string]int{"GET": 0, "HEAD": 0}
	mutationAcceptedMethods = map[string]int{"POST": 0, "PUT": 0, "PATCH": 0, "DELETE": 0}
)

func (h *Hwy) getMatchingPathData(w http.ResponseWriter, r *http.Request) (
	*ActivePathData,
	*LoaderProps,
	didRedirect,
	RouteType,
) {
	realPath := r.URL.Path
	if realPath != "/" && realPath[len(realPath)-1] == '/' {
		realPath = realPath[:len(realPath)-1]
	}

	var item *gmpdItem

	if action, exists := h.QueryActionsMap[realPath]; exists {
		_, shouldRunAction := queryAcceptedMethods[r.Method]
		if !shouldRunAction {
			http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
			return nil, nil, true, RouteTypesEnum.QueryAction
		}
		item = &gmpdItem{
			routeType:                   RouteTypesEnum.QueryAction,
			FullyDecoratedMatchingPaths: []*DecoratedPath{{DataFunction: action}},
		}
	} else if action, exists := h.MutationActionsMap[r.URL.Path]; exists {
		_, shouldRunAction := mutationAcceptedMethods[r.Method]
		if !shouldRunAction {
			http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
			return nil, nil, true, RouteTypesEnum.MutationAction
		}
		item = &gmpdItem{
			routeType:                   RouteTypesEnum.MutationAction,
			FullyDecoratedMatchingPaths: []*DecoratedPath{{DataFunction: action}},
		}
	} else {
		item = h.getGMPDItem(realPath)
	}

	numberOfLoaders := len(item.FullyDecoratedMatchingPaths)

	// loaders data
	loadersData := make([]any, numberOfLoaders)
	loadersErrors := make([]error, numberOfLoaders)
	loadersHeaders := make([]http.Header, numberOfLoaders)
	loadersCookies := make([][]*http.Cookie, numberOfLoaders)
	loadersRedirects := make([]*Redirect, numberOfLoaders)
	loadersHeadBlocks := make([][]*HeadBlock, numberOfLoaders)

	var wg sync.WaitGroup
	baseLoaderProps := &LoaderProps{
		Request:       r,
		Params:        item.Params,
		SplatSegments: item.SplatSegments,
	}

	// run loaders in parallel
	for i, path := range item.FullyDecoratedMatchingPaths {
		wg.Add(1)
		go func(i int, loader DataFunction) {
			defer wg.Done()

			if loader == nil {
				loadersData[i], loadersErrors[i] = nil, nil
				return
			}

			loaderRes := loader.GetResInstance()
			if item.routeType == RouteTypesEnum.Loader {
				loader.Execute(baseLoaderProps, loaderRes)
			} else {
				validator := h.GetValidator()
				if item.routeType == RouteTypesEnum.QueryAction {
					inputInstance, err := loader.ValidateQueryInput(validator, r)
					if err != nil {
						loadersErrors[i] = err
						return
					}
					loader.Execute(r, inputInstance, loaderRes)
				} else if item.routeType == RouteTypesEnum.MutationAction {
					inputInstance, err := loader.ValidateMutationInput(validator, r)
					if err != nil {
						loadersErrors[i] = err
						return
					}
					loader.Execute(r, inputInstance, loaderRes)
				}
			}

			loadersData[i] = loaderRes.(DataFunctionPropsGetter).GetData()
			loadersErrors[i] = loaderRes.(DataFunctionPropsGetter).GetError()
			loadersHeaders[i] = loaderRes.(DataFunctionPropsGetter).GetHeaders()
			loadersCookies[i] = loaderRes.(DataFunctionPropsGetter).GetCookies()
			loadersRedirects[i] = loaderRes.(DataFunctionPropsGetter).GetRedirect()
			loadersHeadBlocks[i] = loaderRes.(DataFunctionPropsGetter).GetHeadBlocks()
		}(i, path.DataFunction)
	}
	wg.Wait()

	// __TODO question, should redirects, cookies, etc. be conditional on no errors?
	// if so, same or different for loaders and actions?

	// apply first redirect and return
	for _, redirect := range loadersRedirects {
		if redirect != nil && redirect.URL != "" && redirect.Code != 0 {
			http.Redirect(w, r, redirect.URL, redirect.Code)
			return nil, baseLoaderProps, true, item.routeType
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

	if thereAreErrors && item.routeType == RouteTypesEnum.Loader {
		var activePathData ActivePathData = ActivePathData{}
		locMatchingPaths := item.FullyDecoratedMatchingPaths[:outermostErrorIndex+1]
		activePathData.MatchingPaths = locMatchingPaths
		locLoadersData := loadersData[:outermostErrorIndex]
		activePathData.LoadersData = locLoadersData
		locImportURLs := item.ImportURLs[:outermostErrorIndex+1]
		activePathData.ImportURLs = locImportURLs
		activePathData.OutermostErrorIndex = outermostErrorIndex
		activePathData.SplatSegments = item.SplatSegments
		activePathData.Params = item.Params
		locErrors := loadersErrors[:outermostErrorIndex+1]
		activePathData.LoadersErrors = locErrors

		locHeadBlocksOuter := loadersHeadBlocks[:outermostErrorIndex]
		locHeadBlocksInner := make([]*HeadBlock, 0, len(locHeadBlocksOuter))
		for _, headBlocks := range locHeadBlocksOuter {
			locHeadBlocksInner = append(locHeadBlocksInner, headBlocks...)
		}
		activePathData.HeadBlocks = locHeadBlocksInner

		return &activePathData, baseLoaderProps, false, item.routeType
	}

	var activePathData ActivePathData = ActivePathData{}
	activePathData.MatchingPaths = item.FullyDecoratedMatchingPaths
	activePathData.LoadersData = loadersData
	activePathData.ImportURLs = item.ImportURLs
	activePathData.OutermostErrorIndex = outermostErrorIndex
	activePathData.SplatSegments = item.SplatSegments
	activePathData.Params = item.Params
	activePathData.Deps = item.Deps
	activePathData.LoadersErrors = loadersErrors

	locHeadBlocksInner := make([]*HeadBlock, 0, len(loadersHeadBlocks))
	for _, headBlocks := range loadersHeadBlocks {
		locHeadBlocksInner = append(locHeadBlocksInner, headBlocks...)
	}
	activePathData.HeadBlocks = locHeadBlocksInner

	return &activePathData, baseLoaderProps, false, item.routeType
}

func (h *Hwy) getGMPDItem(realPath string) *gmpdItem {
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
					DataFunction:       path.DataFunction,
					Params:             matcherOutput.params,
					Deps:               path.Deps,
				})
			}
		}

		// get matching paths internal
		splatSegments, matchingPaths := getMatchingPathsInternal(initialMatchingPaths, realPath)

		// last path
		var lastPath = &MatchingPath{}
		if len(matchingPaths) > 0 {
			lastPath = matchingPaths[len(matchingPaths)-1]
		}

		// miscellanenous
		item.FullyDecoratedMatchingPaths = decoratePaths(matchingPaths)
		item.SplatSegments = splatSegments
		item.Params = lastPath.Params
		item.routeType = RouteTypesEnum.Loader

		// import URLs
		item.ImportURLs = make([]string, 0, len(matchingPaths))
		for _, path := range matchingPaths {
			item.ImportURLs = append(item.ImportURLs, "/"+path.OutPath)
		}

		// deps
		deps := h.getDeps(matchingPaths)
		item.Deps = deps

		// cache
		// isSpam if no matching paths --> avoids cache poisoning while still allowing for cache hits
		isSpam := len(matchingPaths) == 0
		gmpdCache.Set(realPath, item, isSpam)
	}

	return item
}

func decoratePaths(paths []*MatchingPath) []*DecoratedPath {
	decoratedPaths := make([]*DecoratedPath, 0, len(paths))
	for _, path := range paths {
		decoratedPaths = append(decoratedPaths, &DecoratedPath{
			DataFunction: path.DataFunction,
			PathType:     path.PathType,
		})
	}
	return decoratedPaths
}

func (h *Hwy) getDeps(matchingPaths []*MatchingPath) []string {
	var deps []string
	for _, path := range matchingPaths {
		if path.Deps == nil {
			continue
		}
		for _, dep := range path.Deps {
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
