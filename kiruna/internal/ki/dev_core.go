package ki

import (
	"fmt"
	"time"

	"github.com/fsnotify/fsnotify"
	"github.com/sjc5/river/kit/port"
)

func (c *Config) handler_user_config_update() {
	c.Logger.Info("Detected changes to user config, reloading...")
	c.MustStartDev(true)
}

func (c *Config) MustStartDev(_isRebuild ...bool) {
	is_rebuild := len(_isRebuild) > 0 && _isRebuild[0]

	if is_rebuild {
		c.send_rebuilding_signal()
		c.kill_running_go_binary()
	}

	c.MainInit(MainInitOptions{IsDev: true, IsRebuild: is_rebuild}, "MustStartDev")

	MustGetAppPort() // Warm port right away, in case default is unavailable. Also, env needs to be set in this scope.

	refresh_server_port, err := port.GetFreePort(default_refresh_server_port)
	if err != nil {
		c.panic("failed to get free port", err)
	}
	set_refresh_server_port(refresh_server_port)

	// build without binary
	err = c.Build(BuildOptions{
		IsDev:             true,
		RecompileGoBinary: false,
		is_dev_rebuild:    is_rebuild,
	})
	if err != nil {
		c.panic("failed to build app", err)
	}

	if !is_rebuild {
		vite_ctx, err := c.viteDevBuild()
		if err != nil {
			c.panic("failed to start vite dev server", err)
		}
		defer vite_ctx.Cleanup()
		go vite_ctx.Wait()
	}

	if err := c.compile_go_binary(); err != nil { // compile go binary because we didn't above
		c.panic("failed to compile go binary", err)
	}

	go c.run_go_binary()
	go c.setup_browser_refresh_mux()

	c.must_reload_broadcast(refreshFilePayload{ChangeType: changeTypeOther}, true)

	if is_rebuild {
		return
	}

	defer c.kill_running_go_binary()

	debouncer := new_debouncer(30*time.Millisecond, func(events []fsnotify.Event) {
		c.process_batched_events(events)
	})

	for {
		select {
		case evt := <-c.watcher.Events:
			debouncer.add_evt(evt)
		case err := <-c.watcher.Errors:
			c.Logger.Error(fmt.Sprintf("watcher error: %v", err))
		}
	}
}
