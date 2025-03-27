package ki

import (
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"

	"github.com/sjc5/river/x/kit/executil"
)

func (c *Config) getIsUsingEmbeddedFS() bool {
	return c.DistFS != nil
}

func (c *Config) getInitialBaseDirFS() (fs.FS, error) {
	return os.DirFS(c.__dist.S().Kiruna.FullPath()), nil
}

func (c *Config) getSubFSPrivate() (fs.FS, error) { return c.__getSubFS(PRIVATE) }
func (c *Config) getSubFSPublic() (fs.FS, error)  { return c.__getSubFS(PUBLIC) }

// subDir = "public" or "private"
func (c *Config) __getSubFS(subDir string) (fs.FS, error) {
	// __LOCATION_ASSUMPTION: Inside "dist/kiruna"
	path := filepath.Join(c.__dist.S().Kiruna.S().Static.LastSegment(), subDir)

	baseFS, err := c.GetBaseFS()
	if err != nil {
		errMsg := fmt.Sprintf("error getting %s FS: %v", subDir, err)
		c.Logger.Error(errMsg)
		return nil, errors.New(errMsg)
	}
	subFS, err := fs.Sub(baseFS, path)
	if err != nil {
		errMsg := fmt.Sprintf("error getting %s FS: %v", subDir, err)
		c.Logger.Error(errMsg)
		return nil, errors.New(errMsg)
	}
	return subFS, nil
}

func (c *Config) GetPublicFS() (fs.FS, error) {
	return c.runtimeCache.publicFS.Get()
}

func (c *Config) GetPrivateFS() (fs.FS, error) {
	return c.runtimeCache.privateFS.Get()
}

// GetBaseFS returns a filesystem interface that works across different environments (dev/prod)
// and supports both embedded and non-embedded filesystems.
func (c *Config) GetBaseFS() (fs.FS, error) {
	return c.runtimeCache.baseFS.Get()
}

func (c *Config) getInitialBaseFS() (fs.FS, error) {
	useVerboseLogs := getUseVerboseLogs()

	// DEV
	// There is an expectation that you run the dev server from the root of your project,
	// where your go.mod file is.
	if GetIsDev() {
		if useVerboseLogs {
			c.Logger.Info("using disk filesystem (dev)")
		}

		return os.DirFS(c.__dist.S().Kiruna.FullPath()), nil
	}

	// If we are using the embedded file system, we should use the dist file system
	if c.getIsUsingEmbeddedFS() {
		if useVerboseLogs {
			c.Logger.Info("using embedded filesystem (prod)")
		}

		// Assuming the embed directive looks like this:
		// //go:embed kiruna
		// That means that the kiruna folder itself (not just its contents) is embedded.
		// So we have to drop down into the kiruna folder here.
		embeddedFS, err := fs.Sub(c.DistFS, c.__dist.S().Kiruna.LastSegment())
		if err != nil {
			return nil, err
		}

		return embeddedFS, nil
	}

	if useVerboseLogs {
		c.Logger.Info("using disk filesystem (prod)")
	}

	// If we are not using the embedded file system, we should use the os file system,
	// and assume that the executable is a sibling to the kiruna-outputted "kiruna" directory
	execDir, err := executil.GetExecutableDir()
	if err != nil {
		return nil, err
	}

	return os.DirFS(execDir), nil
}
