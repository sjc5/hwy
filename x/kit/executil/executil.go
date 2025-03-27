package executil

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
)

func MakeCmdRunner(commands ...string) func() error {
	return func() error {
		cmd := exec.Command(commands[0], commands[1:]...)
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr
		return cmd.Run()
	}
}

func GetExecutableDir() (string, error) {
	execPath, err := os.Executable()
	if err != nil {
		return "", fmt.Errorf("error getting executable path: %w", err)
	}
	return filepath.Dir(execPath), nil
}

func RunCmd(commands ...string) error {
	return MakeCmdRunner(commands...)()
}
