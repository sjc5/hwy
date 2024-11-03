package router

import (
	"errors"
	"fmt"
	"html/template"
	"sort"
	"strings"

	"github.com/sjc5/kit/pkg/htmlutil"
)

type HeadBlock = htmlutil.Element

const (
	metaStart = `<!-- data-hwy="meta-start" -->`
	metaEnd   = `<!-- data-hwy="meta-end" -->`
	restStart = `<!-- data-hwy="rest-start" -->`
	restEnd   = `<!-- data-hwy="rest-end" -->`
)

func GetHeadElements(routeData *GetRouteDataOutput) (*template.HTML, error) {
	var htmlBuilder strings.Builder

	// Add title
	err := htmlutil.RenderElementToBuilder(&htmlutil.Element{Tag: "title", InnerHTML: template.HTML(routeData.Title)}, &htmlBuilder)
	if err != nil {
		errMsg := fmt.Sprintf("could not execute title template: %v", err)
		Log.Errorf(errMsg)
		return nil, errors.New(errMsg)
	}

	// Add meta head els
	htmlBuilder.WriteString(metaStart + "\n")
	for _, el := range routeData.MetaHeadBlocks {
		err := htmlutil.RenderElementToBuilder(el, &htmlBuilder)
		if err != nil {
			errMsg := fmt.Sprintf("could not render meta head el: %v", err)
			Log.Errorf(errMsg)
			return nil, errors.New(errMsg)
		}
	}
	htmlBuilder.WriteString(metaEnd + "\n")

	// Add rest head els
	htmlBuilder.WriteString(restStart + "\n")
	for _, el := range routeData.RestHeadBlocks {
		err := htmlutil.RenderElementToBuilder(el, &htmlBuilder)
		if err != nil {
			errMsg := fmt.Sprintf("could not render rest head el: %v", err)
			Log.Errorf(errMsg)
			return nil, errors.New(errMsg)
		}
	}
	htmlBuilder.WriteString(restEnd + "\n")

	final := template.HTML(htmlBuilder.String())
	return &final, nil
}

func getExportedHeadBlocks(activePathData *ActivePathData, defaultHeadBlocks []htmlutil.Element) (*sortHeadBlocksOutput, error) {
	headEls := make([]htmlutil.Element, len(defaultHeadBlocks))

	copy(headEls, defaultHeadBlocks)

	for _, head := range activePathData.HeadBlocks {
		headEls = append(headEls, *head)
	}

	deduped := dedupeHeadBlocks(headEls)

	sorted := sortHeadBlocksOutput{}
	sorted.metaHeadBlocks = []*htmlutil.Element{}
	sorted.restHeadBlocks = []*htmlutil.Element{}

	for _, el := range deduped {
		if el.Tag == "title" {
			sorted.title = template.HTMLEscapeString(string(el.InnerHTML))
		} else if el.Tag == "meta" {
			safeEl := htmlutil.EscapeIntoTrusted(el)
			sorted.metaHeadBlocks = append(sorted.metaHeadBlocks, &safeEl)
		} else {
			safeEl := htmlutil.EscapeIntoTrusted(el)
			sorted.restHeadBlocks = append(sorted.restHeadBlocks, &safeEl)
		}
	}

	return &sorted, nil
}

func dedupeHeadBlocks(els []htmlutil.Element) []*htmlutil.Element {
	uniqueEls := make(map[string]*htmlutil.Element)
	var dedupedEls []*htmlutil.Element

	titleIdx := -1
	descriptionIdx := -1

	for _, el := range els {
		if el.Tag == "title" {
			if titleIdx == -1 {
				titleIdx = len(dedupedEls)
				dedupedEls = append(dedupedEls, &el)
			} else {
				dedupedEls[titleIdx] = &el
			}
		} else if el.Tag == "meta" && el.Attributes["name"] == "description" {
			if descriptionIdx == -1 {
				descriptionIdx = len(dedupedEls)
				dedupedEls = append(dedupedEls, &el)
			} else {
				dedupedEls[descriptionIdx] = &el
			}
		} else {
			key := headBlockStableHash(&el)
			if _, exists := uniqueEls[key]; !exists {
				uniqueEls[key] = &el
				dedupedEls = append(dedupedEls, &el)
			}
		}
	}

	return dedupedEls
}

func headBlockStableHash(el *htmlutil.Element) string {
	// Handle regular attributes
	parts := make([]string, 0, len(el.Attributes)+len(el.TrustedAttributes)+len(el.BooleanAttributes))

	// Add regular attributes
	for key, value := range el.Attributes {
		parts = append(parts, "attr:"+key+"="+value)
	}

	// Add trusted attributes with a prefix to distinguish them
	for key, value := range el.TrustedAttributes {
		parts = append(parts, "trusted:"+key+"="+value)
	}

	// Add boolean attributes
	for _, attr := range el.BooleanAttributes {
		parts = append(parts, "bool:"+attr)
	}

	// Sort all attributes for consistency
	sort.Strings(parts)

	// Calculate initial capacity for string builder
	// Initial size: tag + separator + innerHTML + separators between attributes
	initialSize := len(el.Tag) + 1 + len(el.InnerHTML) + (len(parts) * 16)

	var sb strings.Builder
	sb.Grow(initialSize)

	// Add tag
	sb.WriteString(el.Tag)
	sb.WriteString("|")

	// Add all attributes
	for i, part := range parts {
		if i > 0 {
			sb.WriteString("&")
		}
		sb.WriteString(part)
	}

	// Add innerHTML if present
	if len(el.InnerHTML) > 0 {
		sb.WriteString("|")
		sb.WriteString(string(el.InnerHTML))
	}

	// Add self-closing flag if true
	if el.SelfClosing {
		sb.WriteString("|self-closing")
	}

	return sb.String()
}

type sortHeadBlocksOutput struct {
	title          string
	metaHeadBlocks []*htmlutil.Element
	restHeadBlocks []*htmlutil.Element
}
