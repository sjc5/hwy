package router

import (
	"fmt"
	"maps"
	"net/http"

	"github.com/sjc5/kit/pkg/htmlutil"
	"github.com/sjc5/kit/pkg/lru"
	"github.com/sjc5/kit/pkg/matcher"
	"github.com/sjc5/kit/pkg/mux"
	"github.com/sjc5/kit/pkg/tasks"
)

type SplatValues []string

type ActivePathData struct {
	HeadBlocks  []*htmlutil.Element
	LoadersData []any
	// LoadersErrMsgs      []string
	LoadersErrs         []error
	ImportURLs          []string
	OutermostErrorIndex int
	SplatValues         SplatValues
	Params              mux.Params
	Deps                []string
}

type gmpdItem struct {
	_match_results *matcher.FindNestedMatchesResults
	Params         mux.Params
	SplatValues    SplatValues
	DataFunctions  []DataFunction
	ImportURLs     []string
	Deps           []string
	routeType      RouteType
}

var gmpdCache = lru.NewCache[string, *gmpdItem](500_000)

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
		if _, queryMethodIsPermitted = QueryMethods[r.Method]; queryMethodIsPermitted {
			return queryAction, RouteTypesEnum.QueryAction
		}
	}

	if mutationAction, mutationActionExists = h.MutationActions[realPath]; mutationActionExists {
		if _, mutationMethodIsPermitted = MutationMethods[r.Method]; mutationMethodIsPermitted {
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

func (h *Hwy) getMatchingPathData(tasksCtx *tasks.TasksCtx, w http.ResponseWriter, r *http.Request) (*ActivePathData, *redirectStatus, RouteType) {
	realPath := r.URL.Path
	if realPath != "/" && realPath[len(realPath)-1] == '/' {
		realPath = realPath[:len(realPath)-1]
	}

	var item *gmpdItem

	action, routeType := h.getMaybeActionAndRouteType(realPath, r)

	// IF NOT FOUND
	if routeType == RouteTypesEnum.NotFound {
		return nil, nil, routeType
	}

	// IF QUERY OR MUTATION
	if action != nil {

		item = &gmpdItem{
			routeType:     routeType,
			DataFunctions: []DataFunction{action},
		}

	} else {
		// IF LOADER

		// IF CACHE HIT
		if cachedItem, cachedItemExists := gmpdCache.Get(realPath); cachedItemExists {

			item = cachedItem

		} else {

			// IF NOT CACHE HIT
			item = new(gmpdItem)

			_match_results, ok := mux.FindNestedMatches(h.NestedRouter, r)

			if !ok {

				// NOT FOUND, SET CACHE (AS SPAM) AND MOVE ON
				gmpdCache.Set(realPath, item, true)

			} else {

				// IF WE GET HERE, IT MEANS WE FOUND MATCHES BUT THEY ARE NOT IN THE CACHE YET,
				// AND WE NEED TO PROCESS THEM

				item._match_results = _match_results

				_matches := _match_results.Matches
				_matches_len := len(_matches)

				item.SplatValues = _match_results.SplatValues
				item.Params = _match_results.Params
				item.routeType = RouteTypesEnum.Loader

				item.ImportURLs = make([]string, 0, _matches_len)
				for _, path := range _matches {
					// find the path to use
					foundPath := h._paths[path.OriginalPattern()]
					if foundPath == nil {
						continue
					}
					pathToUse := foundPath.OutPath
					if h._isDev {
						pathToUse = foundPath.SrcPath
					}

					item.ImportURLs = append(item.ImportURLs, "/"+pathToUse)
				}

				item.Deps = h.getDeps(_matches)

				// cache
				// isSpam if no matching paths --> avoids cache poisoning while still allowing for cache hits
				isSpam := _matches_len == 0
				gmpdCache.Set(realPath, item, isSpam)
			}
		}

	}

	_tasks_results := mux.RunNestedTasks(h.NestedRouter, tasksCtx, r, item._match_results)

	// __TODO fix this upstream

	var numberOfLoaders int
	if item._match_results != nil {
		numberOfLoaders = len(item._match_results.Matches)
	}

	// loaders data
	loadersData := make([]any, numberOfLoaders)
	// loadersErrMsgs := make([]string, numberOfLoaders)
	loadersErrs := make([]error, numberOfLoaders)

	loadersHeaders := make([]http.Header, numberOfLoaders)
	loadersCookies := make([][]*http.Cookie, numberOfLoaders)
	loadersRedirects := make([]*Redirect, numberOfLoaders)
	loadersClientRedirectURLs := make([]string, numberOfLoaders)
	loadersHeadBlocks := make([][]*htmlutil.Element, numberOfLoaders)

	if r.URL.Query().Get("dev-revalidation") != "1" {

		// __TODO this used to share the same for both loaders and actions,
		// and it would validate input for actions (no need for loaders)
		// need to re-create all that but in a cleaner way

		// should deprecate the DataFunction concept altogether, and instead do
		// action handling at the nestedrouter package level I think -- same as
		// for all this cookie merging stuff

		if numberOfLoaders > 0 {
			for i, result := range _tasks_results.Slice {
				if result != nil {
					loadersData[i] = result.Data()
					loadersErrs[i] = result.Err()
				}
			}
		}

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
				maps.Copy(w.Header(), loadersHeaders[i])
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
	for i, err := range loadersErrs {
		if err != nil {
			Log.Error(fmt.Sprintf("ERROR: %s", err))
			thereAreErrors = true
			outermostErrorIndex = i
			break
		}
	}

	if thereAreErrors && item.routeType == RouteTypesEnum.Loader {
		headBlocksDoubleSlice := loadersHeadBlocks[:outermostErrorIndex]
		headblocks := make([]*htmlutil.Element, 0, len(headBlocksDoubleSlice))
		for _, slice := range headBlocksDoubleSlice {
			headblocks = append(headblocks, slice...)
		}

		return &ActivePathData{
			LoadersData:         loadersData[:outermostErrorIndex],
			ImportURLs:          item.ImportURLs[:outermostErrorIndex+1],
			OutermostErrorIndex: outermostErrorIndex,
			SplatValues:         item.SplatValues,
			Params:              item.Params,
			// LoadersErrMsgs:      loadersErrs[:outermostErrorIndex+1],
			LoadersErrs: loadersErrs[:outermostErrorIndex+1],
			HeadBlocks:  headblocks,
		}, nil, item.routeType
	}

	headblocks := make([]*htmlutil.Element, 0, len(loadersHeadBlocks))
	for _, slice := range loadersHeadBlocks {
		headblocks = append(headblocks, slice...)
	}

	return &ActivePathData{
		LoadersData:         loadersData,
		ImportURLs:          item.ImportURLs,
		OutermostErrorIndex: outermostErrorIndex,
		SplatValues:         item.SplatValues,
		Params:              item.Params,
		Deps:                item.Deps,
		// LoadersErrMsgs:      loadersErrMsgs,
		LoadersErrs: loadersErrs,
		HeadBlocks:  headblocks,
	}, nil, item.routeType
}

func (h *Hwy) getDeps(_matches []*matcher.Match) []string {
	var deps []string
	seen := make(map[string]struct{}, len(_matches))

	handleDeps := func(src []string) {
		for _, d := range src {
			if _, ok := seen[d]; !ok {
				deps = append(deps, d)
				seen[d] = struct{}{}
			}
		}
	}

	if h._clientEntryDeps != nil {
		handleDeps(h._clientEntryDeps)
	}

	for _, match := range _matches {
		path := h._paths[match.OriginalPattern()]
		if path == nil {
			continue
		}
		handleDeps(path.Deps)
	}

	return deps
}
