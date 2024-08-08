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

var Loaders = hwy.DataFunctionMap{
	"/login": hwy.Loader[LoginLoaderOutput](
		func(ctx hwy.LoaderCtx[LoginLoaderOutput]) {
			ctx.Res.Data = LoginLoaderOutput{Bob: count}
		}),
	"/$": catchAllLoader,
}

type TestQueryActionInput struct {
	CustomerID string `json:"customer_id" validate:"required,oneof=1 2 3"`
}

var QueryActions = hwy.DataFunctionMap{
	"/test-api-query/$customer_id": hwy.Action[TestQueryActionInput, string](
		func(ctx hwy.ActionCtx[TestQueryActionInput, string]) {
			count++
			fmt.Println("count", count, ctx.Input.CustomerID)
			ctx.Res.Data = "bob"
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

var catchAllLoader hwy.Loader[*matter] = func(ctx hwy.LoaderCtx[*matter]) {
	normalizedPath := filepath.Clean(strings.Join(ctx.SplatSegments, "/"))
	if normalizedPath == "." {
		normalizedPath = "README"
	}

	// title := "Hwy"
	// if props.LoaderData.(*matter).Title != "" {
	// 	title = "Hwy | " + props.LoaderData.(*matter).Title
	// }
	// return &[]hwy.HeadBlock{{Title: title}}, nil

	ctx.Res.HeadBlocks = []*hwy.HeadBlock{{Title: "Hwy Bob"}}

	var item *matter
	if cached, ok := c.Get(normalizedPath); ok {
		item = cached
		ctx.Res.Data = item
		return
	}

	filePath := "markdown/" + normalizedPath + ".md"
	FS, err := platform.Kiruna.GetPrivateFS()
	if err != nil {
		ctx.Res.Error = err
		return
	}

	fileBytes, err := FS.ReadFile(filePath)
	if err != nil {
		c.Set(normalizedPath, &notFoundMatter, true)
		ctx.Res.Data = &notFoundMatter
		return
	}

	var fm matter
	rest, err := frontmatter.Parse(bytes.NewReader(fileBytes), &fm)
	if err != nil {
		c.Set(normalizedPath, &notFoundMatter, true)
		ctx.Res.Data = &notFoundMatter
		return
	}

	item = &matter{
		Title:   fm.Title,
		Content: string(blackfriday.Run(rest)),
	}

	c.Set(normalizedPath, item, false)
	ctx.Res.Data = item
}
