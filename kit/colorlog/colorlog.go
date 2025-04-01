package colorlog

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"os"
)

const (
	colorReset  = "\033[0m"
	colorGray   = "\033[37m" // Light gray
	colorWhite  = "\033[97m" // white
	colorYellow = "\033[33m" // Yellow
	colorRed    = "\033[31m" // Red
	colorCyan   = "\033[36m" // Cyan
	colorBlue   = "\033[34m" // Blue
)

type ColorLogHandler struct {
	label  string
	output io.Writer
}

func New(label string) *slog.Logger {
	handler := &ColorLogHandler{label: label, output: os.Stdout}
	return slog.New(handler)
}

func (h *ColorLogHandler) Enabled(_ context.Context, level slog.Level) bool {
	return true
}

func (h *ColorLogHandler) Handle(_ context.Context, r slog.Record) error {
	color := h.levelToColor(r.Level)

	// Format time in a similar way to log.Printf
	timeStr := r.Time.Format("2006/01/02 15:04:05")

	// Handle attrs
	attrs := make([][]any, 0)
	attrsStr := ""
	r.Attrs(func(a slog.Attr) bool {
		attrs = append(attrs, []any{a.Key, a.Value.Any()})
		return true
	})

	hasAttrs := len(attrs) > 0
	if hasAttrs {
		for i, v := range attrs {
			k := v[0].(string)
			v := v[1]
			attrsStr += fmt.Sprintf("%s %s %s %v %s", wrapInColor(colorGray, "["), wrapInColor(colorGray, k), wrapInColor(colorGray, "="), v, wrapInColor(colorGray, "]"))
			if i < len(attrs)-1 {
				attrsStr += " "
			}
		}
	}

	finalTime := wrapInColor(colorGray, timeStr)
	finalMessage := wrapInColor(color, h.levelToMessagePrefix(r.Level)+r.Message)

	// Format the message with attributes
	var msg string
	if !hasAttrs {
		msg = fmt.Sprintf("%s  (%s)  %s\n", finalTime, wrapInColor(colorBlue, h.label), finalMessage)
	} else {
		msg = fmt.Sprintf("%s  (%s)  %s  %s\n", finalTime, wrapInColor(colorBlue, h.label), finalMessage, attrsStr)
	}

	_, err := fmt.Fprint(h.output, msg)
	return err
}

func (h *ColorLogHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
	return h
}

func (h *ColorLogHandler) WithGroup(name string) slog.Handler {
	return h
}

func (h *ColorLogHandler) levelToColor(level slog.Level) string {
	switch {
	case level >= slog.LevelError:
		return colorRed
	case level >= slog.LevelWarn:
		return colorYellow
	case level >= slog.LevelInfo:
		return colorCyan
	case level >= slog.LevelDebug:
		return colorGray
	default:
		return colorGray
	}
}

func (h *ColorLogHandler) levelToMessagePrefix(level slog.Level) string {
	switch {
	case level >= slog.LevelError:
		return "ERROR  "
	case level >= slog.LevelWarn:
		return "WARNING  "
	case level >= slog.LevelInfo:
		return ""
	case level >= slog.LevelDebug:
		return "DEBUG  "
	default:
		return ""
	}
}

func wrapInColor(color string, v any) string {
	return fmt.Sprintf("%s%v%s", color, v, colorReset)
}
