package router

import (
	"encoding/json"
	"errors"
	"fmt"
	"html/template"
	"io/fs"

	"github.com/go-playground/validator/v10"
	"github.com/sjc5/kit/pkg/mux"
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
		h._paths = make(map[string]*Path, len(pathsFile.Paths))
	}

	if h.NestedRouter == nil {
		panic("hwy.NestedRouter is nil")
	}

	for _, p := range pathsFile.Paths {
		h._paths[p.Pattern] = p
		_is_already_registered := h.NestedRouter.IsRegistered(p.Pattern)
		if !_is_already_registered {
			mux.RegisterNestedPatternWithoutHandler(h.NestedRouter, p.Pattern)
		}
	}

	h._clientEntrySrc = pathsFile.ClientEntrySrc
	h._clientEntryOut = pathsFile.ClientEntryOut

	for pattern := range h.NestedRouter.AllRoutes() {
		if _, exists := h._paths[pattern]; !exists {
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
