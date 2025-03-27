package htmltestutil

import (
	"strings"

	"golang.org/x/net/html"
)

// ParseHTML parses an HTML string into a node.
func ParseHTML(input string) (*html.Node, error) {
	return html.Parse(strings.NewReader(input))
}

// CompareNodes checks if two nodes are structurally equivalent (ignoring attribute order).
func CompareNodes(n1, n2 *html.Node) bool {
	// Compare node types and tag names.
	if n1.Type != n2.Type || n1.Data != n2.Data {
		return false
	}

	// Compare attributes, ignoring order.
	if len(n1.Attr) != len(n2.Attr) {
		return false
	}
	attrMap1 := make(map[string]string)
	for _, a := range n1.Attr {
		attrMap1[a.Key] = a.Val
	}
	for _, a := range n2.Attr {
		if attrMap1[a.Key] != a.Val {
			return false
		}
	}

	// Compare children recursively.
	n1Child, n2Child := n1.FirstChild, n2.FirstChild
	for n1Child != nil && n2Child != nil {
		if !CompareNodes(n1Child, n2Child) {
			return false
		}
		n1Child = n1Child.NextSibling
		n2Child = n2Child.NextSibling
	}
	return n1Child == nil && n2Child == nil
}
