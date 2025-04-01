package ki

import (
	"fmt"
	"os"
)

func (c *Config) SetupDistDir() error {
	// make a dist/kiruna/internal directory
	path := c._dist.S().Kiruna.S().Internal.FullPath()
	if err := os.MkdirAll(path, 0755); err != nil {
		return fmt.Errorf("error making internal directory: %v", err)
	}

	// add an empty file so that go:embed doesn't complain
	path = c._dist.S().Kiruna.S().X.FullPath()
	if err := os.WriteFile(path, []byte(""), 0644); err != nil {
		return fmt.Errorf("error making x file: %v", err)
	}

	// need an empty dist/kiruna/static/public/kiruna_internal__ directory
	path = c._dist.S().Kiruna.S().Static.S().Public.S().PublicInternal.FullPath()
	if err := os.MkdirAll(path, 0755); err != nil {
		return fmt.Errorf("error making public directory: %v", err)
	}

	// need an empty dist/kiruna/static/private directory
	path = c._dist.S().Kiruna.S().Static.S().Private.FullPath()
	if err := os.MkdirAll(path, 0755); err != nil {
		return fmt.Errorf("error making private directory: %v", err)
	}

	return nil
}
