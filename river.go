package river

import (
	"github.com/sjc5/river/internal/framework"
	"github.com/sjc5/river/kit/htmlutil"
)

type (
	River[C any]     = framework.River[C]
	HeadBlock        = htmlutil.Element
	TSGenOptions     = framework.TSGenOptions
	AdHocType        = framework.AdHocType
	RootTemplateData = framework.RootTemplateData
)

var (
	GenerateTypeScript              = framework.GenerateTypeScript
	GetIsJSONRequest                = framework.GetIsJSONRequest
	RiverPathsStageOneJSONFileName  = framework.RiverPathsStageOneJSONFileName
	RiverPathsStageTwoJSONFileName  = framework.RiverPathsStageTwoJSONFileName
	RiverViteConfigHelperTSFileName = framework.RiverViteConfigHelperTSFileName
)
