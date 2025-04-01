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

var Log = colorlog.New("viteutil")

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
	// optional
	ViteConfigFile string
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

type DevInfo struct {
	Port int
	PID  int
}

func (c *BuildCtx) prep_cmd() {
	split_cmd := strings.Fields(c.opts.JSPackageManagerBaseCmd)

	c.cmd = exec.Command(split_cmd[0], split_cmd[1:]...)
	c.cmd.Stdout, c.cmd.Stderr = os.Stdout, os.Stderr

	if c.opts.JSPackageManagerCmdDir != "" {
		c.cmd.Dir = c.opts.JSPackageManagerCmdDir
	}
}

func (c *BuildCtx) DevBuild() (*DevInfo, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.cmd != nil && c.cmd.Process != nil {
		if err := grace.TerminateProcess(c.cmd.Process, 3*time.Second, nil); err != nil {
			Log.Warn(fmt.Sprintf("Error terminating vite process: %s", err))
			return nil, err
		} else {
			Log.Info("Terminated vite process", "pid", c.cmd.Process.Pid)
		}
	}

	c.prep_cmd()

	vitePort, err := InitPort(c.port)
	if err != nil {
		Log.Error(fmt.Sprintf("Error initializing vite port: %s", err))
		return nil, err
	}

	c.cmd.Args = append(c.cmd.Args, "vite",
		"--port", fmt.Sprintf("%d", vitePort),
		"--clearScreen", "false",
		"--strictPort", "true",
	)

	if c.opts.ViteConfigFile != "" {
		c.cmd.Args = append(c.cmd.Args, "--config", c.opts.ViteConfigFile)
	}

	Log.Info("Running vite (dev)",
		"command", fmt.Sprintf(`"%s"`, strings.Join(c.cmd.Args, " ")),
	)

	if err := c.cmd.Start(); err != nil {
		Log.Error(fmt.Sprintf("Error running vite (dev): %s", err))
	}

	go func() {
		if err := c.cmd.Wait(); err != nil {
			Log.Error(fmt.Sprintf("Error running vite (dev): %s", err))
		}
	}()

	return &DevInfo{Port: vitePort, PID: c.cmd.Process.Pid}, nil
}

func (c *BuildCtx) ProdBuild() error {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.prep_cmd()

	c.cmd.Args = append(c.cmd.Args, "vite", "build",
		"--outDir", filepath.Join(".", c.opts.ManifestOutDir),
		"--assetsDir", filepath.Join("."),
		"--manifest",
	)

	if c.opts.ViteConfigFile != "" {
		c.cmd.Args = append(c.cmd.Args, "--config", c.opts.ViteConfigFile)
	}

	Log.Info("Running vite build (prod)",
		"command", fmt.Sprintf(`"%s"`, strings.Join(c.cmd.Args, " ")),
	)

	if err := c.cmd.Run(); err != nil {
		Log.Error(fmt.Sprintf("Error running vite build (prod): %s", err))
		return err
	}

	return nil
}
