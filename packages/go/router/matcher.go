package router

import "strings"

type matcherOutput struct {
	matches            bool
	params             Params
	score              int
	realSegmentsLength int
}

type MatchStrength struct {
	Score              int
	RealSegmentsLength int
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
	params := make(Params)
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
		params:             params,
		score:              strength.Score,
		realSegmentsLength: strength.RealSegmentsLength,
	}
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
