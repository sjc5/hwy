package ki

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"github.com/fsnotify/fsnotify"
)

// Add this function to handle reloading the dev setup
func (c *Config) reloadDevSetup(pathToConfigJSON string) {
	c.Logger.Info("Config file changed, reloading dev setup")

	// Clean up the existing watcher
	if c.watcher != nil {
		c.watcher.Close()
		fmt.Println("Closed existing watcher", c.watcher)
		c.watcher = nil
	}

	// Kill the running app
	c.mustKillAppDev()

	// Read the updated config
	file, err := os.ReadFile(pathToConfigJSON)
	if err != nil {
		errMsg := fmt.Sprintf("error: failed to read updated dev config file: %v", err)
		c.Logger.Error(errMsg)
		return
	}

	c._prior_dev_config_bytes = file

	devConfig := &DevConfig{}
	if err = json.Unmarshal(file, devConfig); err != nil {
		errMsg := fmt.Sprintf("error: failed to unmarshal updated dev config: %v", err)
		c.Logger.Error(errMsg)
		return
	}

	c._current_parsed_dev_config = devConfig
	c.cleanWatchRoot = filepath.Clean(c._current_parsed_dev_config.WatchRoot)

	if len(c._current_parsed_dev_config.HealthcheckEndpoint) == 0 {
		c.Logger.Warn(healthCheckWarning)
		c._current_parsed_dev_config.HealthcheckEndpoint = "/"
	}

	// Rebuild and setup the watcher
	err = c.Build(false, false)
	if err != nil {
		errMsg := fmt.Sprintf("error: failed to build app after config reload: %v", err)
		c.Logger.Error(errMsg)
		return
	}

	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		errMsg := fmt.Sprintf("error: failed to create watcher: %v", err)
		c.Logger.Error(errMsg)
		panic(errMsg)
	}
	c.watcher = watcher

	// Setup the watcher again
	c.mustSetupWatcher()

	fmt.Println("watcher setup successfully", c.watcher)

	c.Logger.Info("Dev setup successfully reloaded")

	// Start the app again if not in server-only mode
	if !c.ServerOnly {
		c.mustStartAppDev()
	}

}
