package hi

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"github.com/sjc5/river/x/kit/viteutil"
)

func (h *Hwy[C]) Vite(isDev bool) error {
	ctx := viteutil.NewBuildCtx(&viteutil.BuildCtxOptions{
		JSPackageManagerBaseCmd: h.JSPackageManagerBaseCmd,
		JSPackageManagerCmdDir:  h.JSPackageManagerCmdDir,
		ManifestOutDir:          h.StaticPublicOutDir,
	})

	if err := ctx.Build(isDev); err != nil {
		return err
	}

	if !isDev {
		// Must come after Vite -- only needed in prod (the stage "one" version is fine in dev)
		pf, err := h.toPathsFile_StageTwo()
		if err != nil {
			Log.Error(fmt.Sprintf("error converting paths to paths file: %s", err))
			return err
		}

		pathsAsJSON, err := json.MarshalIndent(pf, "", "\t")

		if err != nil {
			Log.Error(fmt.Sprintf("error marshalling paths to JSON: %s", err))
			return err
		}

		pathsJSONOut_StageTwo := filepath.Join(h.StaticPrivateOutDir, HwyPathsStageTwoJSONFileName)
		err = os.WriteFile(pathsJSONOut_StageTwo, pathsAsJSON, os.ModePerm)
		if err != nil {
			Log.Error(fmt.Sprintf("error writing paths to disk: %s", err))
			return err
		}
	}

	return nil
}
