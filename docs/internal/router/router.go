package router

import (
	"fmt"

	root "hwy-docs"
	"hwy-docs/internal/datafuncsmap"
	"hwy-docs/internal/middleware"

	"github.com/go-chi/chi/v5"
	"github.com/joho/godotenv"
	hwy "github.com/sjc5/hwy-go"
)

func init() {
	godotenv.Load()
}

var Hwy = hwy.Hwy{}

var clientEntryURL = root.Kiruna.GetPublicURL("hwy_client_entry.js")
var ogImageURL = root.Kiruna.GetPublicURL("create-hwy-snippet.webp")
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
			"content": ogImageURL,
		},
	},
}

func init() {
	privateFS, err := root.Kiruna.GetPrivateFS()
	if err != nil {
		panic(fmt.Sprintf("Error loading private FS: %v", err))
	}

	Hwy = hwy.Hwy{
		DefaultHeadBlocks:    defaultHeadBlocks,
		FS:                   privateFS,
		RootTemplateLocation: "templates/index.go.html",
		RootTemplateData: map[string]any{
			"Kiruna":         root.Kiruna,
			"ClientEntryURL": clientEntryURL,
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
	r.Handle("/public/*", root.Kiruna.GetServeStaticHandler("/public/", true))
	r.Handle("/*", Hwy.GetRootHandler())
	return r
}
