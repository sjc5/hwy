package ki

import (
	"html/template"
	"io/fs"
	"log/slog"
	"os/exec"
	"sync"

	"github.com/fsnotify/fsnotify"
	"github.com/sjc5/river/kit/dirs"
	"github.com/sjc5/river/kit/safecache"
	"golang.org/x/sync/semaphore"
)

/////////////////////////////////////////////////////////////////////
/////// DEV CACHE
/////////////////////////////////////////////////////////////////////

type dev struct {
	mu sync.Mutex

	watcher                *fsnotify.Watcher
	lastBuildCmd           *exec.Cmd
	browserTabManager      *clientManager
	fileSemaphore          *semaphore.Weighted
	ignoredDirPatterns     []string
	ignoredFilePatterns    []string
	naiveIgnoreDirPatterns []string
	defaultWatchedFiles    []WatchedFile
	matchResults           *safecache.CacheMap[potentialMatch, string, bool]
}

/////////////////////////////////////////////////////////////////////
/////// RUNTIME CACHE
/////////////////////////////////////////////////////////////////////

type runtime struct {
	runtime_cache runtimeCache
}

type runtimeCache struct {
	// FS
	base_fs     *safecache.Cache[fs.FS]
	base_dir_fs *safecache.Cache[fs.FS]
	public_fs   *safecache.Cache[fs.FS]
	private_fs  *safecache.Cache[fs.FS]

	// CSS
	stylesheet_link_el *safecache.Cache[*template.HTML]
	stylesheet_url     *safecache.Cache[string]
	critical_css       *safecache.Cache[*criticalCSSStatus]

	// Public URLs
	public_filemap_from_gob *safecache.Cache[FileMap]
	public_filemap_url      *safecache.Cache[string]
	public_filemap_details  *safecache.Cache[*publicFileMapDetails]
	public_urls             *safecache.CacheMap[string, string, string]
}

func (c *Config) InitRuntimeCache() {
	c.runtime_cache = runtimeCache{
		// FS
		base_fs:     safecache.New(c.get_initial_base_fs, GetIsDev),
		base_dir_fs: safecache.New(c.get_initial_base_dir_fs, GetIsDev),
		public_fs:   safecache.New(func() (fs.FS, error) { return c.getSubFSPublic() }, GetIsDev),
		private_fs:  safecache.New(func() (fs.FS, error) { return c.getSubFSPrivate() }, GetIsDev),

		// CSS
		stylesheet_link_el: safecache.New(c.getInitialStyleSheetLinkElement, GetIsDev),
		stylesheet_url:     safecache.New(c.getInitialStyleSheetURL, GetIsDev),
		critical_css:       safecache.New(c.getInitialCriticalCSSStatus, GetIsDev),

		// Public URLs
		public_filemap_from_gob: safecache.New(c.getInitialPublicFileMapFromGobRuntime, GetIsDev),
		public_filemap_url:      safecache.New(c.getInitialPublicFileMapURL, GetIsDev),
		public_filemap_details:  safecache.New(c.getInitialPublicFileMapDetails, GetIsDev),
		public_urls: safecache.NewMap(c.getInitialPublicURL, publicURLsKeyMaker, func(string) bool {
			return GetIsDev()
		}),
	}
}

/////////////////////////////////////////////////////////////////////
/////// KIRUNA CONFIG
/////////////////////////////////////////////////////////////////////

type Config struct {
	// If not nil, the embedded file system will be used in production builds.
	// If nil, the disk file system will be used in production builds.
	// Only relevant in prod (in dev mode, the real disk FS is always used).
	// If nil in prod, you need to make sure that you ship the dist directory
	// with your binary. For simplicity, we recommend using the embedded FS.
	DistFS         fs.FS
	EmbedDirective string
	ConfigFile     string
	Logger         *slog.Logger
	FilesToVendor  [][2]string // __TODO move to json config

	dev
	runtime
	cleanSources   CleanSources
	cleanWatchRoot string
	_dist          *dirs.Dir[Dist]
	_uc            *UserConfig

	_rebuild_cleanup_chan chan struct{}
}

type CleanSources struct {
	Dist                string
	PrivateStatic       string
	PublicStatic        string
	CriticalCSSEntry    string
	NonCriticalCSSEntry string
}

func (c *Config) GetPrivateStaticDir() string {
	return c._uc.Core.StaticAssetDirs.Private
}
func (c *Config) GetPublicStaticDir() string {
	return c._uc.Core.StaticAssetDirs.Public
}
func (c *Config) GetDistDir() string {
	return c._uc.Core.DistDir
}
func (c *Config) GetPublicPathPrefix() string {
	return c._uc.Core.PublicPathPrefix
}

/////////////////////////////////////////////////////////////////////
/////// USER CONFIG
/////////////////////////////////////////////////////////////////////

type Timing string

var TimingEnum = struct {
	Pre              Timing
	Post             Timing
	Concurrent       Timing
	ConcurrentNoWait Timing
}{
	Pre:              "pre",
	Post:             "post",
	Concurrent:       "concurrent",
	ConcurrentNoWait: "concurrent-no-wait",
}

type UserConfig struct {
	Core  *UserConfigCore
	Vite  *UserConfigVite
	Watch *UserConfigWatch
}

type UserConfigCore struct {
	DevBuildHook     string
	ProdBuildHook    string
	MainAppEntry     string
	DistDir          string
	StaticAssetDirs  StaticAssetDirs
	CSSEntryFiles    CSSEntryFiles
	PublicPathPrefix string
	ServerOnlyMode   bool
}

type StaticAssetDirs struct {
	Private string
	Public  string
}

type CSSEntryFiles struct {
	Critical    string
	NonCritical string
}

type UserConfigVite struct {
	JSPackageManagerBaseCmd string
	JSPackageManagerCmdDir  string
	DefaultPort             int
	ViteConfigFile          string
}

type UserConfigWatch struct {
	WatchRoot           string
	HealthcheckEndpoint string
	Include             []WatchedFile
	Exclude             struct {
		Dirs  []string
		Files []string
	}
}

type OnChangeHook struct {
	Cmd     string
	Timing  Timing
	Exclude []string
}

type WatchedFile struct {
	Pattern                        string
	OnChangeHooks                  []OnChangeHook
	RecompileGoBinary              bool
	RestartApp                     bool
	RunClientDefinedRevalidateFunc bool
	RunOnChangeOnly                bool
	SkipRebuildingNotification     bool
	TreatAsNonGo                   bool
}
