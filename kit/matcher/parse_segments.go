package matcher

func ParseSegments(path string) []string {
	// Fast path for common cases
	if path == "" {
		return []string{}
	}
	if path == "/" {
		return []string{""}
	}

	// Skip leading slash
	startIdx := 0
	if path[0] == '/' {
		startIdx = 1
	}

	// Maximum potential segments
	var maxSegments int
	for i := startIdx; i < len(path); i++ {
		if path[i] == '/' {
			maxSegments++
		}
	}

	// Add one more for the final segment
	if len(path) > 0 {
		maxSegments++
	}

	if maxSegments == 0 {
		return nil
	}

	segs := make([]string, 0, maxSegments)

	var start = startIdx

	for i := startIdx; i < len(path); i++ {
		if path[i] == '/' {
			if i > start {
				segs = append(segs, path[start:i])
			}
			start = i + 1
		}
	}

	// Add final segment
	if start < len(path) {
		segs = append(segs, path[start:])
	}

	if len(path) > 0 && path[len(path)-1] == '/' {
		// Add empty string for trailing slash
		segs = append(segs, "")
	}

	return segs
}
