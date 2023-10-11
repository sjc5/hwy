const __window = window as any;

import htmx from "htmx.org";
__window.htmx = htmx;

// @ts-ignore
import("htmx.org/dist/ext/head-support.js");
