package router

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/sjc5/kit/pkg/validate"
)

type GetRouteDataOutput struct {
	Title               string        `json:"title,omitempty"`
	MetaHeadBlocks      []*HeadBlock  `json:"metaHeadBlocks,omitempty"`
	RestHeadBlocks      []*HeadBlock  `json:"restHeadBlocks,omitempty"`
	LoadersData         []any         `json:"loadersData,omitempty"`
	LoadersErrors       []error       `json:"loadersErrors,omitempty"`
	ImportURLs          []string      `json:"importURLs,omitempty"`
	OutermostErrorIndex int           `json:"outermostErrorIndex,omitempty"`
	SplatSegments       SplatSegments `json:"splatSegments,omitempty"`
	Params              Params        `json:"params,omitempty"`
	AdHocData           any           `json:"adHocData,omitempty"`
	BuildID             string        `json:"buildID,omitempty"`
	Deps                []string      `json:"deps,omitempty"`
	ActionResData       any           `json:"data,omitempty"`
	ActionResError      string        `json:"error,omitempty"`
}

func (h *Hwy) GetRouteData(w http.ResponseWriter, r *http.Request) (
	*GetRouteDataOutput,
	didRedirect,
	RouteType,
	error,
) {
	activePathData, didRedirect, routeType := h.getMatchingPathData(w, r)
	if didRedirect {
		return nil, true, routeType, nil
	}

	var adHocData any
	var err error
	var headBlocks *sortHeadBlocksOutput

	if routeType != RouteTypesEnum.Loader {
		var errMsg string
		if validate.IsValidationError(activePathData.LoadersErrors[0]) {
			errMsg = "bad request (validation error)"
		} else if activePathData.LoadersErrors[0] != nil {
			errMsg = activePathData.LoadersErrors[0].Error()
		}
		return &GetRouteDataOutput{
			ActionResData:  activePathData.LoadersData[0],
			ActionResError: errMsg,
			BuildID:        h.buildID,
		}, false, routeType, nil
	} else {
		adHocData = GetAdHocDataFromContext[any](r)

		headBlocks, err = getExportedHeadBlocks(activePathData, h.DefaultHeadBlocks)
		if err != nil {
			errMsg := fmt.Sprintf("could not get exported head blocks: %v", err)
			Log.Errorf(errMsg)
			return nil, false, routeType, errors.New(errMsg)
		}
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
