package router

import (
	"errors"
	"fmt"
	"html/template"
	"slices"
	"sort"
	"strings"
)

type HeadBlock struct {
	Tag        string            `json:"tag,omitempty"`
	Attributes map[string]string `json:"attributes,omitempty"`
	Title      string            `json:"title,omitempty"`
}

const (
	metaStart          = `<!-- data-hwy="meta-start" -->`
	metaEnd            = `<!-- data-hwy="meta-end" -->`
	restStart          = `<!-- data-hwy="rest-start" -->`
	restEnd            = `<!-- data-hwy="rest-end" -->`
	titleTmplStr       = `<title>{{.}}</title>` + "\n"
	headElsTmplStr     = `{{range $key, $value := .Attributes}}{{$key}}="{{$value}}" {{end}}/>` + "\n"
	scriptBlockTmplStr = `{{range $key, $value := .Attributes}}{{$key}}="{{$value}}" {{end}}></script>` + "\n"
)

var (
	titleTmpl       = template.Must(template.New("title").Parse(titleTmplStr))
	headElsTmpl     = template.Must(template.New("headblock").Parse(headElsTmplStr))
	scriptBlockTmpl = template.Must(template.New("scriptblock").Parse(scriptBlockTmplStr))
	permittedTags   = []string{"meta", "base", "link", "style", "script", "noscript"}
)

func GetHeadElements(routeData *GetRouteDataOutput) (*template.HTML, error) {
	var htmlBuilder strings.Builder

	// Add title
	err := titleTmpl.Execute(&htmlBuilder, routeData.Title)
	if err != nil {
		errMsg := fmt.Sprintf("could not execute title template: %v", err)
		Log.Errorf(errMsg)
		return nil, errors.New(errMsg)
	}

	// Add head blocks
	htmlBuilder.WriteString(metaStart + "\n")
	for _, block := range routeData.MetaHeadBlocks {
		if !slices.Contains(permittedTags, block.Tag) {
			continue
		}
		err := renderBlock(&htmlBuilder, block)
		if err != nil {
			errMsg := fmt.Sprintf("could not render meta head block: %v", err)
			Log.Errorf(errMsg)
			return nil, errors.New(errMsg)
		}
	}
	htmlBuilder.WriteString(metaEnd + "\n")

	htmlBuilder.WriteString(restStart + "\n")
	for _, block := range routeData.RestHeadBlocks {
		if !slices.Contains(permittedTags, block.Tag) {
			continue
		}
		err := renderBlock(&htmlBuilder, block)
		if err != nil {
			errMsg := fmt.Sprintf("could not render rest head block: %v", err)
			Log.Errorf(errMsg)
			return nil, errors.New(errMsg)
		}
	}
	htmlBuilder.WriteString(restEnd + "\n")

	final := template.HTML(htmlBuilder.String())
	return &final, nil
}

func getExportedHeadBlocks(activePathData *ActivePathData, defaultHeadBlocks []HeadBlock) (*sortHeadBlocksOutput, error) {
	headBlocks := make([]HeadBlock, len(defaultHeadBlocks))

	copy(headBlocks, defaultHeadBlocks)

	for _, head := range activePathData.HeadBlocks {
		headBlocks = append(headBlocks, *head)
	}

	deduped := dedupeHeadBlocks(headBlocks)

	sorted := sortHeadBlocksOutput{}
	sorted.metaHeadBlocks = []*HeadBlock{}
	sorted.restHeadBlocks = []*HeadBlock{}

	for _, block := range deduped {
		if len(block.Title) > 0 {
			sorted.title = block.Title
		} else if block.Tag == "meta" {
			sorted.metaHeadBlocks = append(sorted.metaHeadBlocks, block)
		} else {
			sorted.restHeadBlocks = append(sorted.restHeadBlocks, block)
		}
	}

	return &sorted, nil
}

func dedupeHeadBlocks(blocks []HeadBlock) []*HeadBlock {
	uniqueBlocks := make(map[string]*HeadBlock)
	var dedupedBlocks []*HeadBlock

	titleIdx := -1
	descriptionIdx := -1

	for _, block := range blocks {
		if len(block.Title) > 0 {
			if titleIdx == -1 {
				titleIdx = len(dedupedBlocks)
				dedupedBlocks = append(dedupedBlocks, &block)
			} else {
				dedupedBlocks[titleIdx] = &block
			}
		} else if block.Tag == "meta" && block.Attributes["name"] == "description" {
			if descriptionIdx == -1 {
				descriptionIdx = len(dedupedBlocks)
				dedupedBlocks = append(dedupedBlocks, &block)
			} else {
				dedupedBlocks[descriptionIdx] = &block
			}
		} else {
			key := headBlockStableHash(&block)
			if _, exists := uniqueBlocks[key]; !exists {
				uniqueBlocks[key] = &block
				dedupedBlocks = append(dedupedBlocks, &block)
			}
		}
	}

	return dedupedBlocks
}

func headBlockStableHash(block *HeadBlock) string {
	parts := make([]string, 0, len(block.Attributes))
	for key, value := range block.Attributes {
		parts = append(parts, key+"="+value)
	}
	sort.Strings(parts) // Ensure attributes are in a consistent order
	var sb strings.Builder
	sb.Grow(len(block.Tag) + 1 + (len(parts) * 16))
	sb.WriteString(block.Tag)
	sb.WriteString("|")
	for i, part := range parts {
		if i > 0 {
			sb.WriteString("&")
		}
		sb.WriteString(part)
	}
	return sb.String()
}

func renderBlock(htmlBuilder *strings.Builder, block *HeadBlock) error {
	htmlBuilder.WriteString("<" + block.Tag + " ")
	var err error
	if block.Tag == "script" {
		err = scriptBlockTmpl.Execute(htmlBuilder, block)
	} else {
		err = headElsTmpl.Execute(htmlBuilder, block)
	}
	if err != nil {
		errMsg := fmt.Sprintf("could not execute head block template: %v", err)
		Log.Errorf(errMsg)
		return errors.New(errMsg)
	}
	return nil
}

type sortHeadBlocksOutput struct {
	title          string
	metaHeadBlocks []*HeadBlock
	restHeadBlocks []*HeadBlock
}
