package router

import (
	"bytes"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"html/template"
	"net/http"
	"strings"

	"golang.org/x/sync/errgroup"
)

func (h *Hwy) GetRootHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		outerT := newTimer()
		defer outerT.Checkpoint("GetRootHandler")

		mainT := newTimer()
		routeData, didRedirect, routeType, err := h.GetRouteData(w, r)

		if routeType == RouteTypesEnum.NotFound {
			w.WriteHeader(http.StatusNotFound)
			w.Write([]byte("Not found"))
			return
		}
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
			egInnerT := newTimer()
			he, err := GetHeadElements(routeData)
			if err != nil {
				return fmt.Errorf("error getting head elements: %v", err)
			}
			headElements = he
			egInnerT.Checkpoint("GetHeadElements")
			return nil
		})

		eg.Go(func() error {
			egInnerT := newTimer()
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

		var rootTemplateData map[string]any
		if h.GetRootTemplateData != nil {
			rootTemplateData, err = h.GetRootTemplateData(r)
		} else {
			rootTemplateData = map[string]any{}
		}
		if err != nil {
			msg := "Error getting root template data"
			Log.Errorf(msg+": %v\n", err)
			http.Error(w, msg, http.StatusInternalServerError)
			return
		}

		for key, value := range rootTemplateData {
			tmplData[key] = value
		}
		tmplData["HeadElements"] = headElements
		tmplData["SSRInnerHTML"] = ssrInnerHTML
		tmplData["ClientEntryURL"] = h.clientEntryURL

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
