package middleware

import (
	"time"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/httprate"
	"github.com/sjc5/kit/pkg/middleware/secureheaders"
)

const OneMegabyteSize = 1048576

func ApplyGlobal(r *chi.Mux) {
	r.Use(
		// Some basic middleware appropriate to apply early
		chimiddleware.RequestID,
		chimiddleware.Logger,
		chimiddleware.Recoverer,
		chimiddleware.RequestSize(OneMegabyteSize),

		// Security middleware
		httprate.LimitByRealIP(120, 1*time.Minute),
		secureheaders.Middleware,

		// Some more basic middleware appropriate to apply later
		chimiddleware.Compress(5),
		chimiddleware.Heartbeat("/healthz"),
	)
}
