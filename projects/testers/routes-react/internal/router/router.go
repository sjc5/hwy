package router

import (
	"fmt"
	"testers/routes-react/internal/platform"

	"github.com/go-chi/chi/v5"
	hwy "github.com/sjc5/hwy/packages/go/router"
)

var Hwy = hwy.Hwy{}

type strMap map[string]string

func init() {
	defaultHeadBlocks := []hwy.HeadBlock{
		{Title: "JACOB"},
	}
	dataFuncs := hwy.DataFunctionMap{
		"/dashboard/customers/$customer_id/orders": hwy.LoaderFunc[any](
			func(props *hwy.DataFunctionProps, res *hwy.LoaderRes[any]) {
				res.Data = map[string]string{
					"message": "</script><script>alert('Hello, Bob!')</script>",
				}
				res.HeadBlocks = []*hwy.HeadBlock{
					{
						Tag:        "meta",
						Attributes: map[string]string{"name": "description", "content": "parent"},
					},
					{Title: "JACOB1"},
				}
			},
		),
		"/dashboard/customers/$customer_id/orders/$order_id": hwy.LoaderFunc[strMap](
			func(props *hwy.DataFunctionProps, res *hwy.LoaderRes[strMap]) {
				res.Data = strMap{"message": "kjbkjbkjbkjbkjbk"}
				res.HeadBlocks = []*hwy.HeadBlock{
					{
						Tag:        "meta",
						Attributes: strMap{"name": "description", "content": "child"},
					},
					{Title: "JACOB2"},
				}
			},
		),
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
		LoadersMap: dataFuncs,
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
