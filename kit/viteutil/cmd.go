package viteutil

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/sjc5/river/kit/colorlog"
	"github.com/sjc5/river/kit/grace"
)

var Log = colorlog.New("[viteutil]", 9)

type BuildCtx struct {
	mu   *sync.Mutex
	cmd  *exec.Cmd
	opts *BuildCtxOptions
	port int
}

type BuildCtxOptions struct {
	// required -- e.g., "npx", "pnpm", "yarn", "bunx", etc.
	JSPackageManagerBaseCmd string
	// optional -- used for monorepos that need to run commands from ancestor directories
	JSPackageManagerCmdDir string
	// required -- dir, relative to where you're running build commands from, where the Vite manifest will be written
	ManifestOutDir string
	// optional -- default is 5173
	DefaultPort int
}

func NewBuildCtx(opts *BuildCtxOptions) *BuildCtx {
	port := opts.DefaultPort
	if port == 0 {
		port = 5173
	}
	return &BuildCtx{
		mu:   &sync.Mutex{},
		opts: opts,
	}
}

func (c *BuildCtx) Build(isDev bool) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	splitCommand := strings.Fields(c.opts.JSPackageManagerBaseCmd)

	c.cmd = exec.Command(splitCommand[0], splitCommand[1:]...)
	c.cmd.Stdout, c.cmd.Stderr = os.Stdout, os.Stderr

	if c.opts.JSPackageManagerCmdDir != "" {
		c.cmd.Dir = c.opts.JSPackageManagerCmdDir
	}

	if isDev {
		if c.cmd != nil && c.cmd.Process != nil {
			if err := grace.TerminateProcess(c.cmd.Process, 3*time.Second, nil); err != nil {
				Log.Warn(fmt.Sprintf("Error terminating vite process: %s", err))
				return err
			} else {
				Log.Info("Terminated vite process", "pid", c.cmd.Process.Pid)
			}
		}

		vitePort, err := InitPort(c.port)
		if err != nil {
			Log.Error(fmt.Sprintf("Error initializing vite port: %s", err))
			return err
		}

		c.cmd.Args = append(c.cmd.Args, "vite",
			"--port", fmt.Sprintf("%d", vitePort),
			"--clearScreen", "false",
			"--strictPort", "true",
		)

		Log.Info("Running vite (dev)",
			"command", fmt.Sprintf(`"%s"`, strings.Join(c.cmd.Args, " ")),
		)

		go func() {
			if err := c.cmd.Run(); err != nil {
				Log.Error(fmt.Sprintf("Error running vite (dev): %s", err))
			}
		}()

		return nil
	}

	c.cmd.Args = append(c.cmd.Args, "vite", "build",
		"--outDir", filepath.Join(".", c.opts.ManifestOutDir),
		"--assetsDir", filepath.Join("."),
		"--manifest",
	)

	Log.Info("Running vite build (prod)",
		"command", fmt.Sprintf(`"%s"`, strings.Join(c.cmd.Args, " ")),
	)

	if err := c.cmd.Run(); err != nil {
		Log.Error(fmt.Sprintf("Error running vite build (prod): %s", err))
		return err
	}

	return nil
}
