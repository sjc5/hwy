package datafuncsmap

import (
	"bytes"
	"errors"
	"hwy-docs/internal/platform"
	"net/http"
	"path/filepath"
	"strings"

	"github.com/adrg/frontmatter"
	"github.com/russross/blackfriday/v2"
	"github.com/sjc5/hwy"
)

var count = 0

var DataFuncsMap = hwy.DataFuncsMap{
	"/login": {
		LoaderOutput: struct {
			Bob int
		}{},
		Loader: func(props *hwy.LoaderProps) (any, error) {
			return struct {
				Bob int
			}{
				Bob: count,
			}, nil
		},
		Action: func(props *hwy.ActionProps) (any, error) {
			count++
			return nil, errors.New("Redirect")
			// return "bob", nil
		},
	},
	"/$": {
		Loader: catchAllLoader,
		Head:   catchAllHead,
		HandlerFunc: func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set(
				"Cache-Control",
				"public, max-age=60, stale-while-revalidate=3600",
			)
		},
	},
}

type matter struct {
	Title   string `yaml:"title" json:"title"`
	Content string `json:"content"`
}

var notFoundMatter = matter{
	Title:   "Error",
	Content: "# 404\n\nNothing found.",
}

var c = hwy.NewLRUCache(1000)

var catchAllLoader hwy.Loader = func(props *hwy.LoaderProps) (any, error) {
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
	FS, err := platform.Kiruna.GetPrivateFS()
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

var catchAllHead hwy.Head = func(props *hwy.HeadProps) (*[]hwy.HeadBlock, error) {
	title := "Hwy"
	if props.LoaderData.(*matter).Title != "" {
		title = "Hwy | " + props.LoaderData.(*matter).Title
	}
	return &[]hwy.HeadBlock{{Title: title}}, nil
}
