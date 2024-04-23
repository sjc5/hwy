package root

import (
	"embed"

	"github.com/sjc5/kiruna"
)

//go:embed dist/kiruna
var DistFS embed.FS

var Kiruna *kiruna.Kiruna

func init() {
	Kiruna = &kiruna.Kiruna{
		Config: &kiruna.Config{
			DistFS:     DistFS,
			EntryPoint: "cmd/app/main.go",
		},
	}
}
