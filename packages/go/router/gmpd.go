package router

import (
	"fmt"
	"net/http"
	"sync"

	"github.com/sjc5/kit/pkg/lru"
)

type Params map[string]string
type SplatSegments []string

type DecoratedPath struct {
	DataFunction DataFunction
	PathType     string // technically only needed for testing
}

type ActivePathData struct {
	MatchingPaths       []*DecoratedPath
	HeadBlocks          []*HeadBlock
	LoadersData         []any
	LoadersErrMsgs      []string
	ImportURLs          []string
	OutermostErrorIndex int
	SplatSegments       SplatSegments
	Params              Params
	Deps                []string
}

type gmpdItem struct {
	SplatSegments               SplatSegments
	Params                      Params
	FullyDecoratedMatchingPaths []*DecoratedPath
	ImportURLs                  []string
	Deps                        []string
	routeType                   RouteType
}

var gmpdCache = lru.NewCache[string, *gmpdItem](500_000)

var (
	QueryAcceptedMethods    = map[string]int{"GET": 0, "HEAD": 0}
	MutationAcceptedMethods = map[string]int{"POST": 0, "PUT": 0, "PATCH": 0, "DELETE": 0}
)

func (h *Hwy) getMaybeActionAndRouteType(realPath string, r *http.Request) (DataFunction, RouteType) {
	if !getIsHwyAPISubmit(r) {
		return nil, RouteTypesEnum.Loader
	}

	var queryAction DataFunction
	var queryActionExists bool
	var queryMethodIsPermitted bool

	var mutationAction DataFunction
	var mutationActionExists bool
	var mutationMethodIsPermitted bool

	if queryAction, queryActionExists = h.QueryActions[realPath]; queryActionExists {
		if _, queryMethodIsPermitted = QueryAcceptedMethods[r.Method]; queryMethodIsPermitted {
			return queryAction, RouteTypesEnum.QueryAction
		}
	}

	if mutationAction, mutationActionExists = h.MutationActions[realPath]; mutationActionExists {
		if _, mutationMethodIsPermitted = MutationAcceptedMethods[r.Method]; mutationMethodIsPermitted {
			return mutationAction, RouteTypesEnum.MutationAction
		}
	}

	return nil, RouteTypesEnum.NotFound
}

func getIsHwyAPISubmit(r *http.Request) bool {
	return r.Header.Get("X-Hwy-Action") != ""
}

type redirectStatus struct {
	didServerRedirect bool
	clientRedirectURL string
}

// Not for public consumption. Do not use or rely on this.
func (h *Hwy) Hwy__internal__getMatchingPathData(w http.ResponseWriter, r *http.Request) (
	*ActivePathData,
	*redirectStatus,
	RouteType,
) {
	realPath := r.URL.Path
	if realPath != "/" && realPath[len(realPath)-1] == '/' {
		realPath = realPath[:len(realPath)-1]
	}

	var item *gmpdItem

	action, routeType := h.getMaybeActionAndRouteType(realPath, r)
	if routeType == RouteTypesEnum.NotFound {
		return nil, nil, routeType
	}
	if action != nil {
		item = &gmpdItem{
			routeType:                   routeType,
			FullyDecoratedMatchingPaths: []*DecoratedPath{{DataFunction: action}},
		}
	} else {
		item = h.getGMPDItem(realPath)
	}

	numberOfLoaders := len(item.FullyDecoratedMatchingPaths)

	// loaders data
	loadersData := make([]any, numberOfLoaders)
	loadersErrMsgs := make([]string, numberOfLoaders)
	loadersHeaders := make([]http.Header, numberOfLoaders)
	loadersCookies := make([][]*http.Cookie, numberOfLoaders)
	loadersRedirects := make([]*Redirect, numberOfLoaders)
	loadersClientRedirectURLs := make([]string, numberOfLoaders)
	loadersHeadBlocks := make([][]*HeadBlock, numberOfLoaders)

	if r.URL.Query().Get("dev-revalidation") != "1" {
		var wg sync.WaitGroup

		// run loaders in parallel
		for i, path := range item.FullyDecoratedMatchingPaths {
			wg.Add(1)
			go func(i int, loader DataFunction) {
				defer wg.Done()

				if loader == nil {
					loadersData[i], loadersErrMsgs[i] = nil, ""
					return
				}

				loaderRes := loader.GetResInstance()

				if item.routeType == RouteTypesEnum.Loader {
					loader.Execute(r, item.Params, item.SplatSegments, loaderRes)
				} else {
					inputInstance, err := loader.ValidateInput(h.Validator, r, item.routeType)
					if err != nil {
						loadersErrMsgs[i] = err.Error()
						return
					}
					loader.Execute(r, inputInstance, loaderRes, w)
				}

				loadersData[i] = loaderRes.(ResponseHelper).GetData()
				loadersErrMsgs[i] = loaderRes.(ResponseHelper).GetErrMsg()
				loadersHeaders[i] = loaderRes.(ResponseHelper).GetHeaders()
				loadersCookies[i] = loaderRes.(ResponseHelper).GetCookies()
				loadersRedirects[i] = loaderRes.(ResponseHelper).GetRedirect()
				loadersClientRedirectURLs[i] = loaderRes.(ResponseHelper).GetClientRedirectURL()
				loadersHeadBlocks[i] = loaderRes.(ResponseHelper).GetHeadBlocks()
			}(i, path.DataFunction)
		}
		wg.Wait()

		// apply first redirect and return
		for _, redirect := range loadersRedirects {
			if redirect != nil && redirect.URL != "" && redirect.Code != 0 {
				http.Redirect(w, r, redirect.URL, redirect.Code)
				return nil, &redirectStatus{didServerRedirect: true}, item.routeType
			}
		}

		cookiesToSet := make([]*http.Cookie, 0, numberOfLoaders)

		// Merge headers and cookies
		for i := range numberOfLoaders {
			if loadersHeaders[i] != nil {
				for k, v := range loadersHeaders[i] {
					w.Header()[k] = v
				}
			}
			if loadersCookies[i] != nil {
				cookiesToSet = append(cookiesToSet, loadersCookies[i]...)
			}
		}

		for _, cookie := range cookiesToSet {
			http.SetCookie(w, cookie)
		}

		// apply first client redirect and return
		for _, url := range loadersClientRedirectURLs {
			if url != "" {
				return nil, &redirectStatus{clientRedirectURL: url}, item.routeType
			}
		}
	}

	var thereAreErrors bool
	outermostErrorIndex := -1
	for i, errMsg := range loadersErrMsgs {
		if errMsg != "" {
			Log.Error(fmt.Sprintf("ERROR: %s", errMsg))
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
		locErrors := loadersErrMsgs[:outermostErrorIndex+1]
		activePathData.LoadersErrMsgs = locErrors

		locHeadBlocksOuter := loadersHeadBlocks[:outermostErrorIndex]
		locHeadBlocksInner := make([]*HeadBlock, 0, len(locHeadBlocksOuter))
		for _, headBlocks := range locHeadBlocksOuter {
			locHeadBlocksInner = append(locHeadBlocksInner, headBlocks...)
		}
		activePathData.HeadBlocks = locHeadBlocksInner

		return &activePathData, nil, item.routeType
	}

	var activePathData ActivePathData = ActivePathData{}
	activePathData.MatchingPaths = item.FullyDecoratedMatchingPaths
	activePathData.LoadersData = loadersData
	activePathData.ImportURLs = item.ImportURLs
	activePathData.OutermostErrorIndex = outermostErrorIndex
	activePathData.SplatSegments = item.SplatSegments
	activePathData.Params = item.Params
	activePathData.Deps = item.Deps
	activePathData.LoadersErrMsgs = loadersErrMsgs

	locHeadBlocksInner := make([]*HeadBlock, 0, len(loadersHeadBlocks))
	for _, headBlocks := range loadersHeadBlocks {
		locHeadBlocksInner = append(locHeadBlocksInner, headBlocks...)
	}
	activePathData.HeadBlocks = locHeadBlocksInner

	return &activePathData, nil, item.routeType
}

func (h *Hwy) getGMPDItem(realPath string) *gmpdItem {
	cachedItem, cachedItemExists := gmpdCache.Get(realPath)

	var item *gmpdItem

	if cachedItemExists {
		item = cachedItem
	} else {
		// init
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
		item.Deps = h.getDeps(matchingPaths)

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
	seen := make(map[string]struct{}, len(matchingPaths))

	handleDeps := func(src []string) {
		for _, d := range src {
			if _, ok := seen[d]; !ok {
				deps = append(deps, d)
				seen[d] = struct{}{}
			}
		}
	}

	if h.clientEntryDeps != nil {
		handleDeps(h.clientEntryDeps)
	}

	for _, path := range matchingPaths {
		handleDeps(path.Deps)
	}

	return deps
}
