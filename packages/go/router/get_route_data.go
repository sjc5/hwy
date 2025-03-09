package router

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/sjc5/kit/pkg/headblocks"
	"github.com/sjc5/kit/pkg/htmlutil"
	"github.com/sjc5/kit/pkg/mux"
	"github.com/sjc5/kit/pkg/validate"
)

type GetRouteDataOutput struct {
	Title       string              `json:"title,omitempty"`
	Meta        []*htmlutil.Element `json:"metaHeadBlocks,omitempty"`
	Rest        []*htmlutil.Element `json:"restHeadBlocks,omitempty"`
	LoadersData []any               `json:"loadersData,omitempty"`
	LoadersErrs []error             `json:"loadersErrs,omitempty"`
	// LoadersErrorMessages []string            `json:"loadersErrorMessages,omitempty"`
	ImportURLs          []string    `json:"importURLs,omitempty"`
	OutermostErrorIndex int         `json:"outermostErrorIndex,omitempty"`
	SplatValues         SplatValues `json:"splatValues,omitempty"`
	Params              mux.Params  `json:"params,omitempty"`
	CoreData            any         `json:"coreData,omitempty"`
	BuildID             string      `json:"buildID,omitempty"`
	ViteDevURL          string      `json:"viteDevURL,omitempty"`
	Deps                []string    `json:"deps,omitempty"`
	CSSBundles          []string    `json:"cssBundles,omitempty"`
	ActionResData       any         `json:"data,omitempty"`
	ActionResError      string      `json:"error,omitempty"`
	ClientRedirectURL   string      `json:"clientRedirectURL,omitempty"`
}

func (h *Hwy) GetRouteData(w http.ResponseWriter, r *http.Request) (
	*GetRouteDataOutput,
	*redirectStatus,
	RouteType,
	error,
) {
	tasksCtx := h.NestedRouter.TasksRegistry().NewCtxFromRequest(r)

	activePathData, redirectStatus, routeType := h.getMatchingPathData(tasksCtx, w, r)
	if routeType == RouteTypesEnum.NotFound {
		return nil, nil, routeType, nil
	}
	var clientRedirectURL string
	if redirectStatus != nil {
		if redirectStatus.didServerRedirect {
			return nil, redirectStatus, routeType, nil
		}
		clientRedirectURL = redirectStatus.clientRedirectURL
	}

	var err error
	var coreData any
	var headBlocks *headblocks.HeadBlocks

	if clientRedirectURL != "" {
		return &GetRouteDataOutput{
			BuildID:           h._buildID,
			ClientRedirectURL: clientRedirectURL,
		}, nil, routeType, nil
	} else if routeType != RouteTypesEnum.Loader {
		rdo := &GetRouteDataOutput{BuildID: h._buildID}

		var errMsg string
		if len(activePathData.LoadersErrs) > 0 {
			if validate.IsValidationError(activePathData.LoadersErrs[0]) {
				errMsg = "bad request (validation error)"
			} else if activePathData.LoadersErrs[0] != nil {
				errMsg = activePathData.LoadersErrs[0].Error() // __TODO fix this, need to differentiate server errors and client errors
			}

			rdo.ActionResData = activePathData.LoadersData[0]
			rdo.ActionResError = errMsg
		}

		return rdo, nil, routeType, nil
	} else {
		coreData = NewCoreDataStore[any]().GetValueFromContext(r.Context())

		var defaultHeadBlocks []*htmlutil.Element
		if h.GetDefaultHeadBlocks != nil {
			defaultHeadBlocks, err = h.GetDefaultHeadBlocks(r)
			if err != nil {
				errMsg := fmt.Sprintf("could not get default head blocks: %v", err)
				Log.Error(errMsg)
				return nil, nil, routeType, errors.New(errMsg)
			}
		} else {
			defaultHeadBlocks = []*htmlutil.Element{}
		}

		var hb []*htmlutil.Element
		hb = make([]*htmlutil.Element, 0, len(activePathData.HeadBlocks)+len(defaultHeadBlocks))
		hb = append(hb, defaultHeadBlocks...)
		hb = append(hb, activePathData.HeadBlocks...)

		headBlocks = headblocks.ToHeadBlocks(hb)
	}

	return &GetRouteDataOutput{
		Title:       headBlocks.Title,
		Meta:        headBlocks.Meta,
		Rest:        headBlocks.Rest,
		LoadersData: activePathData.LoadersData,
		LoadersErrs: activePathData.LoadersErrs,
		// LoadersErrorMessages: activePathData.LoadersErrMsgs,
		ImportURLs:          activePathData.ImportURLs,
		OutermostErrorIndex: activePathData.OutermostErrorIndex,
		SplatValues:         activePathData.SplatValues,
		Params:              activePathData.Params,
		CoreData:            coreData,
		BuildID:             h._buildID,
		ViteDevURL:          h.getViteDevURL(),
		Deps:                activePathData.Deps,
		CSSBundles:          h.getCSSBundles(activePathData.Deps),
	}, nil, routeType, nil
}

// order matters
func (h *Hwy) getCSSBundles(deps []string) []string {
	cssBundles := make([]string, 0, len(deps))

	// first, client entry CSS
	if x, exists := h._depToCSSBundleMap[h._clientEntryOut]; exists {
		cssBundles = append(cssBundles, x)
	}

	// then all downstream deps
	for _, dep := range deps {
		if x, exists := h._depToCSSBundleMap[dep]; exists {
			cssBundles = append(cssBundles, x)
		}
	}

	return cssBundles
}
