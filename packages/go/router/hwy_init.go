package router

import (
	"encoding/json"
	"errors"
	"fmt"
	"html/template"
	"io/fs"
	"slices"

	"github.com/go-playground/validator/v10"
	"github.com/sjc5/kit/pkg/validate"
)

func (h *Hwy) Init(isDev bool) {
	if err := h.initInner(isDev); err != nil {
		errMsg := fmt.Sprintf("Error initializing Hwy: %v", err)
		if isDev {
			Log.Error(errMsg)
		} else {
			panic(errMsg)
		}
	} else {
		Log.Info("Hwy initialized")
	}
}

func (h *Hwy) initInner(isDev bool) error {
	h.mu.Lock()
	defer h.mu.Unlock()

	h._isDev = isDev

	if h.FS == nil {
		return errors.New("FS is nil")
	}

	pathsFile, err := getBasePaths_StageOneOrTwo(h.FS, isDev)
	if err != nil {
		errMsg := fmt.Sprintf("could not get base paths: %v", err)
		Log.Error(errMsg)
		return errors.New(errMsg)
	}
	h._buildID = pathsFile.BuildID

	if h._paths == nil {
		h._paths = make([]Path, 0, len(pathsFile.Paths))
	}
	for _, pathBase := range pathsFile.Paths {
		h._paths = append(h._paths, Path{PathBase: pathBase})
	}

	h._clientEntrySrc = pathsFile.ClientEntrySrc
	h._clientEntryOut = pathsFile.ClientEntryOut

	// add data funcs to paths
	listOfPatterns := make([]string, 0, len(h._paths))
	for i, path := range h._paths {
		if loader, ok := h.Loaders[path.Pattern]; ok {
			h._paths[i].DataFunction = loader
		}

		listOfPatterns = append(listOfPatterns, path.Pattern)
	}
	for pattern := range h.Loaders {
		if !slices.Contains(listOfPatterns, pattern) {
			Log.Error(fmt.Sprintf(
				"Warning: no matching path found for pattern %v. Make sure you're writing your patterns correctly and that your client route exists.",
				pattern,
			))
		}
	}

	h._clientEntryDeps = pathsFile.ClientEntryDeps

	h._depToCSSBundleMap = pathsFile.DepToCSSBundleMap
	if h._depToCSSBundleMap == nil {
		h._depToCSSBundleMap = make(map[string]string)
	}

	h.Validator = &validate.Validate{
		Instance: validator.New(validator.WithRequiredStructEnabled()),
	}

	tmpl, err := template.ParseFS(h.FS, h.RootTemplateLocation)
	if err != nil {
		return fmt.Errorf("error parsing root template: %v", err)
	}
	h._rootTemplate = tmpl

	return nil
}

func getBasePaths_StageOneOrTwo(FS fs.FS, isDev bool) (*PathsFile, error) {
	fileToUse := HwyPathsStageOneJSONFileName
	if !isDev {
		fileToUse = HwyPathsStageTwoJSONFileName
	}

	pathsFile := PathsFile{}
	file, err := FS.Open(fileToUse)
	if err != nil {
		errMsg := fmt.Sprintf("could not open %s: %v", fileToUse, err)
		Log.Error(errMsg)
		return nil, errors.New(errMsg)
	}
	defer file.Close()
	decoder := json.NewDecoder(file)
	err = decoder.Decode(&pathsFile)
	if err != nil {
		errMsg := fmt.Sprintf("could not decode %s: %v", fileToUse, err)
		Log.Error(errMsg)
		return nil, errors.New(errMsg)
	}
	return &pathsFile, nil
}
