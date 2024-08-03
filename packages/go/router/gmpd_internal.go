package router

import (
	"sort"
	"strings"
)

type MatchingPath struct {
	Score              int
	RealSegmentsLength int
	Segments           []string
	PathType           string
	DataFunction       DataFunction
	APIPathType        string
	OutPath            string
	Params             map[string]string
	Deps               []string
}

type GroupedBySegmentLength map[int][]*MatchingPath

func getMatchingPathsInternal(pathsArg []MatchingPath, realPath string) ([]string, []*MatchingPath) {
	var paths []*MatchingPath
	for _, x := range pathsArg {
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
		shouldMoveOn := len(x.Segments) <= indexAdjustedRealSegmentsLength
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
		for _, segment := range x.Segments {
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

	var splatSegments []string

	// if only one match now, return it
	if len(paths) == 1 {
		if paths[0].PathType == PathTypeUltimateCatch {
			splatSegments = getBaseSplatSegments(realPath)
		}
		return splatSegments, paths
	}

	// now we only have real child paths

	// these are essentially any matching static layout routes
	var definiteMatches []*MatchingPath // static layout matches
	for _, x := range paths {
		if x.PathType == PathTypeStaticLayout {
			definiteMatches = append(definiteMatches, x)
		}
	}

	highestScoresBySegmentLengthOfDefiniteMatches := getHighestScoresBySegmentLength(definiteMatches)

	// the "maybe matches" need to compete with each other
	// they also need some more complicated logic

	groupedBySegmentLength := make(GroupedBySegmentLength)

	for _, x := range paths {
		if x.PathType != PathTypeStaticLayout {
			segmentLength := len(x.Segments)

			highestScoreForThisSegmentLength, exists := highestScoresBySegmentLengthOfDefiniteMatches[segmentLength]

			if !exists || x.Score > highestScoreForThisSegmentLength {
				if groupedBySegmentLength[segmentLength] == nil {
					groupedBySegmentLength[segmentLength] = []*MatchingPath{}
				}
				groupedBySegmentLength[segmentLength] = append(groupedBySegmentLength[segmentLength], x)
			}
		}
	}

	sortedGroupedBySegmentLength := getSortedGroupedBySegmentLength(groupedBySegmentLength)

	var xformedMaybes []*MatchingPath
	var wildcardSplat *MatchingPath = nil
	for _, paths := range sortedGroupedBySegmentLength {
		winner := paths[0]
		highestScore := winner.Score
		var indexCandidate *MatchingPath = nil

		for _, path := range paths {
			if path.PathType == PathTypeIndex && path.RealSegmentsLength < len(path.Segments) {
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
				if len(x.Segments) >= 1 && len(winner.Segments) >= 2 {
					lastSegmentOfX := x.Segments[len(x.Segments)-1]
					secondToLastSegmentOfWinner := winner.Segments[len(winner.Segments)-2]
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

	maybeFinalPaths := getMaybeFinalPaths(definiteMatches, xformedMaybes)

	if len(maybeFinalPaths) > 0 {
		lastPath := maybeFinalPaths[len(maybeFinalPaths)-1]

		// get index-adjusted segments length
		var lastPathSegmentsLengthConstructive int
		if lastPath.PathType == PathTypeIndex {
			lastPathSegmentsLengthConstructive = len(lastPath.Segments) - 1
		} else {
			lastPathSegmentsLengthConstructive = len(lastPath.Segments)
		}

		splatIsTooFarOut := lastPathSegmentsLengthConstructive > lastPath.RealSegmentsLength
		splatIsNeeded := lastPathSegmentsLengthConstructive < lastPath.RealSegmentsLength
		isNotASplat := lastPath.PathType != PathTypeNonUltimateSplat
		weNeedADifferentSplat := splatIsTooFarOut || (splatIsNeeded && isNotASplat)

		if weNeedADifferentSplat {
			if wildcardSplat != nil {
				maybeFinalPaths[len(maybeFinalPaths)-1] = wildcardSplat
				splatSegments = getSplatSegmentsFromWinningPath(wildcardSplat, realPath)
			} else {
				splatSegments = getBaseSplatSegments(realPath)
				var filteredPaths []*MatchingPath
				for _, x := range pathsArg {
					if x.PathType == PathTypeUltimateCatch {
						filteredPaths = append(filteredPaths, &x)
						break
					}
				}
				return splatSegments, filteredPaths
			}
		}
	}

	// if a dynamic layout is adjacent and before an index, we need to remove it
	// IF the index does not share the same dynamic segment
	for i := 0; i < len(maybeFinalPaths); i++ {
		current := maybeFinalPaths[i]
		var next MatchingPath
		if i+1 < len(maybeFinalPaths) {
			locNext := maybeFinalPaths[i+1]
			next = *locNext
		}

		if current.PathType == PathTypeDynamicLayout && next.PathType == PathTypeIndex {
			currentDynamicSegment := current.Segments[len(current.Segments)-1]
			nextDynamicSegment := next.Segments[len(next.Segments)-2]
			if currentDynamicSegment != nextDynamicSegment {
				maybeFinalPaths = append(maybeFinalPaths[:i], maybeFinalPaths[i+1:]...)
			}
		}
	}

	return splatSegments, maybeFinalPaths
}

func findNonUltimateSplat(paths []*MatchingPath) *MatchingPath {
	for _, path := range paths {
		if path.PathType == PathTypeNonUltimateSplat {
			return path // Return a pointer to the matching path
		}
	}
	return nil // Return nil if no matching path is found
}

func getSortedGroupedBySegmentLength(groupedBySegmentLength GroupedBySegmentLength) [][]*MatchingPath {
	keys := make([]int, 0, len(groupedBySegmentLength))
	for k := range groupedBySegmentLength {
		keys = append(keys, k)
	}

	// Sort the keys in ascending order
	sort.Ints(keys)

	sortedGroupedBySegmentLength := make([][]*MatchingPath, 0, len(groupedBySegmentLength))
	for _, k := range keys {
		sortedGroupedBySegmentLength = append(sortedGroupedBySegmentLength, groupedBySegmentLength[k])
	}

	return sortedGroupedBySegmentLength
}

func getHighestScoresBySegmentLength(matches []*MatchingPath) map[int]int {
	highestScores := make(map[int]int)
	for _, match := range matches {
		segmentLength := len(match.Segments)
		if currentScore, exists := highestScores[segmentLength]; !exists || match.Score > currentScore {
			highestScores[segmentLength] = match.Score
		}
	}
	return highestScores
}

func getSplatSegmentsFromWinningPath(winner *MatchingPath, realPath string) []string {
	data := strings.Split(realPath, "/")

	filteredData := []string{}
	for _, segment := range data {
		if segment != "" {
			filteredData = append(filteredData, segment)
		}
	}

	numOfNonSplatSegments := 0
	for _, x := range winner.Segments {
		if x != "$" {
			numOfNonSplatSegments++
		}
	}

	numOfSplatSegments := len(filteredData) - numOfNonSplatSegments
	if numOfSplatSegments > 0 {
		final := filteredData[len(filteredData)-numOfSplatSegments:]
		return final
	} else {
		return []string{}
	}
}

func getWinnerIsDynamicIndex(winner *MatchingPath) bool {
	segmentsLength := len(winner.Segments)
	if winner.PathType == PathTypeIndex && segmentsLength >= 2 {
		secondToLastSegment := winner.Segments[segmentsLength-2]
		return strings.HasPrefix(secondToLastSegment, "$")
	}
	return false
}

func getMaybeFinalPaths(definiteMatches, xformedMaybes []*MatchingPath) []*MatchingPath {
	maybeFinalPaths := append(definiteMatches, xformedMaybes...)
	sort.Slice(maybeFinalPaths, func(i, j int) bool {
		return len(maybeFinalPaths[i].Segments) < len(maybeFinalPaths[j].Segments)
	})
	return maybeFinalPaths
}

func getBaseSplatSegments(realPath string) []string {
	var splatSegments []string
	for _, segment := range strings.Split(realPath, "/") {
		if len(segment) > 0 {
			splatSegments = append(splatSegments, segment)
		}
	}
	return splatSegments
}
