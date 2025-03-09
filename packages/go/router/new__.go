package router

import (
	"net/http"

	"github.com/sjc5/kit/pkg/tasks"
)

// query (1 get-like task), mutation (1 1 post-like task), ui (potentially many parallel tasks), not found (short circuit)

var API_SEGMENT = "api" // __TODO Make this settable in Hwy config

var (
	QueryMethods    = map[string]struct{}{"GET": {}, "HEAD": {}}
	MutationMethods = map[string]struct{}{"POST": {}, "PUT": {}, "PATCH": {}, "DELETE": {}}
)

func isAPICall(realSegments []string) bool {
	return len(realSegments) > 0 && realSegments[0] == API_SEGMENT
}

func isQuery(r *http.Request, realSegments []string) bool {
	_, ok := QueryMethods[r.Method]
	return ok && isAPICall(realSegments)
}

func isMutation(r *http.Request, realSegments []string) bool {
	_, ok := MutationMethods[r.Method]
	return ok && isAPICall(realSegments)
}

type handlerWrapper struct {
	_type           string // "standard" | "task"
	standardHandler http.Handler
	taskHandler     tasks.AnyRegisteredTask
}

type middlewareWrapper struct {
	_type              string // "standard" | "task"
	standardMiddleware func(http.Handler) http.Handler
	taskMiddleware     tasks.AnyRegisteredTask
}
