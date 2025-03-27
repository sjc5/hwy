package mux

import (
	"github.com/sjc5/river/kit/genericsutil"
	"github.com/sjc5/river/kit/matcher"
	"github.com/sjc5/river/kit/response"
	"github.com/sjc5/river/kit/tasks"
)

type (
	None                      = genericsutil.None
	TaskHandler[I any, O any] = tasks.RegisteredTask[*ReqData[I], O]
	Params                    = matcher.Params
)

type ReqData[I any] struct {
	_params         Params
	_splat_vals     []string
	_tasks_ctx      *tasks.TasksCtx
	_input          I
	_response_proxy *response.Proxy
}
