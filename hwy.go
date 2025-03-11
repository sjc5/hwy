package hwy

import (
	"github.com/sjc5/hwy/packages/go/router"
	"github.com/sjc5/kit/pkg/htmlutil"
)

type (
	Hwy[C any]      = router.Hwy[C]
	DataFuncs       = router.DataFuncs
	DataFunctionMap = router.DataFunctionMap
	HeadBlock       = htmlutil.Element

	BuildOptions     = router.BuildOptions
	TSGenOptions     = router.TSGenOptions
	AdHocType        = router.AdHocType
	RootTemplateData = router.RootTemplateData

	// Loader[O any]        = router.Loader[O]
	Action[I any, O any] = router.Action[I, O]

	CtxHelper               = router.CtxHelper
	LoaderCtx[O any]        = router.LoaderCtx[O]
	ActionCtx[I any, O any] = router.ActionCtx[I, O]

	LoaderRes[O any] = router.LoaderRes[O] // does this need to be exported ?
	ActionRes[O any] = router.ActionRes[O] // does this need to be exported ?
)

var (
	GenerateTypeScript            = router.GenerateTypeScript
	GetIsJSONRequest              = router.GetIsJSONRequest
	HwyPathsStageOneJSONFileName  = router.HwyPathsStageOneJSONFileName
	HwyPathsStageTwoJSONFileName  = router.HwyPathsStageTwoJSONFileName
	HwyViteConfigHelperTSFileName = router.HwyViteConfigHelperTSFileName
)

func NewAction[I any, O any](f Action[I, O]) Action[I, O] {
	return Action[I, O](f)
}
