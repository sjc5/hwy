package platform

import (
	"testers/routes-lit/dist"

	"github.com/sjc5/kiruna"
)

var Kiruna = kiruna.New(&kiruna.Config{
	DistFS:     dist.FS,
	EntryPoint: "cmd/app/main.go",
})
