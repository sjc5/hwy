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

func (h *Hwy) Init() error {
	if h.FS == nil {
		return errors.New("FS is nil")
	}

	pathsFile, err := getBasePaths(h.FS)
	if err != nil {
		errMsg := fmt.Sprintf("could not get base paths: %v", err)
		Log.Errorf(errMsg)
		return errors.New(errMsg)
	}
	h.buildID = pathsFile.BuildID

	if h.paths == nil {
		ip := make([]Path, 0, len(pathsFile.Paths))
		h.paths = ip
	}
	for _, pathBase := range pathsFile.Paths {
		h.paths = append(h.paths, Path{PathBase: pathBase})
	}

	h.addDataFuncsToPaths()
	h.clientEntryDeps = pathsFile.ClientEntryDeps

	h.depToCSSBundleMap = pathsFile.DepToCSSBundleMap
	if h.depToCSSBundleMap == nil {
		h.depToCSSBundleMap = make(map[string]string)
	}

	h.Validator = &validate.Validate{
		Instance: validator.New(validator.WithRequiredStructEnabled()),
	}

	tmpl, err := template.ParseFS(h.FS, h.RootTemplateLocation)
	if err != nil {
		return fmt.Errorf("error parsing root template: %v", err)
	}
	h.rootTemplate = tmpl

	return nil
}

func (h *Hwy) addDataFuncsToPaths() {
	listOfPatterns := make([]string, 0, len(h.paths))

	for i, path := range h.paths {
		if loader, ok := h.Loaders[path.Pattern]; ok {
			h.paths[i].DataFunction = loader
		}

		listOfPatterns = append(listOfPatterns, path.Pattern)
	}

	for pattern := range h.Loaders {
		if !slices.Contains(listOfPatterns, pattern) {
			Log.Errorf("Warning: no matching path found for pattern %v. Make sure you're writing your patterns correctly and that your client route exists.", pattern)
		}
	}
}

func getBasePaths(FS fs.FS) (*PathsFile, error) {
	pathsFile := PathsFile{}
	file, err := FS.Open(HwyPathsFileName)
	if err != nil {
		errMsg := fmt.Sprintf("could not open %s: %v", HwyPathsFileName, err)
		Log.Errorf(errMsg)
		return nil, errors.New(errMsg)
	}
	defer file.Close()
	decoder := json.NewDecoder(file)
	err = decoder.Decode(&pathsFile)
	if err != nil {
		errMsg := fmt.Sprintf("could not decode %s: %v", HwyPathsFileName, err)
		Log.Errorf(errMsg)
		return nil, errors.New(errMsg)
	}
	return &pathsFile, nil
}
