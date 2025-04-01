package ki

import (
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"

	"github.com/sjc5/river/kit/executil"
)

func (c *Config) get_is_using_embedded_fs() bool {
	return c.DistFS != nil
}

func (c *Config) get_initial_base_dir_fs() (fs.FS, error) {
	return os.DirFS(c._dist.S().Kiruna.FullPath()), nil
}

func (c *Config) getSubFSPrivate() (fs.FS, error) { return c.__getSubFS(PRIVATE) }
func (c *Config) getSubFSPublic() (fs.FS, error)  { return c.__getSubFS(PUBLIC) }

// subDir = "public" or "private"
func (c *Config) __getSubFS(subDir string) (fs.FS, error) {
	// __LOCATION_ASSUMPTION: Inside "dist/kiruna"
	path := filepath.Join(c._dist.S().Kiruna.S().Static.LastSegment(), subDir)

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
	return c.runtime_cache.public_fs.Get()
}

func (c *Config) GetPrivateFS() (fs.FS, error) {
	return c.runtime_cache.private_fs.Get()
}

// GetBaseFS returns a filesystem interface that works across different environments (dev/prod)
// and supports both embedded and non-embedded filesystems.
func (c *Config) GetBaseFS() (fs.FS, error) {
	return c.runtime_cache.base_fs.Get()
}

func (c *Config) get_initial_base_fs() (fs.FS, error) {
	// DEV
	// There is an expectation that you run the dev server from the root of your project,
	// where your go.mod file is.
	if GetIsDev() {
		c.Logger.Info("using dev filesystem")

		return os.DirFS(c._dist.S().Kiruna.FullPath()), nil
	}

	// If we are using the embedded file system, we should use the dist file system
	if c.get_is_using_embedded_fs() {
		c.Logger.Info("using embedded filesystem (prod)")

		directive := c.EmbedDirective

		if directive == "" {
			c.Logger.Warn("no embed directive set in Kiruna.New -- assuming 'kiruna'")
			directive = c._dist.S().Kiruna.LastSegment()
		}

		// if first 4 are "all:", strip
		if len(directive) > 4 && directive[:4] == "all:" {
			directive = directive[4:]
		}

		// Assuming the embed directive looks like this:
		// //go:embed kiruna
		// That means that the kiruna folder itself (not just its contents) is embedded.
		// So we have to drop down into the kiruna folder here.
		embeddedFS, err := fs.Sub(c.DistFS, directive)
		if err != nil {
			return nil, err
		}

		return embeddedFS, nil
	}

	c.Logger.Info("using os filesystem (prod)")

	// If we are not using the embedded file system, we should use the os file system,
	// and assume that the executable is a sibling to the kiruna-outputted "kiruna" directory
	execDir, err := executil.GetExecutableDir()
	if err != nil {
		return nil, err
	}

	return os.DirFS(filepath.Join(execDir, c._dist.S().Kiruna.LastSegment())), nil
}
