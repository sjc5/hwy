package ki

import (
	"path/filepath"

	"github.com/sjc5/river/kit/viteutil"
)

func (c *Config) isUsingVite() bool {
	return c._uc.Vite != nil
}

func (c *Config) toViteCtx() *viteutil.BuildCtx {
	return viteutil.NewBuildCtx(&viteutil.BuildCtxOptions{
		JSPackageManagerBaseCmd: c._uc.Vite.JSPackageManagerBaseCmd,
		JSPackageManagerCmdDir:  c._uc.Vite.JSPackageManagerCmdDir,
		ManifestOutDir:          filepath.Join(c._uc.Core.StaticAssetDirs.Public, "prehashed"),
		ViteConfigFile:          c._uc.Vite.ViteConfigFile,
	})
}

func (c *Config) viteDevBuild() (*viteutil.DevInfo, error) {
	if !c.isUsingVite() {
		return nil, nil
	}
	ctx := c.toViteCtx()
	return ctx.DevBuild()
}

func (c *Config) ViteProdBuild() error {
	if !c.isUsingVite() {
		return nil
	}
	ctx := c.toViteCtx()
	return ctx.ProdBuild()
}
