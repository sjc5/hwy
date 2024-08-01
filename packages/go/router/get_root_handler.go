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
		a := newMeasurement("GetRootHandler")
		defer a.stop()

		b := newMeasurement("GetRouteData")
		routeData, err, didRedirect := h.GetRouteData(w, r)
		if didRedirect {
			return
		}
		if err != nil {
			msg := "Error getting route data"
			Log.Errorf(msg+": %v\n", err)
			http.Error(w, msg, http.StatusInternalServerError)
			return
		}
		b.stop()

		if GetIsJSONRequest(r) {
			c := newMeasurement("JSON marshalling")
			bytes, err := json.Marshal(routeData)
			if err != nil {
				msg := "Error marshalling JSON"
				Log.Errorf(msg+": %v\n", err)
				http.Error(w, msg, http.StatusInternalServerError)
				return
			}
			c.stop()

			d := newMeasurement("ETAG")
			etag := fmt.Sprintf("%x", sha256.Sum256(bytes))
			d.stop()

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

		errGroupMeasure := newMeasurement("errgroup")

		eg.Go(func() error {
			f := newMeasurement("template.ParseFS")
			if h.rootTemplate == nil {
				tmpl, err := template.ParseFS(h.FS, h.RootTemplateLocation)
				if err != nil {
					return fmt.Errorf("error parsing root template: %v", err)
				}
				h.rootTemplate = tmpl
			}
			f.stop()
			return nil
		})

		eg.Go(func() error {
			g := newMeasurement("GetHeadElements")
			he, err := GetHeadElements(routeData)
			if err != nil {
				return fmt.Errorf("error getting head elements: %v", err)
			}
			headElements = he
			g.stop()
			return nil
		})

		eg.Go(func() error {
			h := newMeasurement("GetSSRInnerHTML")
			sih, err := GetSSRInnerHTML(routeData, true)
			if err != nil {
				return fmt.Errorf("error getting SSR inner HTML: %v", err)
			}
			ssrInnerHTML = sih
			h.stop()
			return nil
		})

		if err := eg.Wait(); err != nil {
			msg := "Error getting route data"
			Log.Errorf(msg+": %v\n", err)
			http.Error(w, msg, http.StatusInternalServerError)
			return
		}

		errGroupMeasure.stop()

		tmplData := map[string]any{}
		for key, value := range h.RootTemplateData {
			tmplData[key] = value
		}
		tmplData["HeadElements"] = headElements
		tmplData["SSRInnerHTML"] = ssrInnerHTML

		var buf bytes.Buffer

		i := newMeasurement("Template execution")
		err = h.rootTemplate.Execute(&buf, tmplData)
		if err != nil {
			msg := "Error executing template"
			Log.Errorf(msg+": %v\n", err)
			http.Error(w, msg, http.StatusInternalServerError)
		}
		i.stop()

		f := newMeasurement("ETAG")
		etag := fmt.Sprintf("%x", sha256.Sum256(buf.Bytes()))
		f.stop()

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
