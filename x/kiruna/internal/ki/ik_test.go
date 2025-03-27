package ki

import (
	"io/fs"
	"os"
	"path/filepath"
	"testing"

	"github.com/sjc5/river/x/kit/colorlog"
	"github.com/sjc5/river/x/kit/safecache"
	"golang.org/x/sync/semaphore"
)

const testRootDir = "testdata"

// testEnv holds our testing environment
type testEnv struct {
	config *Config
}

// setupTestEnv creates a new test environment
func setupTestEnv(t *testing.T) *testEnv {
	t.Helper()

	privateStaticSrcDirName := "private-static"
	publicStaticSrcDirName := "public-static"

	// Set up the source directory structure
	sourceDirs := []string{privateStaticSrcDirName, publicStaticSrcDirName}

	// Set up the dist directory structure
	distDirs := []string{
		"dist/kiruna/static/public",
		"dist/kiruna/static/private",
		"dist/kiruna/internal",
	}

	for _, dir := range append(sourceDirs, distDirs...) {
		if err := os.MkdirAll(filepath.Join(testRootDir, dir), 0755); err != nil {
			t.Fatalf("Failed to create directory structure: %v", err)
		}
	}

	c := &Config{
		PrivateStaticDir: filepath.Join(testRootDir, privateStaticSrcDirName),
		PublicStaticDir:  filepath.Join(testRootDir, publicStaticSrcDirName),
		NormalCSSEntry:   filepath.Join(testRootDir, "main.css"),
		CriticalCSSEntry: filepath.Join(testRootDir, "critical.css"),
		DistDir:          filepath.Join(testRootDir, "dist"),
		MainAppEntry:     "cmd/app/main.go",
		Logger:           colorlog.New("test"),
	}

	c.Private_CommonInitOnce_OnlyCallInNewFunc()

	// Initialize the fileSemaphore
	c.fileSemaphore = semaphore.NewWeighted(100)

	// Set up embedded FS
	c.DistFS = os.DirFS(filepath.Join(testRootDir, "dist"))

	// Initialize safecache
	c.runtimeCache = runtimeCache{
		baseFS:                safecache.New(c.getInitialBaseFS, nil),
		baseDirFS:             safecache.New(c.getInitialBaseDirFS, nil),
		publicFS:              safecache.New(func() (fs.FS, error) { return c.getSubFSPublic() }, nil),
		privateFS:             safecache.New(func() (fs.FS, error) { return c.getSubFSPrivate() }, nil),
		styleSheetLinkElement: safecache.New(c.getInitialStyleSheetLinkElement, GetIsDev),
		styleSheetURL:         safecache.New(c.getInitialStyleSheetURL, GetIsDev),
		criticalCSS:           safecache.New(c.getInitialCriticalCSSStatus, GetIsDev),
		publicFileMapFromGob:  safecache.New(c.getInitialPublicFileMapFromGobRuntime, nil),
		publicFileMapURL:      safecache.New(c.getInitialPublicFileMapURL, GetIsDev),
		publicURLs:            safecache.NewMap(c.getInitialPublicURL, publicURLsKeyMaker, nil),
	}

	// Initialize dev cache if needed
	c.dev.matchResults = safecache.NewMap(c.getInitialMatchResults, c.matchResultsKeyMaker, nil)

	// Set to production mode for testing
	os.Setenv(modeKey, "production")

	return &testEnv{config: c}
}

// teardownTestEnv cleans up the test environment
func teardownTestEnv(t *testing.T) {
	t.Helper()

	if err := os.RemoveAll(testRootDir); err != nil {
		t.Errorf("Failed to remove test directory: %v", err)
	}

	// Reset environment variables
	os.Unsetenv(modeKey)
}

// createTestFile creates a file with given content in the test environment
func (env *testEnv) createTestFile(t *testing.T, relativePath, content string) {
	t.Helper()

	fullPath := filepath.Join(testRootDir, relativePath)
	dir := filepath.Dir(fullPath)

	if err := os.MkdirAll(dir, 0755); err != nil {
		t.Fatalf("Failed to create directory %s: %v", dir, err)
	}

	if err := os.WriteFile(fullPath, []byte(content), 0644); err != nil {
		t.Fatalf("Failed to write file %s: %v", fullPath, err)
	}
}

// resetEnv resets environment variables to a known state
func resetEnv() {
	os.Unsetenv(modeKey)
	os.Unsetenv(portKey)
	os.Unsetenv(portHasBeenSetKey)
	os.Unsetenv(refreshServerPortKey)
	os.Unsetenv(isBuildTimeKey)
}

func TestMain(m *testing.M) {
	code := m.Run()
	os.RemoveAll(testRootDir)
	os.Exit(code)
}
