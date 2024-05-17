package router

import (
	"fmt"

	"hwy-docs/internal/datafuncsmap"
	"hwy-docs/internal/middleware"
	"hwy-docs/internal/platform"

	"github.com/go-chi/chi/v5"
	"github.com/joho/godotenv"
	"github.com/sjc5/hwy-go"
)

func init() {
	godotenv.Load()
}

var Hwy = hwy.Hwy{}

func init() {
	privateFS, err := platform.Kiruna.GetPrivateFS()
	if err != nil {
		panic(fmt.Sprintf("Error loading private FS: %v", err))
	}

	var defaultHeadBlocks = []hwy.HeadBlock{
		{
			Title: "Hwy",
		},
		{
			Tag: "meta",
			Attributes: map[string]string{
				"name":    "description",
				"content": "Hwy is a simple, lightweight, and flexible web framework.",
			},
		},
		{
			Tag: "meta",
			Attributes: map[string]string{
				"name":    "og:image",
				"content": platform.Kiruna.GetPublicURL("create-hwy-snippet.webp"),
			},
		},
	}

	Hwy = hwy.Hwy{
		DefaultHeadBlocks:    defaultHeadBlocks,
		FS:                   privateFS,
		RootTemplateLocation: "templates/index.go.html",
		RootTemplateData: map[string]any{
			"Kiruna":         platform.Kiruna,
			"ClientEntryURL": platform.Kiruna.GetPublicURL("hwy_client_entry.js"),
		},
		DataFuncsMap: datafuncsmap.DataFuncsMap,
	}

	err = Hwy.Initialize()
	if err != nil {
		fmt.Println(err)
		panic("Error initializing Hwy")
	}
}

func Init() *chi.Mux {
	r := chi.NewRouter()
	middleware.ApplyGlobal(r)
	r.Handle("/public/*", platform.Kiruna.GetServeStaticHandler("/public/", true))
	r.Handle("/*", Hwy.GetRootHandler())
	return r
}
