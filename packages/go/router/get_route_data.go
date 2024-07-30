package router

import (
	"errors"
	"fmt"
	"net/http"
)

type GetRouteDataOutput struct {
	Title               string             `json:"title"`
	MetaHeadBlocks      *[]*HeadBlock      `json:"metaHeadBlocks"`
	RestHeadBlocks      *[]*HeadBlock      `json:"restHeadBlocks"`
	LoadersData         *[]any             `json:"loadersData"`
	ImportURLs          *[]string          `json:"importURLs"`
	OutermostErrorIndex int                `json:"outermostErrorIndex"`
	SplatSegments       *[]string          `json:"splatSegments"`
	Params              *map[string]string `json:"params"`
	ActionData          *[]any             `json:"actionData"`
	AdHocData           any                `json:"adHocData"`
	BuildID             string             `json:"buildID"`
	Deps                *[]string          `json:"deps"`
}

func (h *Hwy) GetRouteData(w http.ResponseWriter, r *http.Request) (*GetRouteDataOutput, error) {
	activePathData, loaderProps := h.getMatchingPathData(w, r)

	var adHocData any
	var err error
	if h.getAdHocData != nil {
		adHocData, err = h.getAdHocData.Execute(loaderProps)
	}
	if err != nil {
		errMsg := fmt.Sprintf("could not get ad hoc data: %v", err)
		Log.Errorf(errMsg)
		return nil, errors.New(errMsg)
	}

	headBlocks, err := getExportedHeadBlocks(r, activePathData, &h.DefaultHeadBlocks, adHocData)
	if err != nil {
		errMsg := fmt.Sprintf("could not get exported head blocks: %v", err)
		Log.Errorf(errMsg)
		return nil, errors.New(errMsg)
	}

	return &GetRouteDataOutput{
		Title:               headBlocks.title,
		MetaHeadBlocks:      headBlocks.metaHeadBlocks,
		RestHeadBlocks:      headBlocks.restHeadBlocks,
		LoadersData:         activePathData.LoadersData,
		ImportURLs:          activePathData.ImportURLs,
		OutermostErrorIndex: activePathData.OutermostErrorIndex,
		SplatSegments:       activePathData.SplatSegments,
		Params:              activePathData.Params,
		ActionData:          activePathData.ActionData,
		AdHocData:           adHocData,
		BuildID:             h.buildID,
		Deps:                activePathData.Deps,
	}, nil
}
