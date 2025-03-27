package walkutil

import (
	"io/fs"
	"path/filepath"
	"sync"
)

const defaultMaxConcurrency = 10

type WalkDirParallelOptions struct {
	RootDir string
	// If set to 0 or negative, it will default to 10
	MaxConcurrency int
	// Return true to skip the directory, false to process it
	SkipDirFunc func(path string, d fs.DirEntry) bool

	// ErrorHandler allows custom handling of errors during processing
	// If nil, errors will be collected and returned
	ErrorHandler func(path string, err error)

	// FileProcessor is the function to process each file
	FileProcessor func(path string) error
}

// WalkDirParallel walks a directory tree in parallel, processing files concurrently
// but directories sequentially to ensure proper traversal.
func WalkDirParallel(opts *WalkDirParallelOptions) []error {
	if opts == nil {
		panic("opts must not be nil")
	}

	if opts.RootDir == "" {
		panic("Root must not be empty")
	}

	if opts.FileProcessor == nil {
		panic("FileProcessor must not be nil")
	}

	var wg sync.WaitGroup
	var errorsMutex sync.Mutex
	var errors []error

	// Apply defaults for unset options
	if opts.MaxConcurrency <= 0 {
		opts.MaxConcurrency = defaultMaxConcurrency
	}

	// Create semaphore channel to limit concurrency
	semaphore := make(chan struct{}, opts.MaxConcurrency)

	// Walk the directory
	walkErr := filepath.WalkDir(opts.RootDir, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			if opts.ErrorHandler != nil {
				opts.ErrorHandler(path, err)
			} else {
				errorsMutex.Lock()
				errors = append(errors, err)
				errorsMutex.Unlock()
			}
			return nil // Continue walking despite errors
		}

		// Skip directories based on the SkipDirFunc
		if d.IsDir() {
			if opts.SkipDirFunc != nil && opts.SkipDirFunc(path, d) {
				return filepath.SkipDir
			}
			return nil
		}

		// For each file, launch a goroutine
		wg.Add(1)
		go func() {
			defer wg.Done()

			// Acquire semaphore slot
			semaphore <- struct{}{}
			defer func() { <-semaphore }() // Release when done

			// Process the file
			if err := opts.FileProcessor(path); err != nil {
				if opts.ErrorHandler != nil {
					opts.ErrorHandler(path, err)
				} else {
					errorsMutex.Lock()
					errors = append(errors, err)
					errorsMutex.Unlock()
				}
			}
		}()

		return nil
	})

	// Wait for all file processing to complete
	wg.Wait()

	// Add the walk error if it occurred
	if walkErr != nil {
		if opts.ErrorHandler != nil {
			opts.ErrorHandler(opts.RootDir, walkErr)
		} else {
			errors = append(errors, walkErr)
		}
	}

	return errors
}
