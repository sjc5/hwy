type BooleanLike = boolean | `${boolean}`;

type NumberLike = number | `${number}`;

type IfValueTypeIsBooleanConvertToBooleanOrBooleanString<T> = T extends boolean
  ? BooleanLike
  : T;

type IfValueTypeIsNumberConvertToNumberOrNumberString<T> = T extends number
  ? NumberLike
  : T;

type StripNever<T> = {
  [K in keyof T as T[K] extends never ? never : K]: T[K];
};

type IfKeyStartsWithOnConvertValueToString<
  T extends {
    [key: string]: any;
  },
> = StripNever<{
  [K in keyof T]: K extends `on${string}`
    ? T[K] extends ((...args: any[]) => any) | null
      ? string
      : T[K]
    : T[K] extends ((...args: any[]) => any) | null
    ? never
    : T[K];
}>;

type HandleConversions<T> = IfValueTypeIsBooleanConvertToBooleanOrBooleanString<
  IfValueTypeIsNumberConvertToNumberOrNumberString<T>
>;

type HTMLAttributesOuter<E> = Partial<
  {
    children: any;
    class: string;
    dangerouslySetInnerHTML: {
      __html: string;
    };
    style: Partial<CSSStyleDeclaration>;
  } & Omit<
    {
      [K in keyof E]: HandleConversions<E[K]>;
    },
    "children" | "class" | "dangerouslySetInnerHTML" | "style"
  >
>;

type Bob = IfKeyStartsWithOnConvertValueToString<{
  onClick: (e: Event) => void;
  onHover: ((this: GlobalEventHandlers, ev: Event) => any) | null;
  addEventListener: (e: Event) => void;
  foo: string;
  onFoo: number;
}>;

type HTMLAttributes<
  E extends {
    [key: string]: any;
  },
> = HTMLAttributesOuter<Partial<IfKeyStartsWithOnConvertValueToString<E>>>;

type Jerry = HTMLAttributes<HTMLAnchorElement>;

const asdf: Jerry = {
  ontimeupdate: "asdf",
  onclick: "asdf",
};

/*
BEGIN JSX INTRISIC ELEMENTS CODE
Adapted from: https://github.com/yudai-nkt/hono-jsx-types/blob/main/index.d.ts
Original license: MIT
Copied from source on: October 22, 2023
*/

interface CustomIntrinsicElements {
  a: HTMLAttributes<HTMLAnchorElement>;
  abbr: HTMLAttributes<HTMLElement>;
  address: HTMLAttributes<HTMLElement>;
  area: HTMLAttributes<HTMLAreaElement>;
  article: HTMLAttributes<HTMLElement>;
  aside: HTMLAttributes<HTMLElement>;
  audio: HTMLAttributes<HTMLAudioElement>;
  b: HTMLAttributes<HTMLElement>;
  base: HTMLAttributes<HTMLBaseElement>;
  bdi: HTMLAttributes<HTMLElement>;
  bdo: HTMLAttributes<HTMLElement>;
  big: HTMLAttributes<HTMLElement>;
  blockquote: HTMLAttributes<HTMLQuoteElement>;
  body: HTMLAttributes<HTMLBodyElement>;
  br: HTMLAttributes<HTMLBRElement>;
  button: HTMLAttributes<HTMLButtonElement>;
  canvas: HTMLAttributes<HTMLCanvasElement>;
  caption: HTMLAttributes<HTMLTableCaptionElement>;
  cite: HTMLAttributes<HTMLElement>;
  code: HTMLAttributes<HTMLElement>;
  col: HTMLAttributes<HTMLTableColElement>;
  colgroup: HTMLAttributes<HTMLTableColElement>;
  data: HTMLAttributes<HTMLDataElement>;
  datalist: HTMLAttributes<HTMLDataListElement>;
  dd: HTMLAttributes<HTMLElement>;
  del: HTMLAttributes<HTMLModElement>;
  details: HTMLAttributes<HTMLDetailsElement>;
  dfn: HTMLAttributes<HTMLElement>;
  dialog: HTMLAttributes<HTMLDialogElement>;
  div: HTMLAttributes<HTMLDivElement>;
  dl: HTMLAttributes<HTMLDListElement>;
  dt: HTMLAttributes<HTMLElement>;
  em: HTMLAttributes<HTMLElement>;
  embed: HTMLAttributes<HTMLEmbedElement>;
  fieldset: HTMLAttributes<HTMLFieldSetElement>;
  figcaption: HTMLAttributes<HTMLElement>;
  figure: HTMLAttributes<HTMLElement>;
  footer: HTMLAttributes<HTMLElement>;
  form: HTMLAttributes<HTMLFormElement>;
  h1: HTMLAttributes<HTMLHeadingElement>;
  h2: HTMLAttributes<HTMLHeadingElement>;
  h3: HTMLAttributes<HTMLHeadingElement>;
  h4: HTMLAttributes<HTMLHeadingElement>;
  h5: HTMLAttributes<HTMLHeadingElement>;
  h6: HTMLAttributes<HTMLHeadingElement>;
  head: HTMLAttributes<HTMLHeadElement>;
  header: HTMLAttributes<HTMLElement>;
  hgroup: HTMLAttributes<HTMLElement>;
  hr: HTMLAttributes<HTMLHRElement>;
  html: HTMLAttributes<HTMLHtmlElement>;
  i: HTMLAttributes<HTMLElement>;
  iframe: HTMLAttributes<HTMLIFrameElement>;
  img: HTMLAttributes<HTMLImageElement>;
  input: HTMLAttributes<HTMLInputElement>;
  ins: HTMLAttributes<HTMLModElement>;
  kbd: HTMLAttributes<HTMLElement>;
  keygen: HTMLAttributes<HTMLUnknownElement>;
  label: HTMLAttributes<HTMLLabelElement>;
  legend: HTMLAttributes<HTMLLegendElement>;
  li: HTMLAttributes<HTMLLIElement>;
  link: HTMLAttributes<HTMLLinkElement>;
  main: HTMLAttributes<HTMLElement>;
  map: HTMLAttributes<HTMLMapElement>;
  mark: HTMLAttributes<HTMLElement>;
  /**
   * @deprecated
   */
  marquee: HTMLAttributes<HTMLMarqueeElement>;
  menu: HTMLAttributes<HTMLMenuElement>;
  menuitem: HTMLAttributes<HTMLUnknownElement>;
  meta: HTMLAttributes<HTMLMetaElement> | { charset: string };
  meter: HTMLAttributes<HTMLMeterElement>;
  nav: HTMLAttributes<HTMLElement>;
  noscript: HTMLAttributes<HTMLElement>;
  object: HTMLAttributes<HTMLObjectElement>;
  ol: HTMLAttributes<HTMLOListElement>;
  optgroup: HTMLAttributes<HTMLOptGroupElement>;
  option: HTMLAttributes<HTMLOptionElement>;
  output: HTMLAttributes<HTMLOutputElement>;
  p: HTMLAttributes<HTMLParagraphElement>;
  /**
   * @deprecated
   */
  param: HTMLAttributes<HTMLParamElement>;
  picture: HTMLAttributes<HTMLPictureElement>;
  pre: HTMLAttributes<HTMLPreElement>;
  progress: HTMLAttributes<HTMLProgressElement>;
  q: HTMLAttributes<HTMLQuoteElement>;
  rp: HTMLAttributes<HTMLElement>;
  rt: HTMLAttributes<HTMLElement>;
  ruby: HTMLAttributes<HTMLElement>;
  s: HTMLAttributes<HTMLElement>;
  samp: HTMLAttributes<HTMLElement>;
  script: HTMLAttributes<HTMLScriptElement>;
  section: HTMLAttributes<HTMLElement>;
  select: HTMLAttributes<HTMLSelectElement>;
  slot: HTMLAttributes<HTMLSlotElement>;
  small: HTMLAttributes<HTMLElement>;
  source: HTMLAttributes<HTMLSourceElement>;
  span: HTMLAttributes<HTMLSpanElement>;
  strong: HTMLAttributes<HTMLElement>;
  style: HTMLAttributes<HTMLStyleElement>;
  sub: HTMLAttributes<HTMLElement>;
  summary: HTMLAttributes<HTMLElement>;
  sup: HTMLAttributes<HTMLElement>;
  table: HTMLAttributes<HTMLTableElement>;
  tbody: HTMLAttributes<HTMLTableSectionElement>;
  td: HTMLAttributes<HTMLTableCellElement>;
  textarea: HTMLAttributes<HTMLTextAreaElement>;
  tfoot: HTMLAttributes<HTMLTableSectionElement>;
  th: HTMLAttributes<HTMLTableCellElement>;
  thead: HTMLAttributes<HTMLTableSectionElement>;
  time: HTMLAttributes<HTMLTimeElement>;
  title: HTMLAttributes<HTMLTitleElement>;
  tr: HTMLAttributes<HTMLTableRowElement>;
  track: HTMLAttributes<HTMLTrackElement>;
  u: HTMLAttributes<HTMLElement>;
  ul: HTMLAttributes<HTMLUListElement>;
  var: HTMLAttributes<HTMLElement>;
  video: HTMLAttributes<HTMLVideoElement>;
  wbr: HTMLAttributes<HTMLElement>;

  //SVG
  svg: Partial<SVGSVGElement>;
  animate: Partial<SVGAnimateElement>;
  circle: Partial<SVGCircleElement>;
  animateMotion: Partial<SVGAnimateMotionElement>;
  animateTransform: Partial<SVGAnimateTransformElement>;
  clipPath: Partial<SVGClipPathElement>;
  defs: Partial<SVGDefsElement>;
  desc: Partial<SVGDescElement>;
  ellipse: Partial<SVGEllipseElement>;
  feBlend: Partial<SVGFEBlendElement>;
  feColorMatrix: Partial<SVGFEColorMatrixElement>;
  feComponentTransfer: Partial<SVGFEComponentTransferElement>;
  feComposite: Partial<SVGFECompositeElement>;
  feConvolveMatrix: Partial<SVGFEConvolveMatrixElement>;
  feDiffuseLighting: Partial<SVGFEDiffuseLightingElement>;
  feDisplacementMap: Partial<SVGFEDisplacementMapElement>;
  feDistantLight: Partial<SVGFEDistantLightElement>;
  feDropShadow: Partial<SVGFEDropShadowElement>;
  feFlood: Partial<SVGFEFloodElement>;
  feFuncA: Partial<SVGFEFuncAElement>;
  feFuncB: Partial<SVGFEFuncBElement>;
  feFuncG: Partial<SVGFEFuncGElement>;
  feFuncR: Partial<SVGFEFuncRElement>;
  feGaussianBlur: Partial<SVGFEGaussianBlurElement>;
  feImage: Partial<SVGFEImageElement>;
  feMerge: Partial<SVGFEMergeElement>;
  feMergeNode: Partial<SVGFEMergeNodeElement>;
  feMorphology: Partial<SVGFEMorphologyElement>;
  feOffset: Partial<SVGFEOffsetElement>;
  fePointLight: Partial<SVGFEPointLightElement>;
  feSpecularLighting: Partial<SVGFESpecularLightingElement>;
  feSpotLight: Partial<SVGFESpotLightElement>;
  feTile: Partial<SVGFETileElement>;
  feTurbulence: Partial<SVGFETurbulenceElement>;
  filter: Partial<SVGFilterElement>;
  foreignObject: Partial<SVGForeignObjectElement>;
  g: Partial<SVGGElement>;
  image: Partial<SVGImageElement>;
  line: Partial<SVGLineElement>;
  linearGradient: Partial<SVGLinearGradientElement>;
  marker: Partial<SVGMarkerElement>;
  mask: Partial<SVGMaskElement>;
  metadata: Partial<SVGMetadataElement>;
  mpath: Partial<SVGMPathElement>;
  path: Partial<SVGPathElement>;
  pattern: Partial<SVGPatternElement>;
  polygon: Partial<SVGPolygonElement>;
  polyline: Partial<SVGPolylineElement>;
  radialGradient: Partial<SVGRadialGradientElement>;
  rect: Partial<SVGRectElement>;
  set: Partial<SVGSetElement>;
  stop: Partial<SVGStopElement>;
  switch: Partial<SVGSwitchElement>;
  symbol: Partial<SVGSymbolElement>;
  text: Partial<SVGTextElement>;
  textPath: Partial<SVGTextPathElement>;
  tspan: Partial<SVGTSpanElement>;
  use: Partial<SVGUseElement>;
  view: Partial<SVGViewElement>;
}

/*
END JSX INTRISIC ELEMENTS CODE
*/

declare global {
  namespace JSX {
    interface IntrinsicElements extends CustomIntrinsicElements {}
  }
}

/*
HWY EXPORTS
*/
export { setupLiveRefreshEndpoints } from "./src/dev-init.js";
