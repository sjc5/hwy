package router

import (
	"bytes"
	"encoding/json"
	"fmt"
	"html/template"
	"net/http"
	"path/filepath"
	"strings"

	"github.com/adrg/frontmatter"
	"github.com/go-chi/chi/v5"
	"github.com/joho/godotenv"
	hwy "github.com/sjc5/hwy-go"
	root "github.com/sjc5/hwy-go-tester"
	"github.com/sjc5/hwy-go-tester/internal/middleware"
	"github.com/sjc5/kiruna"
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
	Hwy = hwy.Hwy{
		DefaultHeadBlocks: defaultHeadBlocks,
		GetBasePaths:      getBasePaths,
		DataFuncsMap: hwy.DataFuncsMap{
			"pages/$.ui.tsx": {Loader: catchAllLoader, Head: catchAllHead},
		},
	}
	err := Hwy.Initialize()
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

	r.HandleFunc("/*", func(w http.ResponseWriter, r *http.Request) {
		routeData, err := Hwy.GetRouteData(r)
		if err != nil {
			fmt.Println(err)
			http.Error(w, "Error getting route data", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Cache-Control", "public, max-age=60, stale-while-revalidate=3600")

		if hwy.GetIsJSONRequest(r) {
			w.Header().Set("Content-Type", "application/json")
			err = json.NewEncoder(w).Encode(routeData)
			if err != nil {
				fmt.Println(err)
				http.Error(w, "Error encoding JSON", http.StatusInternalServerError)
			}
			return
		}

		FS, err := root.Kiruna.GetPrivateFS()
		if err != nil {
			fmt.Println(err)
			http.Error(w, "Error loading private FS", http.StatusInternalServerError)
			return
		}

		tmpl, err := template.ParseFS(FS, "templates/index.go.html")
		if err != nil {
			fmt.Println(err)
			http.Error(w, "Error loading template", http.StatusInternalServerError)
			return
		}

		headElements, err := hwy.GetHeadElements(routeData)
		if err != nil {
			fmt.Println(err)
			http.Error(w, "Error getting head elements", http.StatusInternalServerError)
			return
		}

		ssrInnerHTML, err := hwy.GetSSRInnerHTML(routeData, true)
		if err != nil {
			fmt.Println(err)
			http.Error(w, "Error getting SSR inner HTML", http.StatusInternalServerError)
			return
		}

		err = tmpl.Execute(w, struct {
			Kiruna         *kiruna.Kiruna
			ClientEntryURL string
			HeadElements   *template.HTML
			SSRInnerHTML   *template.HTML
		}{
			Kiruna:         root.Kiruna,
			ClientEntryURL: clientEntryURL,
			HeadElements:   headElements,
			SSRInnerHTML:   ssrInnerHTML,
		})
		if err != nil {
			fmt.Println(err)
			http.Error(w, "Error executing template", http.StatusInternalServerError)
		}
	})

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
		Content: string(rest),
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

func getBasePaths() (*hwy.PathsFile, error) {
	FS, err := root.Kiruna.GetPrivateFS()
	if err != nil {
		return nil, err
	}
	pathsFile := hwy.PathsFile{}
	file, err := FS.Open("hwy_paths.json")
	if err != nil {
		return nil, err
	}
	defer file.Close()
	decoder := json.NewDecoder(file)
	err = decoder.Decode(&pathsFile)
	if err != nil {
		return nil, err
	}
	return &pathsFile, nil
}
