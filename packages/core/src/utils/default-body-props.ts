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

const idiomorph_props = {
  "hx-ext": "head-support, morph",
  "hx-swap": "morph:innerHTML",
} as const;

type ClientOptions = {
  nProgress?: boolean;
  idiomorph?: boolean;
};

function getDefaultBodyProps(options?: ClientOptions) {
  return {
    ...base_props,
    ...(options?.nProgress ? nprogress_callback_props : {}),
    ...(options?.idiomorph ? idiomorph_props : {}),
  } as const;
}

export { getDefaultBodyProps };
