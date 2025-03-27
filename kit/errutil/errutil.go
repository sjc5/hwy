package errutil

import (
	"errors"
	"fmt"
)

type Args struct {
	OuterErr      error
	InnerErr      error
	ContextualMsg string
}

func New(in Args) error {
	// If wrapped and wrapper are the same, de-dupe
	if in.InnerErr == in.OuterErr {
		in.InnerErr = nil
	}

	if in.ContextualMsg == "" {
		if in.InnerErr == nil {
			return in.OuterErr
		}
		return fmt.Errorf("%w: %w", in.OuterErr, in.InnerErr)
	}

	if in.InnerErr == nil {
		return fmt.Errorf("%w: %s", in.OuterErr, in.ContextualMsg)
	}
	return fmt.Errorf("%w: %s: %w", in.OuterErr, in.ContextualMsg, in.InnerErr)
}

func Maybe(msg string, err error) error {
	if err == nil {
		return nil
	}
	return fmt.Errorf("%s: %w", msg, err)
}

func ToIsErrFunc(targetErr error) func(error) bool {
	return func(err error) bool { return errors.Is(err, targetErr) }
}
