package ki

import (
	"fmt"
	"os"
	"os/exec"
	"time"
)

func (c *Config) compileBinary() error {
	buildDest := c.__dist.S().Bin.S().Main.FullPath()
	buildCmd := exec.Command("go", "build", "-o", buildDest, c.MainAppEntry)
	buildCmd.Stdout = os.Stdout
	buildCmd.Stderr = os.Stderr
	a := time.Now()
	err := buildCmd.Run()
	if err != nil {
		return fmt.Errorf("error compiling binary: %v", err)
	}
	c.Logger.Info("Compiled Go binary", "duration", time.Since(a), "buildDest", buildDest)
	return nil
}
