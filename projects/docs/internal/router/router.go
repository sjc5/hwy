package router

import (
	"fmt"
	"net/http"

	"hwy-docs/internal/datafuncsmap"
	"hwy-docs/internal/middleware"
	"hwy-docs/internal/platform"

	"github.com/go-chi/chi/v5"
	"github.com/joho/godotenv"
	"github.com/sjc5/hwy"
)

func init() {
	godotenv.Load()
}

var hwyInstance = hwy.Hwy{}

func init() {
	privateFS, err := platform.Kiruna.GetPrivateFS()
	if err != nil {
		panic(fmt.Sprintf("Error loading private FS: %v", err))
	}

	var defaultHeadBlocks = []hwy.HeadBlock{
		{
			Tag:       "title",
			InnerHTML: "Hwy",
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

	hwyInstance = hwy.Hwy{
		FS:                   privateFS,
		RootTemplateLocation: "templates/index.go.html",
		Loaders:              datafuncsmap.Loaders,
		QueryActions:         datafuncsmap.QueryActions,
		GetDefaultHeadBlocks: func(r *http.Request) ([]hwy.HeadBlock, error) {
			return defaultHeadBlocks, nil
		},
		GetRootTemplateData: func(r *http.Request) (map[string]any, error) {
			return map[string]any{
				"Kiruna":         platform.Kiruna,
				"ClientEntryURL": platform.Kiruna.GetPublicURL("hwy_client_entry.js"),
			}, nil
		},
	}

	err = hwyInstance.Init()
	if err != nil {
		fmt.Println(err)
		panic("Error initializing Hwy")
	}
}

func Init() *chi.Mux {
	r := chi.NewRouter()
	middleware.ApplyGlobal(r)
	r.Handle("/public/*", platform.Kiruna.GetServeStaticHandler("/public/", true))
	r.Handle("/*", hwyInstance.GetRootHandler())
	return r
}
