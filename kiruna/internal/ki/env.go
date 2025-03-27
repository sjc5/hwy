package ki

import (
	"fmt"
	"os"
	"strconv"

	"github.com/sjc5/river/kit/envutil"
)

const (
	modeKey              = "KIRUNA_MODE"
	devModeVal           = "development"
	portKey              = "PORT"
	portHasBeenSetKey    = "KIRUNA_PORT_HAS_BEEN_SET"
	refreshServerPortKey = "KIRUNA_REFRESH_SERVER_PORT"
	trueStr              = "true"
	isBuildTimeKey       = "KIRUNA_IS_BUILD_TIME"
	useVerboseLogsKey    = "KIRUNA_USE_VERBOSE_LOGS"
)

func GetIsDev() bool {
	return os.Getenv(modeKey) == devModeVal
}

func setPort(port int) {
	os.Setenv(portKey, fmt.Sprintf("%d", port))
}

func getPort() int {
	port, err := strconv.Atoi(os.Getenv(portKey))
	if err != nil {
		return 0
	}
	return port
}

func setPortHasBeenSet() {
	os.Setenv(portHasBeenSetKey, trueStr)
}

func getPortHasBeenSet() bool {
	return os.Getenv(portHasBeenSetKey) == trueStr
}

func getRefreshServerPort() int {
	port, err := strconv.Atoi(os.Getenv(refreshServerPortKey))
	if err != nil {
		return 0
	}
	return port
}

func SetModeToDev() {
	os.Setenv(modeKey, devModeVal)
}

func setRefreshServerPort(port int) {
	os.Setenv(refreshServerPortKey, fmt.Sprintf("%d", port))
}

func getUseVerboseLogs() bool {
	return envutil.GetBool(useVerboseLogsKey, false)
}
