package router

import (
	"bytes"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"html/template"
	"net/http"
	"strings"

	"github.com/sjc5/kit/pkg/timer"
	"golang.org/x/sync/errgroup"
)

func (h *Hwy) GetRootHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		outerT := timer.Conditional(getIsDebug())
		defer outerT.Checkpoint("GetRootHandler")

		mainT := timer.Conditional(getIsDebug())
		routeData, didRedirect, routeType, err := h.GetRouteData(w, r)
		if didRedirect {
			return
		}
		if err != nil {
			msg := "Error getting route data"
			Log.Errorf(msg+": %v\n", err)
			http.Error(w, msg, http.StatusInternalServerError)
			return
		}
		mainT.Checkpoint("GetRouteData")

		if GetIsJSONRequest(r) || routeType != RouteTypesEnum.Loader {
			bytes, err := json.Marshal(routeData)
			if err != nil {
				msg := "Error marshalling JSON"
				Log.Errorf(msg+": %v\n", err)
				http.Error(w, msg, http.StatusInternalServerError)
				return
			}
			mainT.Checkpoint("JSON marshalling")

			etag := fmt.Sprintf("%x", sha256.Sum256(bytes))
			mainT.Checkpoint("ETAG")

			w.Header().Set("ETag", etag)
			if isNotModified(r, etag) {
				w.WriteHeader(http.StatusNotModified)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			w.Write(bytes)
			return
		}

		var eg errgroup.Group
		var ssrInnerHTML *template.HTML
		var headElements *template.HTML

		mainT.Reset()

		eg.Go(func() error {
			egInnerT := timer.Conditional(getIsDebug())
			if h.rootTemplate == nil {
				tmpl, err := template.ParseFS(h.FS, h.RootTemplateLocation)
				if err != nil {
					return fmt.Errorf("error parsing root template: %v", err)
				}
				h.rootTemplate = tmpl
			}
			egInnerT.Checkpoint("template.ParseFS")
			return nil
		})

		eg.Go(func() error {
			egInnerT := timer.Conditional(getIsDebug())
			he, err := GetHeadElements(routeData)
			if err != nil {
				return fmt.Errorf("error getting head elements: %v", err)
			}
			headElements = he
			egInnerT.Checkpoint("GetHeadElements")
			return nil
		})

		eg.Go(func() error {
			egInnerT := timer.Conditional(getIsDebug())
			sih, err := GetSSRInnerHTML(routeData, true)
			if err != nil {
				return fmt.Errorf("error getting SSR inner HTML: %v", err)
			}
			ssrInnerHTML = sih
			egInnerT.Checkpoint("GetSSRInnerHTML")
			return nil
		})

		if err := eg.Wait(); err != nil {
			msg := "Error getting route data"
			Log.Errorf(msg+": %v\n", err)
			http.Error(w, msg, http.StatusInternalServerError)
			return
		}

		mainT.Checkpoint("errGroup")

		tmplData := map[string]any{}
		for key, value := range h.RootTemplateData {
			tmplData[key] = value
		}
		tmplData["HeadElements"] = headElements
		tmplData["SSRInnerHTML"] = ssrInnerHTML

		var buf bytes.Buffer

		err = h.rootTemplate.Execute(&buf, tmplData)
		if err != nil {
			msg := "Error executing template"
			Log.Errorf(msg+": %v\n", err)
			http.Error(w, msg, http.StatusInternalServerError)
		}
		mainT.Checkpoint("Template execution")

		etag := fmt.Sprintf("%x", sha256.Sum256(buf.Bytes()))
		mainT.Checkpoint("ETAG")

		w.Header().Set("ETag", etag)
		if isNotModified(r, etag) {
			w.WriteHeader(http.StatusNotModified)
			return
		}
		w.Header().Set("Content-Type", "text/html")
		w.Write(buf.Bytes())
	})
}

func GetIsJSONRequest(r *http.Request) bool {
	queryKey := HwyPrefix + "json"
	return len(r.URL.Query().Get(queryKey)) > 0
}

func isNotModified(r *http.Request, etag string) bool {
	match := r.Header.Get("If-None-Match")
	return match != "" && (match == etag || strings.Contains(match, etag))
}
