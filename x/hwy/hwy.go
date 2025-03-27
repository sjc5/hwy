package hwy

import (
	"github.com/sjc5/river/x/hwy/internal/hi"
	"github.com/sjc5/river/x/kit/htmlutil"
)

type (
	Hwy[C any]       = hi.Hwy[C]
	HeadBlock        = htmlutil.Element
	TSGenOptions     = hi.TSGenOptions
	AdHocType        = hi.AdHocType
	RootTemplateData = hi.RootTemplateData
)

var (
	GenerateTypeScript            = hi.GenerateTypeScript
	GetIsJSONRequest              = hi.GetIsJSONRequest
	HwyPathsStageOneJSONFileName  = hi.HwyPathsStageOneJSONFileName
	HwyPathsStageTwoJSONFileName  = hi.HwyPathsStageTwoJSONFileName
	HwyViteConfigHelperTSFileName = hi.HwyViteConfigHelperTSFileName
)
