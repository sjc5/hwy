// Package fsutil provides utility functions for working with the filesystem.
package fsutil

import (
	"encoding/gob"
	"fmt"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"runtime"
)

// EnsureDir creates a directory if it does not exist.
func EnsureDir(path string) error {
	return os.MkdirAll(path, os.ModePerm)
}

// GetCallerDir returns the directory of the calling function.
func GetCallerDir() string {
	_, file, _, _ := runtime.Caller(1)
	return filepath.Dir(file)
}

// CopyDir recursively copies a directory from src to dst.
func CopyDir(src, dst string) error {
	// Get properties of source dir
	info, err := os.Stat(src)
	if err != nil {
		return err
	}

	// Create the destination directory
	if err := os.MkdirAll(dst, info.Mode()); err != nil {
		return err
	}

	// Read the directory contents
	entries, err := os.ReadDir(src)
	if err != nil {
		return err
	}

	for _, entry := range entries {
		srcPath := filepath.Join(src, entry.Name())
		dstPath := filepath.Join(dst, entry.Name())

		fileInfo, err := entry.Info()
		if err != nil {
			return err
		}

		// If the entry is a directory, recurse
		if fileInfo.IsDir() {
			if err := CopyDir(srcPath, dstPath); err != nil {
				return err
			}
		} else {
			// If it's a file, copy it
			if err := CopyFile(srcPath, dstPath); err != nil {
				return err
			}
		}
	}
	return nil
}

// CopyFile copies a single file from src to dest
func CopyFile(src, dest string) error {
	sourceFile, err := os.Open(src)
	if err != nil {
		return err
	}
	defer sourceFile.Close()

	destFile, err := os.Create(dest)
	if err != nil {
		return err
	}
	defer destFile.Close()

	if _, err := io.Copy(destFile, sourceFile); err != nil {
		return err
	}
	return destFile.Sync()
}

// FromGobInto decodes a gob-encoded file into a destination.
// The destination must be a pointer to the destination type.
func FromGobInto(file fs.File, destPtr any) error {
	if file == nil {
		return fmt.Errorf("fsutil.FromGobInto: cannot decode nil file")
	}
	if destPtr == nil {
		return fmt.Errorf("fsutil.FromGobInto: cannot decode into nil destination")
	}
	dec := gob.NewDecoder(file)
	err := dec.Decode(destPtr)
	if err != nil {
		return fmt.Errorf("fsutil.FromGobInto: failed to decode file into dest: %w", err)
	}
	return nil
}
