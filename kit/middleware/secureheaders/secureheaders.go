package secureheaders

import "net/http"

var securityHeadersMap = map[string]string{
	"Cross-Origin-Opener-Policy":        "same-origin",
	"Cross-Origin-Resource-Policy":      "same-origin",
	"Origin-Agent-Cluster":              "?1",
	"Referrer-Policy":                   "no-referrer",
	"Strict-Transport-Security":         "max-age=15552000; includeSubDomains",
	"X-Content-Type-Options":            "nosniff",
	"X-DNS-Prefetch-Control":            "off",
	"X-Download-Options":                "noopen",
	"X-Frame-Options":                   "SAMEORIGIN",
	"X-Permitted-Cross-Domain-Policies": "none",
	"X-XSS-Protection":                  "0",
}

// Sets various security-related headers to responses.
func Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Note: These are all set to the defaults used by helmetjs, with
		// the exception of Content-Security-Policy, which is not set here,
		// as it makes more sense to leave that to the application to set.
		// HonoJS takes a similar approach.
		// See https://github.com/helmetjs/helmet?tab=readme-ov-file#reference
		// See also https://github.com/honojs/hono/blob/main/src/middleware/secure-headers/index.ts
		for header, value := range securityHeadersMap {
			w.Header().Set(header, value)
		}
		w.Header().Del("X-Powered-By")
		next.ServeHTTP(w, r)
	})
}
