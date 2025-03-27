package ki

import (
	"context"
	"encoding/json"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
	"sync"

	esbuild "github.com/evanw/esbuild/pkg/api"
	"github.com/sjc5/river/kit/errutil"
	"github.com/sjc5/river/kit/esbuildutil"
	"github.com/sjc5/river/kit/fsutil"
	"github.com/sjc5/river/kit/typed"
	"golang.org/x/sync/errgroup"
	"golang.org/x/sync/semaphore"
)

var noHashPublicDirsByVersion = map[uint8]string{0: "__nohash", 1: "prehashed"}

func (c *Config) Build(recompileBinary bool, shouldBeGranular bool) error {
	enforceProperInstantiation(c)

	c.fileSemaphore = semaphore.NewWeighted(100)

	if !shouldBeGranular {

		// nuke the dist/kiruna directory
		if err := os.RemoveAll(c.__dist.S().Kiruna.FullPath()); err != nil {
			return fmt.Errorf("error removing dist/kiruna directory: %v", err)
		}

		// re-make required directories
		if err := c.SetupDistDir(); err != nil {
			return fmt.Errorf("error making requisite directories: %v", err)
		}
	}

	if !c.ServerOnly {
		// Must be complete before BuildCSS in case the CSS references any public files
		if err := c.handlePublicFiles(shouldBeGranular); err != nil {
			return fmt.Errorf("error handling public files: %v", err)
		}

		var eg errgroup.Group
		eg.Go(func() error {
			return errutil.Maybe("error during precompile task (copyPrivateFiles)", c.copyPrivateFiles(shouldBeGranular))
		})
		eg.Go(func() error {
			return errutil.Maybe("error during precompile task (buildCSS)", c.buildCSS())
		})
		if err := eg.Wait(); err != nil {
			return err
		}
	}

	if recompileBinary {
		if err := c.compileBinary(); err != nil {
			return fmt.Errorf("error compiling binary: %v", err)
		}
	}
	return nil
}

func (c *Config) buildCSS() error {
	err := c.processCSSCritical()
	if err != nil {
		return fmt.Errorf("error processing critical CSS: %v", err)
	}

	err = c.processCSSNormal()
	if err != nil {
		return fmt.Errorf("error processing normal CSS: %v", err)
	}

	return nil
}

type esbuildCtxSafe struct {
	ctx esbuild.BuildContext
	mu  sync.Mutex
}

var (
	cssImportURLsMu         *sync.RWMutex  = &sync.RWMutex{}
	criticalReliedUponFiles                = map[string]struct{}{}
	normalReliedUponFiles                  = map[string]struct{}{}
	esbuildCtxCritical      esbuildCtxSafe = esbuildCtxSafe{}
	esbuildCtxNormal        esbuildCtxSafe = esbuildCtxSafe{}
)

func (c *Config) processCSSCritical() error { return c.__processCSS("critical") }
func (c *Config) processCSSNormal() error   { return c.__processCSS("normal") }

// nature = "critical" or "normal"
func (c *Config) __processCSS(nature string) error {
	entryPoint := c.cleanSources.NormalCSSEntry
	if nature == "critical" {
		entryPoint = c.cleanSources.CriticalCSSEntry
	}

	if entryPoint == "" {
		return nil
	}

	isDev := GetIsDev()

	ctx, ctxErr := esbuild.Context(esbuild.BuildOptions{
		EntryPoints:       []string{entryPoint},
		Bundle:            true,
		MinifyWhitespace:  !isDev,
		MinifyIdentifiers: !isDev,
		MinifySyntax:      !isDev,
		Write:             false,
		Metafile:          true,
		Plugins: []esbuild.Plugin{
			{
				Name: "url-resolver",
				Setup: func(build esbuild.PluginBuild) {
					build.OnResolve(esbuild.OnResolveOptions{Filter: ".*", Namespace: "file"},
						func(args esbuild.OnResolveArgs) (esbuild.OnResolveResult, error) {
							if args.Kind == esbuild.ResolveCSSURLToken {
								return esbuild.OnResolveResult{
									Path:     c.MustGetPublicURLBuildtime(args.Path),
									External: true,
								}, nil
							}
							return esbuild.OnResolveResult{}, nil
						},
					)
				},
			},
		},
	})
	if ctxErr != nil {
		return fmt.Errorf("error creating esbuild context: %v", ctxErr.Errors)
	}

	if nature == "critical" {
		esbuildCtxCritical.mu.Lock()
		esbuildCtxCritical.ctx = ctx
		esbuildCtxCritical.mu.Unlock()
	} else {
		esbuildCtxNormal.mu.Lock()
		esbuildCtxNormal.ctx = ctx
		esbuildCtxNormal.mu.Unlock()
	}

	result := ctx.Rebuild()
	if err := esbuildutil.CollectErrors(result); err != nil {
		return fmt.Errorf("error building CSS: %v", err)
	}

	var metafile esbuildutil.ESBuildMetafileSubset
	if err := json.Unmarshal([]byte(result.Metafile), &metafile); err != nil {
		return fmt.Errorf("error unmarshalling esbuild metafile: %v", err)
	}

	srcURL := c.cleanSources.NormalCSSEntry
	if nature == "critical" {
		srcURL = c.cleanSources.CriticalCSSEntry
	}

	imports := metafile.Inputs[srcURL].Imports

	cssImportURLsMu.Lock()

	if nature == "critical" {
		criticalReliedUponFiles = map[string]struct{}{}
	} else {
		normalReliedUponFiles = map[string]struct{}{}
	}

	for _, imp := range imports {
		if imp.Kind != "import-rule" {
			continue
		}

		if nature == "critical" {
			criticalReliedUponFiles[imp.Path] = struct{}{}
		} else {
			normalReliedUponFiles[imp.Path] = struct{}{}
		}
	}

	cssImportURLsMu.Unlock()

	// Determine output path and filename
	var outputPath string

	switch nature {
	case "critical":
		outputPath = c.__dist.S().Kiruna.S().Internal.FullPath()
	case "normal":
		outputPath = c.__dist.S().Kiruna.S().Static.S().Public.FullPath()
	}

	outputFileName := nature + ".css" // Default for 'critical'

	if nature == "normal" {
		// first, delete the old normal.css file(s)
		oldNormalPath := filepath.Join(outputPath, "normal_*.css")
		oldNormalFiles, err := filepath.Glob(oldNormalPath)
		if err != nil {
			return fmt.Errorf("error finding old normal CSS files: %v", err)
		}
		for _, oldNormalFile := range oldNormalFiles {
			if err := os.Remove(oldNormalFile); err != nil {
				return fmt.Errorf("error removing old normal CSS file: %v", err)
			}
		}

		// Hash the css output
		outputFileName = getHashedFilenameFromBytes(result.OutputFiles[0].Contents, "normal.css")
	}

	// Ensure output directory exists
	if err := os.MkdirAll(outputPath, 0755); err != nil {
		return fmt.Errorf("error creating output directory: %v", err)
	}

	// Write css to file
	outputFile := filepath.Join(outputPath, outputFileName)

	// If normal, also write to a file called normal_css_ref.txt with the hash
	if nature == "normal" {
		hashFile := c.__dist.S().Kiruna.S().Internal.S().NormalCSSFileRefDotTXT.FullPath()
		if err := os.WriteFile(hashFile, []byte(outputFileName), 0644); err != nil {
			return fmt.Errorf("error writing to file: %v", err)
		}
	}

	return os.WriteFile(outputFile, result.OutputFiles[0].Contents, 0644)
}

type staticFileProcessorOpts struct {
	basename         string
	srcDir           string
	distDir          string
	mapName          string
	shouldBeGranular bool
	getIsNoHashDir   func(string) (bool, uint8)
	writeWithHash    bool
}

func (c *Config) handlePublicFiles(shouldBeGranular bool) error {
	return c.processStaticFiles(&staticFileProcessorOpts{
		basename:         PUBLIC,
		srcDir:           c.cleanSources.PublicStatic,
		distDir:          c.__dist.S().Kiruna.S().Static.S().Public.FullPath(),
		mapName:          PublicFileMapGobName,
		shouldBeGranular: shouldBeGranular,
		getIsNoHashDir: func(path string) (bool, uint8) {
			if strings.HasPrefix(path, noHashPublicDirsByVersion[1]) {
				return true, 1
			}
			if strings.HasPrefix(path, noHashPublicDirsByVersion[0]) {
				return true, 0
			}
			return false, 0
		},
		writeWithHash: true,
	})
}

func (c *Config) copyPrivateFiles(shouldBeGranular bool) error {
	return c.processStaticFiles(&staticFileProcessorOpts{
		basename:         PRIVATE,
		srcDir:           c.cleanSources.PrivateStatic,
		distDir:          c.__dist.S().Kiruna.S().Static.S().Private.FullPath(),
		mapName:          PrivateFileMapGobName,
		shouldBeGranular: shouldBeGranular,
		getIsNoHashDir: func(path string) (bool, uint8) {
			return false, 0
		},
		writeWithHash: false,
	})
}

type fileInfo struct {
	path         string
	relativePath string
	isNoHashDir  bool
}

// __TODO this should probably be a config option and use glob patterns
var STATIC_FILES_IGNORE_LIST = map[string]struct{}{
	".DS_Store": {},
}

func (c *Config) processStaticFiles(opts *staticFileProcessorOpts) error {
	if _, err := os.Stat(opts.srcDir); os.IsNotExist(err) {
		return nil
	}

	newFileMap := typed.SyncMap[string, fileVal]{}
	oldFileMap := typed.SyncMap[string, fileVal]{}

	// Load old file map if granular updates are enabled
	if opts.shouldBeGranular {
		var err error
		oldMap, err := c.loadMapFromGob(opts.mapName, true)
		if err != nil {
			return fmt.Errorf("error reading old file map: %v", err)
		}
		for k, v := range oldMap {
			oldFileMap.Store(k, v)
		}
	}

	fileChan := make(chan fileInfo, 100)
	errChan := make(chan error, 1)
	var wg sync.WaitGroup

	// File discovery goroutine
	go func() {
		defer close(fileChan)
		err := filepath.WalkDir(opts.srcDir, func(path string, d fs.DirEntry, err error) error {
			if err != nil {
				return err
			}
			if !d.IsDir() {
				relativePath, err := filepath.Rel(opts.srcDir, path)
				if err != nil {
					return err
				}
				relativePath = filepath.ToSlash(relativePath)
				isNoHashDir, version := opts.getIsNoHashDir(relativePath)
				if isNoHashDir {
					relativePath = strings.TrimPrefix(relativePath, noHashPublicDirsByVersion[version]+"/")
				}
				if _, isIgnore := STATIC_FILES_IGNORE_LIST[relativePath]; isIgnore {
					return nil
				}
				fileChan <- fileInfo{path: path, relativePath: relativePath, isNoHashDir: isNoHashDir}
			}
			return nil
		})
		if err != nil {
			errChan <- err
		}
	}()

	// File processing goroutines
	workerCount := 4
	for range workerCount {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for fi := range fileChan {
				if err := c.processFile(fi, opts, &newFileMap, &oldFileMap, opts.distDir); err != nil {
					errChan <- err
					return
				}
			}
		}()
	}

	go func() {
		wg.Wait()
		close(errChan)
	}()

	if err := <-errChan; err != nil {
		return err
	}

	// Cleanup old moot files if granular updates are enabled
	if opts.shouldBeGranular {
		var oldMapErr error
		oldFileMap.Range(func(k string, v fileVal) bool {
			if newHash, exists := newFileMap.Load(k); !exists || newHash != v {
				oldDistPath := filepath.Join(opts.distDir, v.Val)
				err := os.Remove(oldDistPath)
				if err != nil && !os.IsNotExist(err) {
					oldMapErr = fmt.Errorf(
						"error removing old static file from dist (%s/%v): %v", opts.basename, v, err,
					)
					return false
				}
			}
			return true
		})
		if oldMapErr != nil {
			return oldMapErr
		}
	}

	// Save the updated file map
	err := c.saveMapToGob(toStdMap(&newFileMap), opts.mapName)
	if err != nil {
		return fmt.Errorf("error saving file map: %v", err)
	}

	if opts.basename == PUBLIC {
		err = c.savePublicFileMapJSToInternalPublicDir(toStdMap(&newFileMap))
		if err != nil {
			return fmt.Errorf("error saving public file map JSON: %v", err)
		}
	}

	return nil
}

func (c *Config) processFile(
	fi fileInfo,
	opts *staticFileProcessorOpts,
	newFileMap,
	oldFileMap *typed.SyncMap[string, fileVal],
	distDir string,
) error {
	if err := c.fileSemaphore.Acquire(context.Background(), 1); err != nil {
		return fmt.Errorf("error acquiring semaphore: %v", err)
	}
	defer c.fileSemaphore.Release(1)

	relativePathUnderscores := strings.ReplaceAll(fi.relativePath, "/", "_")

	var fileIdentifier fileVal
	if fi.isNoHashDir {
		fileIdentifier.Val = fi.relativePath
		fileIdentifier.IsPrehashed = true
	} else {
		var err error
		name, err := getHashedFilenameFromPath(fi.path, relativePathUnderscores)
		if err != nil {
			return fmt.Errorf("error getting hashed filename: %v", err)
		}
		fileIdentifier.Val = name
	}

	newFileMap.Store(fi.relativePath, fileIdentifier)

	// Skip unchanged files if granular updates are enabled
	if opts.shouldBeGranular {
		if oldHash, exists := oldFileMap.Load(fi.relativePath); exists && oldHash == fileIdentifier {
			return nil
		}
	}

	var distPath string
	if opts.writeWithHash {
		distPath = filepath.Join(distDir, fileIdentifier.Val)
	} else {
		distPath = filepath.Join(distDir, fi.relativePath)
	}

	err := os.MkdirAll(filepath.Dir(distPath), 0755)
	if err != nil {
		return fmt.Errorf("error creating directory: %v", err)
	}

	err = fsutil.CopyFile(fi.path, distPath)
	if err != nil {
		return fmt.Errorf("error copying file: %v", err)
	}

	return nil
}

func toStdMap(sm *typed.SyncMap[string, fileVal]) map[string]fileVal {
	m := make(map[string]fileVal)
	sm.Range(func(k string, v fileVal) bool {
		m[k] = v
		return true
	})
	return m
}
