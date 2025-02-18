package router

import (
	"bytes"
	"encoding/json"
	"fmt"
	"html/template"
	"net/http"
	"strings"

	"github.com/sjc5/kit/pkg/cryptoutil"
	"github.com/sjc5/kit/pkg/viteutil"
	"golang.org/x/sync/errgroup"
)

func (h *Hwy) GetRootHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		outerT := newTimer()
		defer outerT.Checkpoint("GetRootHandler")

		mainT := newTimer()
		routeData, redirectStatus, routeType, err := h.GetRouteData(w, r)

		if routeType == RouteTypesEnum.NotFound {
			w.WriteHeader(http.StatusNotFound)
			w.Write([]byte("Not found"))
			return
		}
		if redirectStatus != nil && redirectStatus.didServerRedirect {
			return
		}
		if err != nil {
			msg := "Error getting route data"
			Log.Error(fmt.Sprintf(msg+": %v\n", err))
			http.Error(w, msg, http.StatusInternalServerError)
			return
		}
		mainT.Checkpoint("GetRouteData")

		if GetIsJSONRequest(r) || routeType != RouteTypesEnum.Loader {
			bytes, err := json.Marshal(routeData)
			if err != nil {
				msg := "Error marshalling JSON"
				Log.Error(fmt.Sprintf(msg+": %v\n", err))
				http.Error(w, msg, http.StatusInternalServerError)
				return
			}
			mainT.Checkpoint("JSON marshalling")

			etag := fmt.Sprintf("%x", cryptoutil.Sha256Hash(bytes))
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
		var ssrScript *template.HTML
		var ssrScriptSha256Hash string
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
			sih, err := h.GetSSRInnerHTML(routeData)
			if err != nil {
				return fmt.Errorf("error getting SSR inner HTML: %v", err)
			}
			ssrScript = sih.Script
			ssrScriptSha256Hash = sih.Sha256Hash
			egInnerT.Checkpoint("GetSSRInnerHTML")
			return nil
		})

		if err := eg.Wait(); err != nil {
			msg := "Error getting route data"
			Log.Error(fmt.Sprintf(msg+": %v\n", err))
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
			Log.Error(fmt.Sprintf(msg+": %v\n", err))
			http.Error(w, msg, http.StatusInternalServerError)
			return
		}

		for key, value := range rootTemplateData {
			tmplData[key] = value
		}
		tmplData["HeadElements"] = headElements
		tmplData["SSRScriptElement"] = ssrScript
		tmplData["SSRScriptElementSha256Hash"] = ssrScriptSha256Hash

		if !h._isDev {
			tmplData["BodyElements"] = template.HTML(
				fmt.Sprintf(`<script type="module" src="/public/%s"></script>`, h._clientEntryOut),
			)
		} else {
			opts := viteutil.ToDevScriptsOptions{ClientEntry: h._clientEntrySrc}
			if h.UIVariant == UIVariants.React {
				opts.Variant = viteutil.Variants.React
			} else {
				opts.Variant = viteutil.Variants.Other
			}

			devScripts, err := viteutil.ToDevScripts(opts)
			if err != nil {
				msg := "Error getting dev scripts"
				Log.Error(fmt.Sprintf(msg+": %v\n", err))
				http.Error(w, msg, http.StatusInternalServerError)
				return
			}

			tmplData["BodyElements"] = devScripts
		}

		var buf bytes.Buffer

		err = h._rootTemplate.Execute(&buf, tmplData)
		if err != nil {
			msg := "Error executing template"
			Log.Error(fmt.Sprintf(msg+": %v\n", err))
			http.Error(w, msg, http.StatusInternalServerError)
		}
		mainT.Checkpoint("Template execution")

		etag := fmt.Sprintf("%x", cryptoutil.Sha256Hash(buf.Bytes()))
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
	return len(r.URL.Query().Get(HwyJSONSearchParamKey)) > 0
}

func isNotModified(r *http.Request, etag string) bool {
	match := r.Header.Get("If-None-Match")
	return match != "" && (match == etag || strings.Contains(match, etag))
}
