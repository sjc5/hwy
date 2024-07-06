package router

import (
	"bytes"
	"crypto/sha1"
	"encoding/json"
	"errors"
	"fmt"
	"html/template"
	"io/fs"
	"net/http"
	"slices"
	"sort"
	"strings"
	"sync"

	"github.com/sjc5/kit/pkg/lru"
)

type DataFunction interface {
	Execute(props any) (any, error)
	GetInputInstance() any
	GetOutputInstance() any
}

// START -- NEEDS TO BE REPEATED IN hwy.go

type LoaderFunc[O any] func(props *LoaderProps) (O, error)

func (f LoaderFunc[O]) Execute(props any) (any, error) {
	return f(props.(*LoaderProps))
}
func (f LoaderFunc[O]) GetInputInstance() any {
	return nil
}
func (f LoaderFunc[O]) GetOutputInstance() any {
	var x O
	return x
}

type ActionFunc[I any, O any] func(props *ActionProps) (O, error)

func (f ActionFunc[I, O]) Execute(props any) (any, error) {
	return f(props.(*ActionProps))
}
func (f ActionFunc[I, O]) GetInputInstance() any {
	var x I
	return x
}
func (f ActionFunc[I, O]) GetOutputInstance() any {
	var x O
	return x
}

type HeadFunc func(props *HeadProps) (*[]HeadBlock, error)

func (f HeadFunc) Execute(props any) (any, error) {
	return f(props.(*HeadProps))
}
func (f HeadFunc) GetInputInstance() any {
	return nil
}
func (f HeadFunc) GetOutputInstance() any {
	return nil
}

// END -- NEEDS TO BE REPEATED IN hwy.go

func NewRoute[
	LO any, AI any, AO any,
](
	pattern, pathType string, loader LoaderFunc[LO], action ActionFunc[AI, AO], head HeadFunc,
) Path {
	return Path{
		Pattern:  pattern,
		PathType: pathType,
		DataFuncs: &DataFuncs{
			Loader: loader,
			Action: action,
			Head:   head,
		},
	}
}

type SegmentObj struct {
	SegmentType string
	Segment     string
}

const (
	PathTypeUltimateCatch    = "ultimate-catch"
	PathTypeIndex            = "index"
	PathTypeStaticLayout     = "static-layout"
	PathTypeDynamicLayout    = "dynamic-layout"
	PathTypeNonUltimateSplat = "non-ultimate-splat"
)

type Path struct {
	Pattern   string     `json:"pattern"`
	Segments  *[]string  `json:"segments"`
	PathType  string     `json:"pathType"`
	OutPath   string     `json:"outPath"`
	SrcPath   string     `json:"srcPath"`
	Deps      *[]string  `json:"deps"`
	DataFuncs *DataFuncs `json:",omitempty"`
}

type JSONSafePath struct {
	Pattern  string    `json:"pattern"`
	Segments *[]string `json:"segments"`
	PathType string    `json:"pathType"`
	OutPath  string    `json:"outPath"`
	SrcPath  string    `json:"srcPath"`
	Deps     *[]string `json:"deps"`
}

type HeadBlock struct {
	Tag        string            `json:"tag,omitempty"`
	Attributes map[string]string `json:"attributes,omitempty"`
	Title      string            `json:"title,omitempty"`
}

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

type HeadProps struct {
	Request       *http.Request
	Params        *map[string]string
	SplatSegments *[]string
	LoaderData    any
	ActionData    any
	AdHocData     any
}

type DataFuncs struct {
	Loader      DataFunction
	Action      DataFunction
	Head        DataFunction
	HandlerFunc http.HandlerFunc
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

type matcherOutput struct {
	matches            bool
	params             *map[string]string
	score              int
	realSegmentsLength int
}

type GroupedBySegmentLength map[int]*[]*MatchingPath
type DataFuncsMap map[string]DataFuncs

type MatchStrength struct {
	Score              int
	RealSegmentsLength int
}

type MatchingPath struct {
	Score              int
	RealSegmentsLength int
	Segments           *[]string
	PathType           string
	DataFuncs          *DataFuncs
	OutPath            string
	Params             *map[string]string
	Deps               *[]string
}

type DecoratedPath struct {
	DataFuncs *DataFuncs
	PathType  string // technically only needed for testing
}

type gmpdItem struct {
	SplatSegments               *[]string
	Params                      *map[string]string
	FullyDecoratedMatchingPaths *[]*DecoratedPath
	ImportURLs                  *[]string
	Deps                        *[]string
}

type GetRouteDataOutput struct {
	Title               string             `json:"title"`
	MetaHeadBlocks      *[]*HeadBlock      `json:"metaHeadBlocks"`
	RestHeadBlocks      *[]*HeadBlock      `json:"restHeadBlocks"`
	LoadersData         *[]any             `json:"loadersData"`
	ImportURLs          *[]string          `json:"importURLs"`
	OutermostErrorIndex int                `json:"outermostErrorIndex"`
	SplatSegments       *[]string          `json:"splatSegments"`
	Params              *map[string]string `json:"params"`
	ActionData          *[]any             `json:"actionData"`
	AdHocData           any                `json:"adHocData"`
	BuildID             string             `json:"buildID"`
	Deps                *[]string          `json:"deps"`
}

type Hwy struct {
	DefaultHeadBlocks    []HeadBlock
	FS                   fs.FS
	DataFuncsMap         DataFuncsMap
	RootTemplateLocation string
	RootTemplateData     map[string]any
	getAdHocData         DataFunction
	paths                []Path
	clientEntryDeps      []string
	buildID              string
	rootTemplate         *template.Template
}

type SortHeadBlocksOutput struct {
	title          string
	metaHeadBlocks *[]*HeadBlock
	restHeadBlocks *[]*HeadBlock
}

type SSRInnerHTMLInput struct {
	HwyPrefix           string
	IsDev               bool
	BuildID             string
	LoadersData         *[]any
	ImportURLs          *[]string
	OutermostErrorIndex int
	SplatSegments       *[]string
	Params              *map[string]string
	ActionData          *[]any
	AdHocData           any
	Deps                *[]string
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

func getMatchStrength(pattern string, path string) MatchStrength {
	var patternSegments []string
	for _, segment := range strings.Split(pattern, "/") {
		if len(segment) > 0 {
			patternSegments = append(patternSegments, segment)
		}
	}
	var realSegments []string
	for _, segment := range strings.Split(path, "/") {
		if len(segment) > 0 {
			realSegments = append(realSegments, segment)
		}
	}
	score := 0
	for i := 0; i < len(patternSegments); i++ {
		if len(realSegments) >= len(patternSegments) && patternSegments[i] == realSegments[i] {
			score += 3
			continue
		}
		if patternSegments[i] == "$" {
			score += 1
			continue
		}
		if strings.HasPrefix(patternSegments[i], "$") {
			score += 2
			continue
		}
		break
	}
	return MatchStrength{score, len(realSegments)}
}

func getMatchingPathsInternal(pathsArg *[]MatchingPath, realPath string) (*[]string, *[]*MatchingPath) {
	var paths []*MatchingPath
	for _, x := range *pathsArg {
		// if it's dash route (home), no need to compare segments length
		if x.RealSegmentsLength == 0 {
			paths = append(paths, &x)
			continue
		}

		var indexAdjustedRealSegmentsLength int
		if x.PathType == PathTypeIndex {
			indexAdjustedRealSegmentsLength = x.RealSegmentsLength + 1
		} else {
			indexAdjustedRealSegmentsLength = x.RealSegmentsLength
		}

		// make sure any remaining matches are not longer than the path itself
		shouldMoveOn := len(*x.Segments) <= indexAdjustedRealSegmentsLength
		if !shouldMoveOn {
			continue
		}

		// now we need to remove ineligible indices
		if x.PathType != PathTypeIndex {
			// if not an index, then you're already confirmed good
			paths = append(paths, &x)
			continue
		}

		var truthySegments []string
		for _, segment := range *x.Segments {
			if len(segment) > 0 {
				truthySegments = append(truthySegments, segment)
			}
		}
		var pathSegments []string
		for _, segment := range strings.Split(realPath, "/") {
			if len(segment) > 0 {
				pathSegments = append(pathSegments, segment)
			}
		}
		if len(truthySegments) == len(pathSegments) {
			paths = append(paths, &x)
		}
	}

	// if there are multiple matches, filter out the ultimate catch-all
	if len(paths) > 1 {
		var nonUltimateCatchPaths []*MatchingPath
		for _, x := range paths {
			if x.PathType != PathTypeUltimateCatch {
				nonUltimateCatchPaths = append(nonUltimateCatchPaths, x)
			}
		}
		paths = nonUltimateCatchPaths
	}

	var splatSegments *[]string

	// if only one match now, return it
	if len(paths) == 1 {
		if (paths)[0].PathType == PathTypeUltimateCatch {
			splatSegments = getBaseSplatSegments(realPath)
		}
		return splatSegments, &paths
	}

	// now we only have real child paths

	// these are essentially any matching static layout routes
	var definiteMatches []*MatchingPath // static layout matches
	for _, x := range paths {
		if x.PathType == PathTypeStaticLayout {
			definiteMatches = append(definiteMatches, x)
		}
	}

	highestScoresBySegmentLengthOfDefiniteMatches := getHighestScoresBySegmentLength(&definiteMatches)

	// the "maybe matches" need to compete with each other
	// they also need some more complicated logic

	groupedBySegmentLength := make(GroupedBySegmentLength)

	for _, x := range paths {
		if x.PathType != PathTypeStaticLayout {
			segmentLength := len(*x.Segments)

			highestScoreForThisSegmentLength, exists := highestScoresBySegmentLengthOfDefiniteMatches[segmentLength]

			if !exists || x.Score > highestScoreForThisSegmentLength {
				if groupedBySegmentLength[segmentLength] == nil {
					groupedBySegmentLength[segmentLength] = &[]*MatchingPath{}
				}
				*groupedBySegmentLength[segmentLength] = append(*groupedBySegmentLength[segmentLength], x)
			}
		}
	}

	sortedGroupedBySegmentLength := getSortedGroupedBySegmentLength(groupedBySegmentLength)

	var xformedMaybes []*MatchingPath
	var wildcardSplat *MatchingPath = nil
	for _, paths := range *sortedGroupedBySegmentLength {
		winner := (*paths)[0]
		highestScore := winner.Score
		var indexCandidate *MatchingPath = nil

		for _, path := range *paths {
			if path.PathType == PathTypeIndex && path.RealSegmentsLength < len(*path.Segments) {
				if indexCandidate == nil {
					indexCandidate = path
				} else {
					if path.Score > indexCandidate.Score {
						indexCandidate = path
					}
				}
			}
			if path.Score > highestScore {
				highestScore = path.Score
				winner = path
			}
		}

		if indexCandidate != nil {
			winner = indexCandidate
		}

		// find non ultimate splat
		splat := findNonUltimateSplat(paths)

		if splat != nil {
			if wildcardSplat == nil || splat.Score > wildcardSplat.Score {
				wildcardSplat = splat
			}

			splatSegments = getSplatSegmentsFromWinningPath(winner, realPath)
		}

		// ok, problem
		// in the situation where we have a dynamic folder name with an index file within,
		// we need to make sure that other static-layout paths win over it
		// that's what this code is for

		winnerIsDynamicIndex := getWinnerIsDynamicIndex(winner)

		definiteMatchesShouldOverride := false
		if winnerIsDynamicIndex {
			for _, x := range definiteMatches {
				a := x.PathType == PathTypeStaticLayout
				b := x.RealSegmentsLength == winner.RealSegmentsLength
				var c bool
				if len(*x.Segments) >= 1 && len(*winner.Segments) >= 2 {
					lastSegmentOfX := (*x.Segments)[len(*x.Segments)-1]
					secondToLastSegmentOfWinner := (*winner.Segments)[len(*winner.Segments)-2]
					c = lastSegmentOfX != secondToLastSegmentOfWinner
				}
				d := x.Score > winner.Score
				if a && b && c && d {
					definiteMatchesShouldOverride = true
					break
				}
			}
		}

		if !definiteMatchesShouldOverride {
			xformedMaybes = append(xformedMaybes, winner)
		}
	}

	maybeFinalPaths := getMaybeFinalPaths(&definiteMatches, &xformedMaybes)

	if len(*maybeFinalPaths) > 0 {
		lastPath := (*maybeFinalPaths)[len(*maybeFinalPaths)-1]

		// get index-adjusted segments length
		var lastPathSegmentsLengthConstructive int
		if lastPath.PathType == PathTypeIndex {
			lastPathSegmentsLengthConstructive = len(*lastPath.Segments) - 1
		} else {
			lastPathSegmentsLengthConstructive = len(*lastPath.Segments)
		}

		splatIsTooFarOut := lastPathSegmentsLengthConstructive > lastPath.RealSegmentsLength
		splatIsNeeded := lastPathSegmentsLengthConstructive < lastPath.RealSegmentsLength
		isNotASplat := lastPath.PathType != PathTypeNonUltimateSplat
		weNeedADifferentSplat := splatIsTooFarOut || (splatIsNeeded && isNotASplat)

		if weNeedADifferentSplat {
			if wildcardSplat != nil {
				(*maybeFinalPaths)[len(*maybeFinalPaths)-1] = wildcardSplat
				splatSegments = getSplatSegmentsFromWinningPath(wildcardSplat, realPath)
			} else {
				splatSegments = getBaseSplatSegments(realPath)
				var filteredPaths []*MatchingPath
				for _, x := range *pathsArg {
					if x.PathType == PathTypeUltimateCatch {
						filteredPaths = append(filteredPaths, &x)
						break
					}
				}
				return splatSegments, &filteredPaths
			}
		}
	}

	// if a dynamic layout is adjacent and before an index, we need to remove it
	// IF the index does not share the same dynamic segment
	for i := 0; i < len(*maybeFinalPaths); i++ {
		current := (*maybeFinalPaths)[i]
		var next MatchingPath
		if i+1 < len(*maybeFinalPaths) {
			locNext := (*maybeFinalPaths)[i+1]
			next = *locNext
		}

		if current.PathType == PathTypeDynamicLayout && next.PathType == PathTypeIndex {
			currentDynamicSegment := (*current.Segments)[len(*current.Segments)-1]
			nextDynamicSegment := (*next.Segments)[len(*next.Segments)-2]
			if currentDynamicSegment != nextDynamicSegment {
				*maybeFinalPaths = append((*maybeFinalPaths)[:i], (*maybeFinalPaths)[i+1:]...)
			}
		}
	}

	return splatSegments, maybeFinalPaths
}

func findNonUltimateSplat(paths *[]*MatchingPath) *MatchingPath {
	for _, path := range *paths {
		if path.PathType == PathTypeNonUltimateSplat {
			return path // Return a pointer to the matching path
		}
	}
	return nil // Return nil if no matching path is found
}

func getSortedGroupedBySegmentLength(groupedBySegmentLength GroupedBySegmentLength) *[]*[]*MatchingPath {
	keys := make([]int, 0, len(groupedBySegmentLength))
	for k := range groupedBySegmentLength {
		keys = append(keys, k)
	}

	// Sort the keys in ascending order
	sort.Ints(keys)

	sortedGroupedBySegmentLength := make([]*[]*MatchingPath, 0, len(groupedBySegmentLength))
	for _, k := range keys {
		sortedGroupedBySegmentLength = append(sortedGroupedBySegmentLength, groupedBySegmentLength[k])
	}

	return &sortedGroupedBySegmentLength
}

func getHighestScoresBySegmentLength(matches *[]*MatchingPath) map[int]int {
	highestScores := make(map[int]int)
	for _, match := range *matches {
		segmentLength := len(*match.Segments)
		if currentScore, exists := highestScores[segmentLength]; !exists || match.Score > currentScore {
			highestScores[segmentLength] = match.Score
		}
	}
	return highestScores
}

func getSplatSegmentsFromWinningPath(winner *MatchingPath, realPath string) *[]string {
	data := strings.Split(realPath, "/")

	filteredData := []string{}
	for _, segment := range data {
		if segment != "" {
			filteredData = append(filteredData, segment)
		}
	}

	numOfNonSplatSegments := 0
	for _, x := range *winner.Segments {
		if x != "$" {
			numOfNonSplatSegments++
		}
	}

	numOfSplatSegments := len(filteredData) - numOfNonSplatSegments
	if numOfSplatSegments > 0 {
		final := filteredData[len(filteredData)-numOfSplatSegments:]
		return &final
	} else {
		return &[]string{}
	}
}

func getWinnerIsDynamicIndex(winner *MatchingPath) bool {
	segmentsLength := len(*winner.Segments)
	if winner.PathType == PathTypeIndex && segmentsLength >= 2 {
		secondToLastSegment := (*winner.Segments)[segmentsLength-2]
		return strings.HasPrefix(secondToLastSegment, "$")
	}
	return false
}

func getMaybeFinalPaths(definiteMatches, xformedMaybes *[]*MatchingPath) *[]*MatchingPath {
	maybeFinalPaths := append(*definiteMatches, *xformedMaybes...)
	sort.Slice(maybeFinalPaths, func(i, j int) bool {
		return len(*maybeFinalPaths[i].Segments) < len(*maybeFinalPaths[j].Segments)
	})
	return &maybeFinalPaths
}

func getBaseSplatSegments(realPath string) *[]string {
	var splatSegments []string
	for _, segment := range strings.Split(realPath, "/") {
		if len(segment) > 0 {
			splatSegments = append(splatSegments, segment)
		}
	}
	return &splatSegments
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

func getActionData(action DataFunction, actionProps *ActionProps) (any, error) {
	if action == nil {
		return nil, nil
	}
	actionFunc := action
	return actionFunc.Execute(actionProps)
}

func (h *Hwy) addDataFuncsToPaths() {
	listOfPatterns := make([]string, 0, len(h.paths))

	for i, path := range h.paths {
		if dataFuncs, ok := (h.DataFuncsMap)[path.Pattern]; ok {
			(h.paths)[i].DataFuncs = &dataFuncs
		}
		listOfPatterns = append(listOfPatterns, path.Pattern)
	}

	for pattern := range h.DataFuncsMap {
		if pattern != "AdHocData" && !slices.Contains(listOfPatterns, pattern) {
			Log.Errorf("Warning: no matching path found for pattern %v. Make sure you're writing your patterns correctly and that your client route exists.", pattern)
		}
		if pattern == "AdHocData" {
			h.getAdHocData = h.DataFuncsMap[pattern].Loader
		}
	}
}

func getBasePaths(FS fs.FS) (*PathsFile, error) {
	pathsFile := PathsFile{}
	file, err := FS.Open("hwy_paths.json")
	if err != nil {
		errMsg := fmt.Sprintf("could not open hwy_paths.json: %v", err)
		Log.Errorf(errMsg)
		return nil, errors.New(errMsg)
	}
	defer file.Close()
	decoder := json.NewDecoder(file)
	err = decoder.Decode(&pathsFile)
	if err != nil {
		errMsg := fmt.Sprintf("could not decode hwy_paths.json: %v", err)
		Log.Errorf(errMsg)
		return nil, errors.New(errMsg)
	}
	return &pathsFile, nil
}

func (h *Hwy) Initialize() error {
	if h.FS == nil {
		return errors.New("FS is nil")
	}

	pathsFile, err := getBasePaths(h.FS)
	if err != nil {
		errMsg := fmt.Sprintf("could not get base paths: %v", err)
		Log.Errorf(errMsg)
		return errors.New(errMsg)
	}
	h.buildID = pathsFile.BuildID

	if h.paths == nil {
		ip := make([]Path, 0, len(pathsFile.Paths))
		h.paths = ip
	}
	for _, path := range pathsFile.Paths {
		h.paths = append(h.paths, Path{
			Pattern:  path.Pattern,
			Segments: path.Segments,
			PathType: path.PathType,
			OutPath:  path.OutPath,
			SrcPath:  path.SrcPath,
			Deps:     path.Deps,
		})
	}

	h.addDataFuncsToPaths()
	h.clientEntryDeps = pathsFile.ClientEntryDeps

	return nil
}

func (h *Hwy) GetRouteData(w http.ResponseWriter, r *http.Request) (*GetRouteDataOutput, error) {
	activePathData, loaderProps := h.getMatchingPathData(w, r)

	var adHocData any
	var err error
	if h.getAdHocData != nil {
		adHocData, err = h.getAdHocData.Execute(loaderProps)
	}
	if err != nil {
		errMsg := fmt.Sprintf("could not get ad hoc data: %v", err)
		Log.Errorf(errMsg)
		return nil, errors.New(errMsg)
	}

	headBlocks, err := getExportedHeadBlocks(r, activePathData, &h.DefaultHeadBlocks, adHocData)
	if err != nil {
		errMsg := fmt.Sprintf("could not get exported head blocks: %v", err)
		Log.Errorf(errMsg)
		return nil, errors.New(errMsg)
	}

	sorted := sortHeadBlocks(headBlocks)
	if sorted.metaHeadBlocks == nil {
		sorted.metaHeadBlocks = &[]*HeadBlock{}
	}
	if sorted.restHeadBlocks == nil {
		sorted.restHeadBlocks = &[]*HeadBlock{}
	}

	return &GetRouteDataOutput{
		Title:               sorted.title,
		MetaHeadBlocks:      sorted.metaHeadBlocks,
		RestHeadBlocks:      sorted.restHeadBlocks,
		LoadersData:         activePathData.LoadersData,
		ImportURLs:          activePathData.ImportURLs,
		OutermostErrorIndex: activePathData.OutermostErrorIndex,
		SplatSegments:       activePathData.SplatSegments,
		Params:              activePathData.Params,
		ActionData:          activePathData.ActionData,
		AdHocData:           adHocData,
		BuildID:             h.buildID,
		Deps:                activePathData.Deps,
	}, nil
}

func getExportedHeadBlocks(
	r *http.Request, activePathData *ActivePathData, defaultHeadBlocks *[]HeadBlock, adHocData any,
) (*[]*HeadBlock, error) {
	headBlocks := make([]HeadBlock, len(*defaultHeadBlocks))
	copy(headBlocks, *defaultHeadBlocks)
	for i, head := range *activePathData.ActiveHeads {
		if head != nil {
			headProps := &HeadProps{
				Request:       r,
				Params:        activePathData.Params,
				SplatSegments: activePathData.SplatSegments,
				LoaderData:    (*activePathData.LoadersData)[i],
				ActionData:    (*activePathData.ActionData)[i],
				AdHocData:     adHocData,
			}
			localHeadBlocks, err := head.Execute(headProps)
			if err != nil {
				errMsg := fmt.Sprintf("could not get head blocks: %v", err)
				Log.Errorf(errMsg)
				return nil, errors.New(errMsg)
			}
			x := localHeadBlocks.(*[]HeadBlock)
			headBlocks = append(headBlocks, *x...)
		}
	}
	return dedupeHeadBlocks(&headBlocks), nil
}

// __TODO -- add OverrideMatchingParentsFunc that acts just like Head but lets you return simpler HeadBlocks that when matched, override the parent HeadBlocks
// additionally, would make sense to also take an a defaultOverrideHeadBlocks arg at root as well, just like DefaultHeadBlocks
// ALternatively, could build the concept into each Path level as a new opportunity to set a DefaultHeadBlocks slice, applicable to it and its children

func dedupeHeadBlocks(blocks *[]HeadBlock) *[]*HeadBlock {
	uniqueBlocks := make(map[string]*HeadBlock)
	var dedupedBlocks []*HeadBlock

	titleIdx := -1
	descriptionIdx := -1

	for _, block := range *blocks {
		if len(block.Title) > 0 {
			if titleIdx == -1 {
				titleIdx = len(dedupedBlocks)
				dedupedBlocks = append(dedupedBlocks, &block)
			} else {
				dedupedBlocks[titleIdx] = &block
			}
		} else if block.Tag == "meta" && block.Attributes["name"] == "description" {
			if descriptionIdx == -1 {
				descriptionIdx = len(dedupedBlocks)
				dedupedBlocks = append(dedupedBlocks, &block)
			} else {
				dedupedBlocks[descriptionIdx] = &block
			}
		} else {
			key := stableHash(&block)
			if _, exists := uniqueBlocks[key]; !exists {
				uniqueBlocks[key] = &block
				dedupedBlocks = append(dedupedBlocks, &block)
			}
		}
	}

	return &dedupedBlocks
}

func stableHash(block *HeadBlock) string {
	parts := make([]string, 0, len(block.Attributes))
	for key, value := range block.Attributes {
		parts = append(parts, key+"="+value)
	}
	sort.Strings(parts) // Ensure attributes are in a consistent order
	var sb strings.Builder
	sb.Grow(len(block.Tag) + 1 + (len(parts) * 16))
	sb.WriteString(block.Tag)
	sb.WriteString("|")
	for i, part := range parts {
		if i > 0 {
			sb.WriteString("&")
		}
		sb.WriteString(part)
	}
	return sb.String()
}

func sortHeadBlocks(blocks *[]*HeadBlock) SortHeadBlocksOutput {
	result := SortHeadBlocksOutput{}
	result.metaHeadBlocks = &[]*HeadBlock{}
	result.restHeadBlocks = &[]*HeadBlock{}
	for _, block := range *blocks {
		if len(block.Title) > 0 {
			result.title = block.Title
		} else if block.Tag == "meta" {
			*result.metaHeadBlocks = append(*result.metaHeadBlocks, block)
		} else {
			*result.restHeadBlocks = append(*result.restHeadBlocks, block)
		}
	}
	return result
}

const (
	metaStart = `<!-- data-hwy="meta-start" -->`
	metaEnd   = `<!-- data-hwy="meta-end" -->`
	restStart = `<!-- data-hwy="rest-start" -->`
	restEnd   = `<!-- data-hwy="rest-end" -->`
)

func GetHeadElements(routeData *GetRouteDataOutput) (*template.HTML, error) {
	var htmlBuilder strings.Builder

	// Add title
	titleTmpl, err := template.New("title").Parse(
		`<title>{{.}}</title>` + "\n",
	)
	if err != nil {
		errMsg := fmt.Sprintf("could not parse title template: %v", err)
		Log.Errorf(errMsg)
		return nil, errors.New(errMsg)
	}
	err = titleTmpl.Execute(&htmlBuilder, routeData.Title)
	if err != nil {
		errMsg := fmt.Sprintf("could not execute title template: %v", err)
		Log.Errorf(errMsg)
		return nil, errors.New(errMsg)
	}

	// Add head blocks
	htmlBuilder.WriteString(metaStart + "\n")
	for _, block := range *routeData.MetaHeadBlocks {
		if !slices.Contains(permittedTags, block.Tag) {
			continue
		}
		err := renderBlock(&htmlBuilder, block)
		if err != nil {
			errMsg := fmt.Sprintf("could not render meta head block: %v", err)
			Log.Errorf(errMsg)
			return nil, errors.New(errMsg)
		}
	}
	htmlBuilder.WriteString(metaEnd + "\n")

	htmlBuilder.WriteString(restStart + "\n")
	for _, block := range *routeData.RestHeadBlocks {
		if !slices.Contains(permittedTags, block.Tag) {
			continue
		}
		err := renderBlock(&htmlBuilder, block)
		if err != nil {
			errMsg := fmt.Sprintf("could not render rest head block: %v", err)
			Log.Errorf(errMsg)
			return nil, errors.New(errMsg)
		}
	}
	htmlBuilder.WriteString(restEnd + "\n")

	final := template.HTML(htmlBuilder.String())
	return &final, nil
}

func renderBlock(htmlBuilder *strings.Builder, block *HeadBlock) error {
	headElsTmpl, err := template.New("headblock").Parse(
		`{{range $key, $value := .Attributes}}{{$key}}="{{$value}}" {{end}}/>` + "\n",
	)
	if err != nil {
		errMsg := fmt.Sprintf("could not parse head block template: %v", err)
		Log.Errorf(errMsg)
		return errors.New(errMsg)
	}
	scriptBlockTmpl, err := template.New("scriptblock").Parse(
		`{{range $key, $value := .Attributes}}{{$key}}="{{$value}}" {{end}}></script>` + "\n",
	)
	if err != nil {
		errMsg := fmt.Sprintf("could not parse script block template: %v", err)
		Log.Errorf(errMsg)
		return errors.New(errMsg)
	}
	htmlBuilder.WriteString("<" + block.Tag + " ")
	if block.Tag == "script" {
		err = scriptBlockTmpl.Execute(htmlBuilder, block)
	} else {
		err = headElsTmpl.Execute(htmlBuilder, block)
	}
	if err != nil {
		errMsg := fmt.Sprintf("could not execute head block template: %v", err)
		Log.Errorf(errMsg)
		return errors.New(errMsg)
	}
	return nil
}

var permittedTags = []string{"meta", "base", "link", "style", "script", "noscript"}

const HwyPrefix = "__hwy_internal__"

func GetSSRInnerHTML(routeData *GetRouteDataOutput, isDev bool) (*template.HTML, error) {
	tmpl, err := template.New("ssr").Parse(`<script>
	globalThis[Symbol.for("{{.HwyPrefix}}")] = {};
	const x = globalThis[Symbol.for("{{.HwyPrefix}}")];
	x.isDev = {{.IsDev}};
	x.buildID = {{.BuildID}};
	x.loadersData = {{.LoadersData}};
	x.importURLs = {{.ImportURLs}};
	x.outermostErrorIndex = {{.OutermostErrorIndex}};
	x.splatSegments = {{.SplatSegments}};
	x.params = {{.Params}};
	x.actionData = {{.ActionData}};
	x.adHocData = {{.AdHocData}};
	const deps = {{.Deps}};
	deps.forEach(module => {
		const link = document.createElement('link');
		link.rel = 'modulepreload';
		link.href = "/public/" + module;
		document.head.appendChild(link);
	 });
</script>`)
	if err != nil {
		errMsg := fmt.Sprintf("could not parse SSR inner HTML template: %v", err)
		Log.Errorf(errMsg)
		return nil, errors.New(errMsg)
	}
	var htmlBuilder strings.Builder
	var dto = SSRInnerHTMLInput{
		HwyPrefix:           HwyPrefix,
		IsDev:               isDev,
		BuildID:             routeData.BuildID,
		LoadersData:         routeData.LoadersData,
		ImportURLs:          routeData.ImportURLs,
		OutermostErrorIndex: routeData.OutermostErrorIndex,
		SplatSegments:       routeData.SplatSegments,
		Params:              routeData.Params,
		ActionData:          routeData.ActionData,
		AdHocData:           routeData.AdHocData,
		Deps:                routeData.Deps,
	}
	err = tmpl.Execute(&htmlBuilder, dto)
	if err != nil {
		errMsg := fmt.Sprintf("could not execute SSR inner HTML template: %v", err)
		Log.Errorf(errMsg)
		return nil, errors.New(errMsg)
	}
	final := template.HTML(htmlBuilder.String())
	return &final, nil
}

func GetIsJSONRequest(r *http.Request) bool {
	queryKey := HwyPrefix + "json"
	return len(r.URL.Query().Get(queryKey)) > 0
}

func matcher(pattern, path string) matcherOutput {
	pattern = strings.TrimSuffix(pattern, "/_index") // needs to be first
	pattern = strings.TrimPrefix(pattern, "/")       // needs to be second
	path = strings.TrimPrefix(path, "/")
	patternSegments := strings.Split(pattern, "/")
	pathSegments := strings.Split(path, "/")
	isCatch := patternSegments[len(patternSegments)-1] == "$"
	if isCatch {
		patternSegments = patternSegments[:len(patternSegments)-1]
	}
	if len(patternSegments) > len(pathSegments) {
		return matcherOutput{}
	}
	params := make(map[string]string)
	for i, ps := range patternSegments {
		if i >= len(pathSegments) {
			return matcherOutput{}
		}
		if ps == pathSegments[i] {
			continue
		}
		if ps == "$" {
			continue
		}
		if strings.HasPrefix(ps, "$") {
			params[ps[1:]] = pathSegments[i]
			continue
		}
		return matcherOutput{}
	}
	strength := getMatchStrength(pattern, path)
	return matcherOutput{
		matches:            true,
		params:             &params,
		score:              strength.Score,
		realSegmentsLength: strength.RealSegmentsLength,
	}
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

func (h *Hwy) GetRootHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		routeData, err := h.GetRouteData(w, r)
		if err != nil {
			msg := "Error getting route data"
			Log.Errorf(msg+": %v\n", err)
			http.Error(w, msg, http.StatusInternalServerError)
			return
		}

		if GetIsJSONRequest(r) {
			bytes, err := json.Marshal(routeData)
			if err != nil {
				msg := "Error marshalling JSON"
				Log.Errorf(msg+": %v\n", err)
				http.Error(w, msg, http.StatusInternalServerError)
				return
			}

			etag := fmt.Sprintf("%x", sha1.Sum(bytes))
			if isNotModified(r, etag) {
				w.WriteHeader(http.StatusNotModified)
				return
			}
			w.Header().Set("ETag", etag)
			w.Header().Set("Content-Type", "application/json")
			w.Write(bytes)
			return
		}

		if h.rootTemplate == nil {
			tmpl, err := template.ParseFS(h.FS, h.RootTemplateLocation)
			if err != nil {
				msg := "Error loading template"
				Log.Errorf(msg+": %v\n", err)
				http.Error(w, msg, http.StatusInternalServerError)
				return
			}
			h.rootTemplate = tmpl
		}

		headElements, err := GetHeadElements(routeData)
		if err != nil {
			msg := "Error getting head elements"
			Log.Errorf(msg+": %v\n", err)
			http.Error(w, msg, http.StatusInternalServerError)
			return
		}

		ssrInnerHTML, err := GetSSRInnerHTML(routeData, true)
		if err != nil {
			msg := "Error getting SSR inner HTML"
			Log.Errorf(msg+": %v\n", err)
			http.Error(w, msg, http.StatusInternalServerError)
			return
		}

		tmplData := map[string]any{}
		tmplData["HeadElements"] = headElements
		tmplData["SSRInnerHTML"] = ssrInnerHTML
		for key, value := range h.RootTemplateData {
			tmplData[key] = value
		}

		var buf bytes.Buffer

		err = h.rootTemplate.Execute(&buf, tmplData)
		if err != nil {
			msg := "Error executing template"
			Log.Errorf(msg+": %v\n", err)
			http.Error(w, msg, http.StatusInternalServerError)
		}

		etag := fmt.Sprintf("%x", sha1.Sum(buf.Bytes()))
		if isNotModified(r, etag) {
			w.WriteHeader(http.StatusNotModified)
			return
		}
		w.Header().Set("ETag", etag)
		w.Header().Set("Content-Type", "text/html")
		w.Write(buf.Bytes())
	})
}

func isNotModified(r *http.Request, etag string) bool {
	match := r.Header.Get("If-None-Match")
	return match != "" && match == etag
}
