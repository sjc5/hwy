package router

import (
	"bytes"
	"fmt"
	"net/http"
	"path/filepath"
	"strings"

	root "hwy-docs"
	"hwy-docs/internal/middleware"

	"github.com/adrg/frontmatter"
	"github.com/go-chi/chi/v5"
	"github.com/joho/godotenv"
	"github.com/russross/blackfriday/v2"
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

var c = hwy.NewLRUCache(1000)

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
		DataFuncsMap: hwy.DataFuncsMap{
			"pages/$.ui.tsx": {
				Loader: catchAllLoader,
				Head:   catchAllHead,
				MutateResponse: func(w http.ResponseWriter) {
					w.Header().Set(
						"Cache-Control",
						"public, max-age=60, stale-while-revalidate=3600",
					)
				},
			},
		},
	}
	err = Hwy.Initialize()
	if err != nil {
		fmt.Println(err)
		panic("Error initializing Hwy")
	} else {
		fmt.Println("Hwy initialized")
	}
}

func Init() *chi.Mux {
	r := chi.NewRouter()
	middleware.ApplyGlobal(r)
	r.Handle("/public/*", root.Kiruna.GetServeStaticHandler("/public/", true))
	r.Handle("/*", Hwy.GetRootHandler())
	return r
}

type matter struct {
	Title   string `yaml:"title" json:"title"`
	Content string `json:"content"`
}

var notFoundMatter = matter{
	Title:   "Error",
	Content: "# 404\n\nNothing found.",
}

var catchAllLoader = func(props hwy.DataProps) (interface{}, error) {
	normalizedPath := filepath.Clean(strings.Join(*props.SplatSegments, "/"))
	if normalizedPath == "." {
		normalizedPath = "README"
	}
	var item *matter
	if cached, ok := c.Get(normalizedPath); ok {
		item = cached.(*matter)
		return item, nil
	}
	filePath := "markdown/" + normalizedPath + ".md"
	FS, err := root.Kiruna.GetPrivateFS()
	if err != nil {
		return nil, err
	}
	fileBytes, err := FS.ReadFile(filePath)
	if err != nil {
		c.Set(normalizedPath, &notFoundMatter, true)
		return &notFoundMatter, nil
	}
	var fm matter
	rest, err := frontmatter.Parse(bytes.NewReader(fileBytes), &fm)
	if err != nil {
		c.Set(normalizedPath, &notFoundMatter, true)
		return &notFoundMatter, nil
	}
	item = &matter{
		Title:   fm.Title,
		Content: string(blackfriday.Run(rest)),
	}
	c.Set(normalizedPath, item, false)
	return item, nil
}

var catchAllHead = func(props hwy.HeadProps) (*[]hwy.HeadBlock, error) {
	title := "Hwy"
	if props.LoaderData.(*matter).Title != "" {
		title = "Hwy | " + props.LoaderData.(*matter).Title
	}
	return &[]hwy.HeadBlock{{Title: title}}, nil
}
