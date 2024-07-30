package router

import (
	"html/template"
	"io/fs"
	"net/http"
	"os"
	"time"

	"github.com/sjc5/kit/pkg/colorlog"
)

const (
	PathTypeUltimateCatch    = "ultimate-catch"
	PathTypeIndex            = "index"
	PathTypeStaticLayout     = "static-layout"
	PathTypeDynamicLayout    = "dynamic-layout"
	PathTypeNonUltimateSplat = "non-ultimate-splat"
)

type DataFunction interface {
	Execute(props any) (any, error)
	GetInputInstance() any
	GetOutputInstance() any
}

type DataFuncs struct {
	Loader      DataFunction
	Action      DataFunction
	Head        DataFunction
	HandlerFunc http.HandlerFunc
}

func NewRoute[
	LO any, AI any, AO any,
](
	pattern, pathType string, loader LoaderFunc[LO], action ActionFunc[AI, AO], head HeadFunc,
) Path {
	return Path{
		PathBase: PathBase{
			Pattern:  pattern,
			PathType: pathType,
		},
		DataFuncs: &DataFuncs{
			Loader: loader,
			Action: action,
			Head:   head,
		},
	}
}

type PathBase struct {
	Pattern  string    `json:"pattern"`
	Segments *[]string `json:"segments"`
	PathType string    `json:"pathType"`
	OutPath  string    `json:"outPath"`
	SrcPath  string    `json:"srcPath"`
	Deps     *[]string `json:"deps"`
}

type Path struct {
	PathBase
	DataFuncs *DataFuncs `json:",omitempty"`
}

type DataFuncsMap map[string]DataFuncs

type Hwy struct {
	DefaultHeadBlocks    []HeadBlock
	FS                   fs.FS
	DataFuncsMap         DataFuncsMap
	RootTemplateLocation string
	RootTemplateData     map[string]any
	getAdHocData         DataFunction
	paths                []Path
	clientEntryDeps      []string
	buildID              string
	rootTemplate         *template.Template
}

const HwyPrefix = "__hwy_internal__"

func getIsDebug() bool {
	return os.Getenv("HWY_ENV") == "development"
}

type measure struct {
	start time.Time
	name  string
}

func (m *measure) stop() {
	if getIsDebug() {
		Log.Info("timing -- ", time.Since(m.start), " -- ", m.name)
	}
}

func newMeasurement(name string) *measure {
	return &measure{
		start: time.Now(),
		name:  name,
	}
}

var Log = colorlog.Log{Label: "Hwy"}
