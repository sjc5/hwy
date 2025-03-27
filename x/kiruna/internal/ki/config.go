package ki

import (
	"fmt"
	"io/fs"
	"log/slog"
	"sync"

	"github.com/sjc5/river/x/kit/dirs"
)

type Config struct {
	dev
	runtime
	initializedWithNew bool
	commonInitOnce     sync.Once
	devConfig          *DevConfig
	cleanSources       CleanSources
	cleanWatchRoot     string
	__dist             *dirs.Dir[Dist]

	// If not nil, the embedded file system will be used in production builds.
	// If nil, the disk file system will be used in production builds.
	// Only relevant in prod (in dev mode, the real disk FS is always used).
	// If nil in prod, you need to make sure that you ship the dist directory
	// with your binary. For simplicity, we recommend using the embedded FS.
	DistFS fs.FS

	// Path to your main.go entry file, relative to the directory you're running commands from (e.g., "./cmd/app/main.go"). Required.
	MainAppEntry string

	// Set this relative to the directory you're running commands from (e.g., "./dist").
	// Required.
	// Must be unique from PrivateStaticDir and PublicStaticDir.
	DistDir string

	// Set this relative to the directory you're running commands from (e.g., "./private-static").
	// Required unless you have DevConfig.ServerOnly set to true.
	// Must be unique from PublicStaticDir and DistDir.
	PrivateStaticDir string

	// Set this relative to the directory you're running commands from (e.g., "./public-static").
	// Required unless you have DevConfig.ServerOnly set to true.
	// Must be unique from PrivateStaticDir and DistDir.
	PublicStaticDir string

	// Set this relative to the directory you're running commands from (e.g., "./critical.css").
	CriticalCSSEntry string

	// Set this relative to the directory you're running commands from (e.g., "./main.css").
	NormalCSSEntry string

	Logger     *slog.Logger
	ServerOnly bool // If true, skips static asset processing/serving and browser reloading.
}

type CleanSources struct {
	Dist             string
	PrivateStatic    string
	PublicStatic     string
	CriticalCSSEntry string
	NormalCSSEntry   string
}

type DevConfig struct {
	// WatchRoot is the outermost directory to watch for changes in, and your
	// dev config watched files will be set relative to this directory. If you
	// leave it blank, it will default to ".". Set this relative to the directory
	// you're running commands from.
	WatchRoot           string
	HealthcheckEndpoint string // e.g., "/healthz" -- should return 200 OK if healthy -- defaults to "/"
	WatchedFiles        WatchedFiles
	IgnorePatterns      IgnorePatterns
}

type WatchedFile struct {
	Pattern string // Glob pattern (set relative to Config.RootDir)

	// By default, OnChange runs before any Kiruna processing. As long as "SkipRebuildingNotification"
	// is false (default), Kiruna will send a signal to the browser to show the
	// "Rebuilding..." status message first. You can also change the OnChange strategy to
	// "post" or "concurrent" if desired.
	OnChangeCallbacks []OnChange

	// Use this if your onChange saves a file that will trigger another reload process,
	// or if you need this behavior for any other reason. Will not reload the browser.
	// Note that if you use this setting, you should not set an explicit strategy on
	// the OnChange callbacks (or set them explicitly to "pre"). If you set them to
	// "post" or "concurrent" while using RunOnChangeOnly, the OnChange callbacks will
	// not run.
	RunOnChangeOnly bool

	// Use this if you are using RunOnChangeOnly, but your onchange won't actually
	// trigger another reload process (so you dont get stuck with "Rebuilding..."
	// showing in the browser)
	SkipRebuildingNotification bool

	// Use this if you need the binary recompiled before the browser is reloaded
	RecompileBinary bool

	// Use this if you explicitly need the app to be restarted before reloading the browser.
	// Example: You might need this if you memory cache template files on first hit, in which
	// case you would want to restart the app to clear the cache.
	RestartApp bool

	// This may come into play if you have a .go file that is totally independent from you
	// app, such as a wasm file that you are building with a separate build process and serving
	// from your app. If you set this to true, processing on any captured .go file will be as
	// though it were an arbitrary non-Go file extension. Only relevant for Go files -- for
	// non-Go files, this is a no-op.
	TreatAsNonGo bool

	// If set to true, everything will behave the same, except that instead of doing a hard reload
	// of the browser window via `window.location.reload()`, Kiruna will instead run a method called
	// `__kirunaRevalidate` (if it exists on the window object). This can be useful, for example,
	// if you are running an external build process with enough intelligence to know how to inject
	// newly built route-level CSS without hard-reloading the page. For example, your framework might
	// provide you with a client-side revalidate function, in which case you'd set
	// `window.__kirunaRevalidate` to that function, and set this field to true.
	RunClientDefinedRevalidateFunc bool
}

type OnChangeFunc func() error

type OnChange struct {
	Strategy         string
	Func             OnChangeFunc
	ExcludedPatterns []string // Glob patterns (set relative to Config.RootDir)
}

type WatchedFiles []WatchedFile

type IgnorePatterns struct {
	Dirs  []string // Glob patterns
	Files []string // Glob patterns
}

func (c *Config) validateConfig() {
	if c.DistDir == "" {
		panic("kiruna.Config.DistDir is required")
	}

	if !c.ServerOnly {
		if c.PrivateStaticDir == "" {
			panic("kiruna.Config.PrivateStaticDir is required")
		}
		if c.PublicStaticDir == "" {
			panic("kiruna.Config.PublicStaticDir is required")
		}

		var seenDirs = make(map[string]bool)
		for _, dir := range []string{c.PrivateStaticDir, c.PublicStaticDir, c.DistDir} {
			if seenDirs[dir] {
				panic(fmt.Sprintf(
					"duplicate dir (%s) in kiruna.Config. PrivateStaticDir, PublicStaticDir, and DistDir must all be unique.",
					dir,
				))
			}
			seenDirs[dir] = true
		}
	}
}

func enforceProperInstantiation(c *Config) {
	if c == nil || !c.initializedWithNew {
		panic("Kiruna instances must be initialized by passing a valid, non-nil Config struct ptr to the New function")
	}
}
