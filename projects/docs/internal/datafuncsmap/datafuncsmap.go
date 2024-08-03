package datafuncsmap

import (
	"bytes"
	"fmt"
	"hwy-docs/internal/platform"
	"path/filepath"
	"strings"

	"github.com/adrg/frontmatter"
	"github.com/russross/blackfriday/v2"
	"github.com/sjc5/hwy"
	"github.com/sjc5/kit/pkg/lru"
)

var count = 0

type LoginLoaderOutput struct {
	Bob int
}

var DataFuncsMap = hwy.DataFunctionMap{
	"/login": hwy.LoaderFunc[LoginLoaderOutput](
		func(props *hwy.DataFunctionProps, res *hwy.LoaderRes[LoginLoaderOutput]) {
			res.Data = LoginLoaderOutput{
				Bob: count,
			}
		},
	),
	"/$": catchAllLoader,
}

var ActionsMap = hwy.DataFunctionMap{
	"/test-action/$customer_id": hwy.ActionFunc[any, any](
		func(props *hwy.DataFunctionProps, res *hwy.ActionRes[any]) {
			count++
			fmt.Println("count", count, props.Params["customer_id"])
			res.Data = "bob"
			// res.Redirect("/login", 302)
		},
	),
}

type matter struct {
	Title   string `yaml:"title" json:"title"`
	Content string `json:"content"`
}

var notFoundMatter = matter{
	Title:   "Error",
	Content: "# 404\n\nNothing found.",
}

var c = lru.NewCache[string, *matter](1_000)

var catchAllLoader hwy.LoaderFunc[*matter] = func(
	props *hwy.DataFunctionProps,
	res *hwy.LoaderRes[*matter],
) {
	normalizedPath := filepath.Clean(strings.Join(props.SplatSegments, "/"))
	if normalizedPath == "." {
		normalizedPath = "README"
	}

	// title := "Hwy"
	// if props.LoaderData.(*matter).Title != "" {
	// 	title = "Hwy | " + props.LoaderData.(*matter).Title
	// }
	// return &[]hwy.HeadBlock{{Title: title}}, nil

	res.HeadBlocks = []*hwy.HeadBlock{{Title: "Hwy Bob"}}

	var item *matter
	if cached, ok := c.Get(normalizedPath); ok {
		item = cached
		res.Data = item
		return
	}

	filePath := "markdown/" + normalizedPath + ".md"
	FS, err := platform.Kiruna.GetPrivateFS()
	if err != nil {
		res.Error = err
		return
	}

	fileBytes, err := FS.ReadFile(filePath)
	if err != nil {
		c.Set(normalizedPath, &notFoundMatter, true)
		res.Data = &notFoundMatter
		return
	}

	var fm matter
	rest, err := frontmatter.Parse(bytes.NewReader(fileBytes), &fm)
	if err != nil {
		c.Set(normalizedPath, &notFoundMatter, true)
		res.Data = &notFoundMatter
		return
	}

	item = &matter{
		Title:   fm.Title,
		Content: string(blackfriday.Run(rest)),
	}

	c.Set(normalizedPath, item, false)
	res.Data = item
}
