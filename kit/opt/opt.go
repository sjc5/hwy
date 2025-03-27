package opt

func Resolve[F comparable](nilableOptionsObj any, field F, defaultVal F) F {
	var zeroField F
	if nilableOptionsObj == nil || field == zeroField {
		return defaultVal
	}
	return field
}
