package platform

import (
	"fmt"

	"github.com/joho/godotenv"
	"github.com/sjc5/kit/pkg/envutil"
)

type envType struct {
	Mode                   string
	IsDev                  bool
	Port                   int
	GracefulTimeoutSeconds int
}

var env *envType = nil

func GetEnv() *envType {
	if env != nil {
		return env
	}
	err := godotenv.Load()
	if err != nil {
		fmt.Printf("error loading .env file: %s\n", err)
	}
	env = &envType{}
	env.Mode = envutil.GetStr("MODE", "production")
	env.IsDev = env.Mode == "development"
	env.Port = envutil.GetInt("PORT", 8080)
	env.GracefulTimeoutSeconds = envutil.GetInt("GRACEFUL_TIMEOUT_SECONDS", 10)
	return env
}
