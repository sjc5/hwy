package main

import (
	"encoding/json"
	"fmt"
)

// If embedded direct with no json tag: just as though it were top-level
// If embedded pointer with no json tag: just as though top-level, but fields optional
// If embedded direct with json tag: tag becomes a required root field under which its fields are nested
// If embedded pointer with json tag: tag becomes an optional root field under which its fields are nested

type Base struct{ Name string }
type BasePtr struct{ NamePtr string }
type Wrapper struct {
	BuiltIn string
	Base
	*BasePtr
}
type WrapperWithJSONTags struct {
	BuiltIn  string
	Base     `json:"base"`
	*BasePtr `json:"basePtr"`
}

func main() {
	w := Wrapper{}
	wJsonTags := WrapperWithJSONTags{}

	jsonBytes_w, _ := json.Marshal(w)
	fmt.Println(string(jsonBytes_w))

	jsonBytes_wJsonTags, _ := json.Marshal(wJsonTags)
	fmt.Println(string(jsonBytes_wJsonTags))
}
