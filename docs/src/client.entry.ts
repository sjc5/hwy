const __window = window as any;

import htmx from "htmx.org";
__window.htmx = htmx;

import NProgress from "nprogress";
__window.NProgress = NProgress;

// @ts-ignore
import("htmx.org/dist/ext/head-support.js");
