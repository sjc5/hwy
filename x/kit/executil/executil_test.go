package executil

import (
	"os"
	"testing"
)

func TestMakeCmdRunner(t *testing.T) {
	// Test running a simple command (e.g., echo)
	runner := MakeCmdRunner("echo", "hello, world")
	if err := runner(); err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	// Test running a command that fails
	runner = MakeCmdRunner("false") // "false" is a command that always exits with status 1
	if err := runner(); err == nil {
		t.Fatalf("expected error, got nil")
	}
}

func TestGetExecutableDir(t *testing.T) {
	// Get the current executable's directory
	execDir, err := GetExecutableDir()
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	// Verify the returned directory is not empty
	if execDir == "" {
		t.Fatalf("expected non-empty executable directory")
	}

	// Verify that the returned path is a directory
	info, err := os.Stat(execDir)
	if err != nil {
		t.Fatalf("failed to stat the directory: %v", err)
	}
	if !info.IsDir() {
		t.Fatalf("expected a directory, got a non-directory")
	}
}

func TestEdgeCases(t *testing.T) {
	// Test MakeCmdRunner with a non-existent command
	runner := MakeCmdRunner("non_existent_command")
	if err := runner(); err == nil {
		t.Fatalf("expected error for non-existent command, got nil")
	}
}
