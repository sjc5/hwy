package ki

import (
	"log"

	"github.com/sjc5/river/x/kit/port"
)

const (
	defaultFreePort = 10_000
)

func MustGetPort() int {
	isDev := GetIsDev()
	portHasBeenSet := getPortHasBeenSet()
	defaultPort := getPort()

	if !isDev || portHasBeenSet {
		return defaultPort
	}

	port, err := port.GetFreePort(defaultPort)
	if err != nil {
		log.Panicf("error: failed to get free port: %v", err)
	}

	setPort(port)
	setPortHasBeenSet()

	return port
}
