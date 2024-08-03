package router

import (
	"errors"
	"fmt"
	"net/http"
)

// __TODO permitted methods

type GetRouteDataOutput struct {
	Title               string            `json:"title,omitempty"`
	MetaHeadBlocks      []*HeadBlock      `json:"metaHeadBlocks,omitempty"`
	RestHeadBlocks      []*HeadBlock      `json:"restHeadBlocks,omitempty"`
	LoadersData         []any             `json:"loadersData,omitempty"`
	LoadersErrors       []error           `json:"loadersErrors,omitempty"`
	ImportURLs          []string          `json:"importURLs,omitempty"`
	OutermostErrorIndex int               `json:"outermostErrorIndex,omitempty"`
	SplatSegments       []string          `json:"splatSegments,omitempty"`
	Params              map[string]string `json:"params,omitempty"`
	AdHocData           any               `json:"adHocData,omitempty"`
	BuildID             string            `json:"buildID,omitempty"`
	Deps                []string          `json:"deps,omitempty"`
	APIResponseData     any               `json:"apiResponseData,omitempty"`
}

func (h *Hwy) GetRouteData(w http.ResponseWriter, r *http.Request) (
	*GetRouteDataOutput,
	didRedirect,
	isAPIRoute,
	error,
) {
	activePathData, loaderProps, didRedirect, isAPIRoute := h.getMatchingPathData(w, r)
	if didRedirect {
		return nil, true, isAPIRoute, nil
	}

	if isAPIRoute {
		return &GetRouteDataOutput{
			APIResponseData: &activePathData.LoadersData[0],
			BuildID:         h.buildID,
		}, false, isAPIRoute, nil // __TODO errors!
	}

	var adHocData any
	var err error
	if h.getAdHocData != nil {
		adHocData, err = h.getAdHocData.Execute(loaderProps, nil)
	}
	if err != nil {
		errMsg := fmt.Sprintf("could not get ad hoc data: %v", err)
		Log.Errorf(errMsg)
		return nil, false, isAPIRoute, errors.New(errMsg)
	}

	headBlocks, err := getExportedHeadBlocks(activePathData, h.DefaultHeadBlocks)
	if err != nil {
		errMsg := fmt.Sprintf("could not get exported head blocks: %v", err)
		Log.Errorf(errMsg)
		return nil, false, isAPIRoute, errors.New(errMsg)
	}

	return &GetRouteDataOutput{
		Title:               headBlocks.title,
		MetaHeadBlocks:      headBlocks.metaHeadBlocks,
		RestHeadBlocks:      headBlocks.restHeadBlocks,
		LoadersData:         activePathData.LoadersData,
		LoadersErrors:       activePathData.LoadersErrors,
		ImportURLs:          activePathData.ImportURLs,
		OutermostErrorIndex: activePathData.OutermostErrorIndex,
		SplatSegments:       activePathData.SplatSegments,
		Params:              activePathData.Params,
		AdHocData:           adHocData,
		BuildID:             h.buildID,
		Deps:                activePathData.Deps,
	}, false, isAPIRoute, nil
}
