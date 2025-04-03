package river

import (
	"github.com/sjc5/river/internal/framework"
	"github.com/sjc5/river/kit/htmlutil"
)

type (
	River[C any] = framework.River[C]
	HeadBlock    = htmlutil.Element
	AdHocType    = framework.AdHocType
	BuildOptions = framework.BuildOptions
)

var (
	UIVariants                     = framework.UIVariants
	GenerateTypeScript             = framework.GenerateTypeScript
	GetIsJSONRequest               = framework.GetIsJSONRequest
	RiverPathsStageOneJSONFileName = framework.RiverPathsStageOneJSONFileName
	RiverPathsStageTwoJSONFileName = framework.RiverPathsStageTwoJSONFileName
)
