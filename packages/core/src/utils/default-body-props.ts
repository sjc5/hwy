const nprogress_callback_props = {
  "hx-on::before-request": "NProgress.start()",
  "hx-on::after-request": "NProgress.done()",
  "hx-on::history-restore": 'document.getElementById("nprogress")?.remove()',
} as const;

const base_props = {
  "hx-ext": "head-support",
  "hx-boost": "true",
  "hx-swap": "outerHTML",
  "hx-target": "this",
} as const;

function getDefaultBodyProps(options?: { nProgress: boolean }) {
  return {
    ...base_props,
    ...(options?.nProgress ? nprogress_callback_props : {}),
  } as const;
}

export { getDefaultBodyProps };
