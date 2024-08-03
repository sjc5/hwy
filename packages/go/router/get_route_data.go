package router

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/sjc5/kit/pkg/validate"
)

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
	APIResponseData     any               `json:"data,omitempty"`
	APIResponseError    string            `json:"error,omitempty"`
}

func (h *Hwy) GetRouteData(w http.ResponseWriter, r *http.Request) (
	*GetRouteDataOutput,
	didRedirect,
	RouteType,
	error,
) {
	activePathData, loaderProps, didRedirect, routeType := h.getMatchingPathData(w, r)
	if didRedirect {
		return nil, true, routeType, nil
	}

	if routeType != RouteTypesEnum.Loader {
		var errMsg string
		if validate.IsValidationError(activePathData.LoadersErrors[0]) {
			errMsg = "bad request (validation error)"
		} else if activePathData.LoadersErrors[0] != nil {
			errMsg = activePathData.LoadersErrors[0].Error()
		}
		return &GetRouteDataOutput{
			APIResponseData:  activePathData.LoadersData[0],
			APIResponseError: errMsg,
			BuildID:          h.buildID,
		}, false, routeType, nil
	}

	var adHocData any
	var err error
	if h.getAdHocData != nil {
		adHocData, err = h.getAdHocData.Execute(loaderProps, nil)
	}
	if err != nil {
		errMsg := fmt.Sprintf("could not get ad hoc data: %v", err)
		Log.Errorf(errMsg)
		return nil, false, routeType, errors.New(errMsg)
	}

	headBlocks, err := getExportedHeadBlocks(activePathData, h.DefaultHeadBlocks)
	if err != nil {
		errMsg := fmt.Sprintf("could not get exported head blocks: %v", err)
		Log.Errorf(errMsg)
		return nil, false, routeType, errors.New(errMsg)
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
	}, false, routeType, nil
}
