package dedupe

type Seen[K comparable] map[K]struct{}

func NewSeen[K comparable]() Seen[K] {
	return make(Seen[K])
}

// OK registers a key as seen, and returns true if
// the key was already seen before this call.
func (s Seen[K]) OK(key K) bool {
	if _, ok := s[key]; ok {
		return true
	}
	s[key] = struct{}{}
	return false
}
