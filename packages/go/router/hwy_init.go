package router

import (
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"slices"
)

func (h *Hwy) Initialize() error {
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
		h.paths = append(h.paths, Path{
			PathBase: pathBase,
		})
	}

	h.addDataFuncsToPaths()
	h.clientEntryDeps = pathsFile.ClientEntryDeps

	return nil
}

func (h *Hwy) addDataFuncsToPaths() {
	listOfPatterns := make([]string, 0, len(h.paths))

	for i, path := range h.paths {
		if dataFuncs, ok := (h.DataFuncsMap)[path.Pattern]; ok {
			(h.paths)[i].DataFuncs = &dataFuncs
		}
		listOfPatterns = append(listOfPatterns, path.Pattern)
	}

	for pattern := range h.DataFuncsMap {
		if pattern != "AdHocData" && !slices.Contains(listOfPatterns, pattern) {
			Log.Errorf("Warning: no matching path found for pattern %v. Make sure you're writing your patterns correctly and that your client route exists.", pattern)
		}
		if pattern == "AdHocData" {
			h.getAdHocData = h.DataFuncsMap[pattern].Loader
		}
	}
}

func getBasePaths(FS fs.FS) (*PathsFile, error) {
	pathsFile := PathsFile{}
	file, err := FS.Open("hwy_paths.json")
	if err != nil {
		errMsg := fmt.Sprintf("could not open hwy_paths.json: %v", err)
		Log.Errorf(errMsg)
		return nil, errors.New(errMsg)
	}
	defer file.Close()
	decoder := json.NewDecoder(file)
	err = decoder.Decode(&pathsFile)
	if err != nil {
		errMsg := fmt.Sprintf("could not decode hwy_paths.json: %v", err)
		Log.Errorf(errMsg)
		return nil, errors.New(errMsg)
	}
	return &pathsFile, nil
}
