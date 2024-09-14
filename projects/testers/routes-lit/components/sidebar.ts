import { LightElement, makeComp } from "@hwy-js/lit";
import { html } from "lit";
import { property } from "lit/decorators.js";

class SidebarDef extends LightElement {
	render() {
		return html`
      <ul class="sidebar">
        ${LinkListItem({ href: "/does-not-exist" })}
        ${LinkListItem({ href: "/this-should-be-ignored" })}
        ${LinkListItem({ href: "/" })} -------------
        ${LinkListItem({ href: "/lion" })}
        ${LinkListItem({ href: "/lion/123" })}
        ${LinkListItem({ href: "/lion/123/456" })}
        ${LinkListItem({ href: "/lion/123/456/789" })} -------------
        ${LinkListItem({ href: "/tiger" })}
        ${LinkListItem({ href: "/tiger/123" })}
        ${LinkListItem({ href: "/tiger/123/456" })}
        ${LinkListItem({ href: "/tiger/123/456/789" })} -------------
        ${LinkListItem({ href: "/bear" })}
        ${LinkListItem({ href: "/bear/123" })}
        ${LinkListItem({ href: "/bear/123/456" })}
        ${LinkListItem({ href: "/bear/123/456/789" })} -------------
        ${LinkListItem({ href: "/dashboard" })}
        ${LinkListItem({ href: "/dashboard/asdf" })}
        ${LinkListItem({ href: "/dashboard/customers" })}
        ${LinkListItem({ href: "/dashboard/customers/123" })}
        ${LinkListItem({ href: "/dashboard/customers/123/orders" })}
        ${LinkListItem({ href: "/dashboard/customers/123/orders/456" })}
        ------------- ${LinkListItem({ href: "/articles" })}
        ${LinkListItem({ href: "/articles/bob" })}
        ${LinkListItem({ href: "/articles/test" })}
        ${LinkListItem({ href: "/articles/test/articles" })}
      </ul>
    `;
	}
}

export const Sidebar = makeComp(SidebarDef, "sidebar");

class LinkDef extends LightElement {
	@property() href = "";

	render() {
		return html`
      <li>
        <a href=${this.href} data-boost="true"> ${this.href} </a>
      </li>
    `;
	}
}

const LinkListItem = makeComp(LinkDef, "link-list-item");
