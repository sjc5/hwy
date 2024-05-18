package router

import (
	"encoding/json"
	"fmt"
	"html/template"
	"hwy-go-tester/internal/platform"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/sjc5/hwy"
	"github.com/sjc5/kiruna"
)

var faviconURL = platform.Kiruna.GetPublicURL("favicon.webp")
var clientEntryURL = platform.Kiruna.GetPublicURL("hwy_client_entry.js")

var Hwy = hwy.Hwy{}

func init() {
	defaultHeadBlocks := []hwy.HeadBlock{
		{
			Tag:        "title",
			Attributes: map[string]string{"content": "JACOB"},
		},
	}
	dataFuncs := hwy.DataFuncsMap{
		"pages/dashboard/customers/$customer_id/orders/$order_id.page.tsx": {
			Loader: func(props *hwy.LoaderProps) (any, error) {
				return map[string]string{
					"message": "kjbkjbkjbkjbkjbk",
				}, nil
			},
			Head: func(props *hwy.HeadProps) (*[]hwy.HeadBlock, error) {
				return &[]hwy.HeadBlock{
					{
						Tag:        "meta",
						Attributes: map[string]string{"name": "description", "content": "child"},
					},
					{
						Tag:        "title",
						Attributes: map[string]string{"content": "JACOB2"},
					},
				}, nil
			},
		},
		"pages/dashboard/customers/$customer_id/orders.page.tsx": {
			Loader: func(props *hwy.LoaderProps) (any, error) {
				return map[string]string{
					"message": "<script>alert('Hello, Bob!')</script>",
				}, nil
			},
			Head: func(props *hwy.HeadProps) (*[]hwy.HeadBlock, error) {
				return &[]hwy.HeadBlock{
					{
						Tag:        "meta",
						Attributes: map[string]string{"name": "description", "content": "parent"},
					},
					{
						Tag:        "title",
						Attributes: map[string]string{"content": "JACOB1"},
					},
				}, nil
			},
		},
	}

	privateFS, err := platform.Kiruna.GetPrivateFS()
	if err != nil {
		panic(fmt.Sprintf("Error loading private FS: %v", err))
	}

	Hwy = hwy.Hwy{
		DefaultHeadBlocks:    defaultHeadBlocks,
		FS:                   privateFS,
		RootTemplateLocation: "templates/index.go.html",
		RootTemplateData: map[string]any{
			"Kiruna":         platform.Kiruna,
			"ClientEntryURL": clientEntryURL,
		},
		DataFuncsMap: dataFuncs,
	}
	err = Hwy.Initialize()
	if err != nil {
		fmt.Println(err)
		panic("Error initializing Hwy")
	} else {
		fmt.Println("Hwy initialized")
	}
}

var routeDataAggTime time.Duration
var routeDataCount int

func Init() *chi.Mux {
	fmt.Println("Initializing router")

	r := chi.NewRouter()

	r.Handle("/public/*", platform.Kiruna.GetServeStaticHandler("/public/", true))

	r.HandleFunc("/*", func(w http.ResponseWriter, r *http.Request) {
		fmt.Println("Handling request")

		perfA := time.Now()

		grdA := time.Now()
		routeData, err := Hwy.GetRouteData(w, r)
		if err != nil {
			fmt.Println(err)
			http.Error(w, "Error getting route data", http.StatusInternalServerError)
			return
		}
		grdB := time.Now()
		routeDataTook := grdB.Sub(grdA)
		fmt.Println("Got route data in", routeDataTook)
		routeDataAggTime += routeDataTook
		routeDataCount++
		fmt.Println("Average route data time:", routeDataAggTime/time.Duration(routeDataCount))

		isJSONRequest := hwy.GetIsJSONRequest(r)

		if isJSONRequest {
			w.Header().Set("Content-Type", "application/json")
			err = json.NewEncoder(w).Encode(routeData)
			if err != nil {
				fmt.Println(err)
				http.Error(w, "Error encoding JSON", http.StatusInternalServerError)
			}
			perfB := time.Now()
			fmt.Println("Request handled in", perfB.Sub(perfA))
			return
		}

		w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")

		FS, err := platform.Kiruna.GetPrivateFS()
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

		heA := time.Now()
		headElements, err := hwy.GetHeadElements(routeData)
		heB := time.Now()
		fmt.Println("Got head elements in", heB.Sub(heA))
		if err != nil {
			fmt.Println(err)
			http.Error(w, "Error getting head elements", http.StatusInternalServerError)
			return
		}
		sihA := time.Now()
		ssrInnerHTML, err := hwy.GetSSRInnerHTML(routeData, true)
		sihB := time.Now()
		fmt.Println("Got SSR inner HTML in", sihB.Sub(sihA))
		if err != nil {
			fmt.Println(err)
			http.Error(w, "Error getting SSR inner HTML", http.StatusInternalServerError)
			return
		}

		err = tmpl.Execute(w, struct {
			Kiruna         *kiruna.Kiruna
			FaviconURL     string
			ClientEntryURL string
			HeadElements   *template.HTML
			SSRInnerHTML   *template.HTML
		}{
			Kiruna:         platform.Kiruna,
			FaviconURL:     faviconURL,
			ClientEntryURL: clientEntryURL,
			HeadElements:   headElements,
			SSRInnerHTML:   ssrInnerHTML,
		})
		if err != nil {
			fmt.Println(err)
			http.Error(w, "Error executing template", http.StatusInternalServerError)
		}
		perfB := time.Now()
		fmt.Println("Request handled in", perfB.Sub(perfA))
	})

	return r
}
