package ki

import (
	"fmt"
	"os/exec"
	"path/filepath"
	"sync"

	"github.com/fsnotify/fsnotify"
	"github.com/sjc5/river/x/kit/safecache"
	"golang.org/x/sync/semaphore"
)

type withMu[T any] struct {
	v  T
	mu sync.Mutex
}

type dev struct {
	initOnce               sync.Once
	watcher                *fsnotify.Watcher
	manager                *clientManager
	fileSemaphore          *semaphore.Weighted
	ignoredDirPatterns     *[]string
	ignoredFilePatterns    *[]string
	naiveIgnoreDirPatterns *[]string
	defaultWatchedFile     *WatchedFile
	defaultWatchedFiles    *[]WatchedFile
	lastBuildCmd           withMu[*exec.Cmd]
	matchResults           *safecache.CacheMap[potentialMatch, string, bool]
}

func (c *Config) devInitOnce() {
	c.dev.initOnce.Do(func() {
		// watcher
		watcher, err := fsnotify.NewWatcher()
		if err != nil {
			errMsg := fmt.Sprintf("error: failed to create watcher: %v", err)
			c.Logger.Error(errMsg)
			panic(errMsg)
		}
		c.watcher = watcher

		// manager
		c.manager = newClientManager()

		// fileSemaphore
		c.fileSemaphore = semaphore.NewWeighted(100)

		// ignored setup
		c.ignoredDirPatterns = &[]string{}
		c.ignoredFilePatterns = &[]string{}
		c.naiveIgnoreDirPatterns = &[]string{
			"**/.git",
			"**/node_modules",
			c.__dist.S().Bin.FullPath(),
			c.__dist.S().Kiruna.FullPath(),
			filepath.Join(c.cleanSources.PublicStatic, noHashPublicDirsByVersion[0]),
			filepath.Join(c.cleanSources.PublicStatic, noHashPublicDirsByVersion[1]),
		}
		for _, p := range *c.naiveIgnoreDirPatterns {
			*c.ignoredDirPatterns = append(*c.ignoredDirPatterns, filepath.Join(c.cleanWatchRoot, p))
		}
		for _, p := range c.devConfig.IgnorePatterns.Dirs {
			*c.ignoredDirPatterns = append(*c.ignoredDirPatterns, filepath.Join(c.cleanWatchRoot, p))
		}
		for _, p := range c.devConfig.IgnorePatterns.Files {
			*c.ignoredFilePatterns = append(*c.ignoredFilePatterns, filepath.Join(c.cleanWatchRoot, p))
		}

		// default watched files
		c.defaultWatchedFile = &WatchedFile{}
		c.defaultWatchedFiles = &[]WatchedFile{
			{Pattern: filepath.Join(c.cleanSources.PrivateStatic, "**/*"), RestartApp: true},
			{Pattern: filepath.Join(c.cleanSources.PublicStatic, "**/*"), RestartApp: true},
		}

		// matches
		c.matchResults = safecache.NewMap(c.getInitialMatchResults, c.matchResultsKeyMaker, nil)
	})
}
