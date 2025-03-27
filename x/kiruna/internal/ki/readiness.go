package ki

import (
	"fmt"
	"net/http"
	"time"
)

const (
	maxReadinessAttempts = 100
	baseReadinessDelay   = 20 * time.Millisecond
)

func (c *Config) waitForAppReadiness() bool {
	for attempts := 0; attempts < maxReadinessAttempts; attempts++ {
		url := fmt.Sprintf(
			"http://localhost:%d%s",
			MustGetPort(),
			c.devConfig.HealthcheckEndpoint,
		)

		resp, err := http.Get(url)
		if err == nil && resp.StatusCode == http.StatusOK {
			return true
		}

		delay := baseReadinessDelay + time.Duration(attempts)*baseReadinessDelay
		time.Sleep(delay)
	}
	return false
}
