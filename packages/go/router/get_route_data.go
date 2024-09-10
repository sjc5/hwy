package router

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/sjc5/kit/pkg/validate"
)

type GetRouteDataOutput struct {
	Title                string        `json:"title,omitempty"`
	MetaHeadBlocks       []*HeadBlock  `json:"metaHeadBlocks,omitempty"`
	RestHeadBlocks       []*HeadBlock  `json:"restHeadBlocks,omitempty"`
	LoadersData          []any         `json:"loadersData,omitempty"`
	LoadersErrorMessages []string      `json:"loadersErrorMessages,omitempty"`
	ImportURLs           []string      `json:"importURLs,omitempty"`
	OutermostErrorIndex  int           `json:"outermostErrorIndex,omitempty"`
	SplatSegments        SplatSegments `json:"splatSegments,omitempty"`
	Params               Params        `json:"params,omitempty"`
	AdHocData            any           `json:"adHocData,omitempty"`
	BuildID              string        `json:"buildID,omitempty"`
	Deps                 []string      `json:"deps,omitempty"`
	CSSBundles           []string      `json:"cssBundles,omitempty"`
	ActionResData        any           `json:"data,omitempty"`
	ActionResError       string        `json:"error,omitempty"`
}

func (h *Hwy) GetRouteData(w http.ResponseWriter, r *http.Request) (
	*GetRouteDataOutput,
	didRedirect,
	RouteType,
	error,
) {
	activePathData, didRedirect, routeType := h.Hwy__internal__getMatchingPathData(w, r)
	if routeType == RouteTypesEnum.NotFound {
		return nil, false, routeType, nil
	}
	if didRedirect {
		return nil, true, routeType, nil
	}

	var err error
	var adHocData any
	var headBlocks *sortHeadBlocksOutput

	if routeType != RouteTypesEnum.Loader {
		var errMsg string
		if validate.IsValidationError(errors.New(activePathData.LoadersErrMsgs[0])) {
			errMsg = "bad request (validation error)"
		} else if activePathData.LoadersErrMsgs[0] != "" {
			errMsg = activePathData.LoadersErrMsgs[0]
		}
		return &GetRouteDataOutput{
			ActionResData:  activePathData.LoadersData[0],
			ActionResError: errMsg,
			BuildID:        h.buildID,
		}, false, routeType, nil
	} else {
		adHocData = GetAdHocDataFromContext[any](r)

		var defaultHeadBlocks []HeadBlock
		if h.GetDefaultHeadBlocks != nil {
			defaultHeadBlocks, err = h.GetDefaultHeadBlocks(r)
			if err != nil {
				errMsg := fmt.Sprintf("could not get default head blocks: %v", err)
				Log.Errorf(errMsg)
				return nil, false, routeType, errors.New(errMsg)
			}
		} else {
			defaultHeadBlocks = []HeadBlock{}
		}

		headBlocks, err = getExportedHeadBlocks(activePathData, defaultHeadBlocks)
		if err != nil {
			errMsg := fmt.Sprintf("could not get exported head blocks: %v", err)
			Log.Errorf(errMsg)
			return nil, false, routeType, errors.New(errMsg)
		}
	}

	return &GetRouteDataOutput{
		Title:                headBlocks.title,
		MetaHeadBlocks:       headBlocks.metaHeadBlocks,
		RestHeadBlocks:       headBlocks.restHeadBlocks,
		LoadersData:          activePathData.LoadersData,
		LoadersErrorMessages: activePathData.LoadersErrMsgs,
		ImportURLs:           activePathData.ImportURLs,
		OutermostErrorIndex:  activePathData.OutermostErrorIndex,
		SplatSegments:        activePathData.SplatSegments,
		Params:               activePathData.Params,
		AdHocData:            adHocData,
		BuildID:              h.buildID,
		Deps:                 activePathData.Deps,
		CSSBundles:           h.getCSSBundles(activePathData.Deps),
	}, false, routeType, nil
}

func (h *Hwy) getCSSBundles(deps []string) []string {
	cssBundles := make([]string, 0, len(deps))
	for _, dep := range deps {
		if x, exists := h.depToCSSBundleMap[dep]; exists {
			cssBundles = append(cssBundles, x)
		}
	}
	return cssBundles
}
