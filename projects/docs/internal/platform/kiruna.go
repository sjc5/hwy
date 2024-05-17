package platform

import (
	"hwy-docs/dist"

	"github.com/sjc5/kiruna"
)

var Kiruna = kiruna.New(&kiruna.Config{
	DistFS:     dist.FS,
	EntryPoint: "cmd/app/main.go",
})
