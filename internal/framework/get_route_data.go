package framework

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/sjc5/river/kit/errutil"
	"github.com/sjc5/river/kit/genericsutil"
	"github.com/sjc5/river/kit/headblocks"
	"github.com/sjc5/river/kit/htmlutil"
	"github.com/sjc5/river/kit/mux"
	"github.com/sjc5/river/kit/tasks"
	"golang.org/x/sync/errgroup"
)

var (
	errNotFound   = errors.New("not found")
	isErrNotFound = errutil.ToIsErrFunc(errNotFound)
)

type UIRouteOutput struct {
	BuildID string `json:"buildID,omitempty"`

	CoreData    any     `json:"coreData,omitempty"`
	LoadersData []any   `json:"loadersData,omitempty"`
	LoadersErrs []error `json:"loadersErrs,omitempty"`

	Params      mux.Params  `json:"params,omitempty"`
	SplatValues SplatValues `json:"splatValues,omitempty"`

	Title string              `json:"title,omitempty"`
	Meta  []*htmlutil.Element `json:"metaHeadBlocks,omitempty"`
	Rest  []*htmlutil.Element `json:"restHeadBlocks,omitempty"`

	// LoadersErrorMessages []string            `json:"loadersErrorMessages,omitempty"`
	OutermostErrorIndex int `json:"outermostErrorIndex,omitempty"`

	ImportURLs []string `json:"importURLs,omitempty"`
	Deps       []string `json:"deps,omitempty"`
	CSSBundles []string `json:"cssBundles,omitempty"`

	ViteDevURL string `json:"viteDevURL,omitempty"`
}

type getUIRouteDataOutput struct {
	uiRouteOutput *UIRouteOutput
	didRedirect   bool
}

func (h *River[C]) getUIRouteData(w http.ResponseWriter, r *http.Request,
	nestedRouter *mux.NestedRouter, coreDataTask *tasks.RegisteredTask[genericsutil.None, C],
) (*getUIRouteDataOutput, error) {

	tasksCtx := nestedRouter.TasksRegistry().NewCtxFromRequest(r)

	eg := errgroup.Group{}

	var coreData C

	eg.Go(func() error {
		x, err := coreDataTask.GetNoInput(tasksCtx)
		if err != nil {
			return fmt.Errorf("could not get core data: %v", err)
		}
		coreData = x
		return nil
	})

	uiRoutesData := h.getUIRoutesData(w, r, nestedRouter, tasksCtx)
	if !uiRoutesData.found {
		return nil, errNotFound
	}

	if uiRoutesData.didRedirect {
		return &getUIRouteDataOutput{didRedirect: true}, nil
	}

	err := eg.Wait()
	if err != nil {
		Log.Error(err.Error())
		return nil, err
	}

	var headBlocks *headblocks.HeadBlocks

	var defaultHeadBlocks []*htmlutil.Element
	if h.GetDefaultHeadBlocks != nil {
		defaultHeadBlocks, err = h.GetDefaultHeadBlocks(r)
		if err != nil {
			errMsg := fmt.Sprintf("could not get default head blocks: %v", err)
			Log.Error(errMsg)
			return nil, errors.New(errMsg)
		}
	} else {
		defaultHeadBlocks = []*htmlutil.Element{}
	}

	activePathData := uiRoutesData.activePathData

	var hb []*htmlutil.Element
	hb = make([]*htmlutil.Element, 0, len(activePathData.HeadBlocks)+len(defaultHeadBlocks))
	hb = append(hb, defaultHeadBlocks...)
	hb = append(hb, activePathData.HeadBlocks...)

	// dedupe and organize into HeadBlocks struct
	headBlocks = headblocks.ToHeadBlocks(hb)

	uiRouteOutput := &UIRouteOutput{
		BuildID: h._buildID,

		CoreData:    coreData,
		LoadersData: activePathData.LoadersData,
		LoadersErrs: activePathData.LoadersErrs,

		Params:      activePathData.Params,
		SplatValues: activePathData.SplatValues,

		Title: headBlocks.Title,
		Meta:  headBlocks.Meta,
		Rest:  headBlocks.Rest,

		// LoadersErrorMessages: activePathData.LoadersErrMsgs,
		OutermostErrorIndex: activePathData.OutermostErrorIndex,

		ImportURLs: activePathData.ImportURLs,
		Deps:       activePathData.Deps,
		CSSBundles: h.getCSSBundles(activePathData.Deps),

		ViteDevURL: h.getViteDevURL(),
	}

	return &getUIRouteDataOutput{uiRouteOutput: uiRouteOutput}, nil
}
