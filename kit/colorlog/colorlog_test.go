package colorlog

import (
	"bytes"
	"context"
	"errors"
	"io"
	"log/slog"
	"strings"
	"testing"
	"time"
)

func TestColorLogHandler_Levels(t *testing.T) {
	var buf bytes.Buffer
	logger := New("TEST")
	logger.Handler().(*ColorLogHandler).output = &buf

	tests := []struct {
		name    string
		logFunc func(string, ...any)
		message string
		color   string
	}{
		{"Debug", logger.Debug, "debug message", colorGray},
		{"Info", logger.Info, "info message", colorCyan},
		{"Warn", logger.Warn, "warning message", colorYellow},
		{"Error", logger.Error, "error message", colorRed},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			buf.Reset()
			tt.logFunc(tt.message)
			got := buf.String()

			// Check color codes
			if !strings.Contains(got, tt.color) {
				t.Errorf("expected output to contain color %q, got %q", tt.color, got)
			}

			// Check message content
			if !strings.Contains(got, tt.message) {
				t.Errorf("expected output to contain message %q, got %q", tt.message, got)
			}

			// Check label
			if !strings.Contains(got, "TEST") {
				t.Errorf("expected output to contain label TEST, got %q", got)
			}

			// Check color reset
			if !strings.Contains(got, colorReset) {
				t.Errorf("expected output to contain reset color code, got %q", got)
			}
		})
	}
}

func TestColorLogHandler_WithAttributes(t *testing.T) {
	var buf bytes.Buffer
	logger := New("TEST")
	logger.Handler().(*ColorLogHandler).output = &buf

	logger.Info("test message", "key1", "value1", "key2", 42)
	got := buf.String()

	// Check for key elements in the attribute formatting
	expectations := []string{
		colorGray + "[" + colorReset + " " + colorGray + "key1" + colorReset + " " + colorGray + "=" + colorReset + " value1 " + colorGray + "]" + colorReset,
		colorGray + "[" + colorReset + " " + colorGray + "key2" + colorReset + " " + colorGray + "=" + colorReset + " 42 " + colorGray + "]" + colorReset,
	}

	for _, exp := range expectations {
		if !strings.Contains(got, exp) {
			t.Errorf("expected output to contain %q, got %q", exp, got)
		}
	}
}

func TestColorLogHandler_TimeFormat(t *testing.T) {
	var buf bytes.Buffer
	logger := New("TEST")
	logger.Handler().(*ColorLogHandler).output = &buf

	logger.Info("test message")
	got := buf.String()

	// Check time format (2006/01/02 15:04:05)
	timeStr := time.Now().Format("2006/01/02")
	if !strings.Contains(got, timeStr) {
		t.Errorf("expected output to contain time format %q, got %q", timeStr, got)
	}
}

func TestColorLogHandler_Interface(t *testing.T) {
	handler := &ColorLogHandler{}

	// Test Enabled method
	if !handler.Enabled(context.Background(), slog.LevelInfo) {
		t.Error("Enabled should return true")
	}

	// Test WithAttrs method
	newHandler := handler.WithAttrs([]slog.Attr{slog.String("key", "value")})
	if newHandler != handler {
		t.Error("WithAttrs should return the same handler")
	}

	// Test WithGroup method
	newHandler = handler.WithGroup("group")
	if newHandler != handler {
		t.Error("WithGroup should return the same handler")
	}
}

func TestNew(t *testing.T) {
	logger := New("TEST")
	if logger == nil {
		t.Error("New should not return nil")
	}

	handler, ok := logger.Handler().(*ColorLogHandler)
	if !ok {
		t.Error("logger.Handler should be of type *ColorLogHandler")
	}

	if handler.label != "TEST" {
		t.Errorf("handler label should be TEST, got %q", handler.label)
	}
}

type errorWriter struct {
	io.Writer
}

func (ew errorWriter) Write(p []byte) (n int, err error) {
	return 0, errors.New("write error")
}

func TestColorLogHandler_ErrorOutput(t *testing.T) {
	handler := &ColorLogHandler{
		label:  "TEST",
		output: errorWriter{},
	}

	err := handler.Handle(context.Background(), slog.Record{
		Time:    time.Now(),
		Message: "test",
		Level:   slog.LevelInfo,
	})

	if err == nil || err.Error() != "write error" {
		t.Errorf("expected write error, got %v", err)
	}
}

func TestColorLogHandler_ComplexAttributes(t *testing.T) {
	var buf bytes.Buffer
	logger := New("TEST")
	logger.Handler().(*ColorLogHandler).output = &buf

	logger.Info("complex attributes",
		"string", "value",
		"int", 42,
		"float", 3.14,
		"bool", true,
		"array", []string{"a", "b"},
		"map", map[string]int{"k": 1},
	)

	got := buf.String()
	expectations := []string{
		"value",
		"42",
		"3.14",
		"true",
		"[a b]",
		"map[k:1]",
	}

	for _, exp := range expectations {
		if !strings.Contains(got, exp) {
			t.Errorf("expected output to contain %q, got %q", exp, got)
		}
	}
}

func TestColorLogHandler_Output(t *testing.T) {
	var buf bytes.Buffer
	logger := New("TEST")
	logger.Handler().(*ColorLogHandler).output = &buf

	tests := []struct {
		name    string
		logFunc func(string, ...any)
		msg     string
		args    []any
		prefix  string
		suffix  string
	}{
		{
			name:    "info no attrs",
			logFunc: logger.Info,
			msg:     "test message",
			prefix:  colorGray,
			suffix:  colorReset + "  TEST  " + colorCyan + "test message" + colorReset + "\n",
		},
		{
			name:    "info with attrs",
			logFunc: logger.Info,
			msg:     "test message",
			args:    []any{"key1", "val1", "key2", 42},
			prefix:  colorGray,
			suffix: colorReset + "  TEST  " + colorCyan + "test message" + colorReset + "  " +
				colorGray + "[" + colorReset + " " + colorGray + "key1" + colorReset + " " + colorGray + "=" + colorReset + " val1 " + colorGray + "]" + colorReset + " " +
				colorGray + "[" + colorReset + " " + colorGray + "key2" + colorReset + " " + colorGray + "=" + colorReset + " 42 " + colorGray + "]" + colorReset + "\n",
		},
		{
			name:    "debug no attrs",
			logFunc: logger.Debug,
			msg:     "debug message",
			prefix:  colorGray,
			suffix:  colorReset + "  TEST  " + colorGray + "DEBUG  debug message" + colorReset + "\n",
		},
		{
			name:    "warn no attrs",
			logFunc: logger.Warn,
			msg:     "warn message",
			prefix:  colorGray,
			suffix:  colorReset + "  TEST  " + colorYellow + "WARNING  warn message" + colorReset + "\n",
		},
		{
			name:    "error no attrs",
			logFunc: logger.Error,
			msg:     "error message",
			prefix:  colorGray,
			suffix:  colorReset + "  TEST  " + colorRed + "ERROR  error message" + colorReset + "\n",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			buf.Reset()
			if tt.args != nil {
				tt.logFunc(tt.msg, tt.args...)
			} else {
				tt.logFunc(tt.msg)
			}
			got := buf.String()

			ts := got[len(colorGray) : len(colorGray)+19] // Account for the colorGray prefix
			expectedFormat := "2006/01/02 15:04:05"
			if len(ts) != len(expectedFormat) {
				t.Errorf("timestamp wrong format\ngot:  %q\nwant format: %q", ts, expectedFormat)
			}

			expected := tt.prefix + ts + tt.suffix
			if got != expected {
				t.Errorf("\ngot:  %q\nwant: %q", got, expected)
			}
		})
	}
}
