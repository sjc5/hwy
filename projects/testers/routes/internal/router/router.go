package router

import (
	"fmt"
	"hwy-go-tester/internal/platform"

	"github.com/go-chi/chi/v5"
	"github.com/sjc5/hwy"
)

var Hwy = hwy.Hwy{}

func init() {
	defaultHeadBlocks := []hwy.HeadBlock{
		{Title: "JACOB"},
	}
	dataFuncs := hwy.DataFuncsMap{
		"/dashboard/customers/$customer_id/orders": {
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
					{Title: "JACOB1"},
				}, nil
			},
		},
		"/dashboard/customers/$customer_id/orders/$order_id": {
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
					{Title: "JACOB2"},
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
			"ClientEntryURL": platform.Kiruna.GetPublicURL("hwy_client_entry.js"),
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

func Init() *chi.Mux {
	r := chi.NewRouter()
	r.Handle("/public/*", platform.Kiruna.GetServeStaticHandler("/public/", true))
	r.Handle("/*", Hwy.GetRootHandler())
	return r
}
