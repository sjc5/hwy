/*
BEGIN JSX INTRISIC ELEMENTS CODE
Adapted from: https://github.com/yudai-nkt/hono-jsx-types/blob/main/index.d.ts
Original license: MIT
Copied from source on: October 22, 2023
*/

/// <reference lib="dom" />

type BooleanLike = boolean | `${boolean}`;

type NumberLike = number | `${number}`;

type IfValueTypeIsBooleanConvertToBooleanOrBooleanString<T> = T extends boolean
  ? BooleanLike
  : T;

type IfValueTypeIsNumberConvertToNumberOrNumberString<T> = T extends number
  ? NumberLike
  : T;

type IfValueTypeIsFunctionConvertToString<T> = T extends (...args: any[]) => any
  ? string
  : T;

type HandleConversions<T> = IfValueTypeIsBooleanConvertToBooleanOrBooleanString<
  IfValueTypeIsNumberConvertToNumberOrNumberString<
    IfValueTypeIsFunctionConvertToString<T>
  >
>;

declare global {
  namespace JSX {
    // Taken from https://github.com/preactjs/preact/blob/841ef82648b85dbb12dc17a47d7f79f000492030/src/jsx.d.ts and modified
    // MIT License
    // All the WAI-ARIA 1.1 attributes from https://www.w3.org/TR/wai-aria-1.1/
    interface AriaAttributes {
      /** Identifies the currently active element when DOM focus is on a composite widget, textbox, group, or application. */
      "aria-activedescendant"?: string | undefined;
      /** Indicates whether assistive technologies will present all, or only parts of, the changed region based on the change notifications defined by the aria-relevant attribute. */
      "aria-atomic"?: BooleanLike | undefined;
      /**
       * Indicates whether inputting text could trigger display of one or more predictions of the user's intended value for an input and specifies how predictions would be
       * presented if they are made.
       */
      "aria-autocomplete"?: "none" | "inline" | "list" | "both" | undefined;
      /** Indicates an element is being modified and that assistive technologies MAY want to wait until the modifications are complete before exposing them to the user. */
      "aria-busy"?: BooleanLike | undefined;
      /**
       * Indicates the current "checked" state of checkboxes, radio buttons, and other widgets.
       * @see aria-pressed
       * @see aria-selected.
       */
      "aria-checked"?: BooleanLike | "mixed" | undefined;
      /**
       * Defines the total number of columns in a table, grid, or treegrid.
       * @see aria-colindex.
       */
      "aria-colcount"?: number | undefined;
      /**
       * Defines an element's column index or position with respect to the total number of columns within a table, grid, or treegrid.
       * @see aria-colcount
       * @see aria-colspan.
       */
      "aria-colindex"?: number | undefined;
      /**
       * Defines the number of columns spanned by a cell or gridcell within a table, grid, or treegrid.
       * @see aria-colindex
       * @see aria-rowspan.
       */
      "aria-colspan"?: number | undefined;
      /**
       * Identifies the element (or elements) whose contents or presence are controlled by the current element.
       * @see aria-owns.
       */
      "aria-controls"?: string | undefined;
      /** Indicates the element that represents the current item within a container or set of related elements. */
      "aria-current"?:
        | BooleanLike
        | "page"
        | "step"
        | "location"
        | "date"
        | "time"
        | undefined;
      /**
       * Identifies the element (or elements) that describes the object.
       * @see aria-labelledby
       */
      "aria-describedby"?: string | undefined;
      /**
       * Identifies the element that provides a detailed, extended description for the object.
       * @see aria-describedby.
       */
      "aria-details"?: string | undefined;
      /**
       * Indicates that the element is perceivable but disabled, so it is not editable or otherwise operable.
       * @see aria-hidden
       * @see aria-readonly.
       */
      "aria-disabled"?: BooleanLike | undefined;
      /**
       * Indicates what functions can be performed when a dragged object is released on the drop target.
       * @deprecated in ARIA 1.1
       */
      "aria-dropeffect"?:
        | "none"
        | "copy"
        | "execute"
        | "link"
        | "move"
        | "popup"
        | undefined;
      /**
       * Identifies the element that provides an error message for the object.
       * @see aria-invalid
       * @see aria-describedby.
       */
      "aria-errormessage"?: string | undefined;
      /** Indicates whether the element, or another grouping element it controls, is currently expanded or collapsed. */
      "aria-expanded"?: BooleanLike | undefined;
      /**
       * Identifies the next element (or elements) in an alternate reading order of content which, at the user's discretion,
       * allows assistive technology to override the general default of reading in document source order.
       */
      "aria-flowto"?: string | undefined;
      /**
       * Indicates an element's "grabbed" state in a drag-and-drop operation.
       * @deprecated in ARIA 1.1
       */
      "aria-grabbed"?: BooleanLike | undefined;
      /** Indicates the availability and type of interactive popup element, such as menu or dialog, that can be triggered by an element. */
      "aria-haspopup"?:
        | BooleanLike
        | "menu"
        | "listbox"
        | "tree"
        | "grid"
        | "dialog"
        | undefined;
      /**
       * Indicates whether the element is exposed to an accessibility API.
       * @see aria-disabled.
       */
      "aria-hidden"?: BooleanLike | undefined;
      /**
       * Indicates the entered value does not conform to the format expected by the application.
       * @see aria-errormessage.
       */
      "aria-invalid"?: BooleanLike | "grammar" | "spelling" | undefined;
      /** Indicates keyboard shortcuts that an author has implemented to activate or give focus to an element. */
      "aria-keyshortcuts"?: string | undefined;
      /**
       * Defines a string value that labels the current element.
       * @see aria-labelledby.
       */
      "aria-label"?: string | undefined;
      /**
       * Identifies the element (or elements) that labels the current element.
       * @see aria-describedby.
       */
      "aria-labelledby"?: string | undefined;
      /** Defines the hierarchical level of an element within a structure. */
      "aria-level"?: number | undefined;
      /** Indicates that an element will be updated, and describes the types of updates the user agents, assistive technologies, and user can expect from the live region. */
      "aria-live"?: "off" | "assertive" | "polite" | undefined;
      /** Indicates whether an element is modal when displayed. */
      "aria-modal"?: BooleanLike | undefined;
      /** Indicates whether a text box accepts multiple lines of input or only a single line. */
      "aria-multiline"?: BooleanLike | undefined;
      /** Indicates that the user may select more than one item from the current selectable descendants. */
      "aria-multiselectable"?: BooleanLike | undefined;
      /** Indicates whether the element's orientation is horizontal, vertical, or unknown/ambiguous. */
      "aria-orientation"?: "horizontal" | "vertical" | undefined;
      /**
       * Identifies an element (or elements) in order to define a visual, functional, or contextual parent/child relationship
       * between DOM elements where the DOM hierarchy cannot be used to represent the relationship.
       * @see aria-controls.
       */
      "aria-owns"?: string | undefined;
      /**
       * Defines a short hint (a word or short phrase) intended to aid the user with data entry when the control has no value.
       * A hint could be a sample value or a brief description of the expected format.
       */
      "aria-placeholder"?: string | undefined;
      /**
       * Defines an element's number or position in the current set of listitems or treeitems. Not required if all elements in the set are present in the DOM.
       * @see aria-setsize.
       */
      "aria-posinset"?: number | undefined;
      /**
       * Indicates the current "pressed" state of toggle buttons.
       * @see aria-checked
       * @see aria-selected.
       */
      "aria-pressed"?: BooleanLike | "mixed" | undefined;
      /**
       * Indicates that the element is not editable, but is otherwise operable.
       * @see aria-disabled.
       */
      "aria-readonly"?: BooleanLike | undefined;
      /**
       * Indicates what notifications the user agent will trigger when the accessibility tree within a live region is modified.
       * @see aria-atomic.
       */
      "aria-relevant"?:
        | "additions"
        | "additions removals"
        | "additions text"
        | "all"
        | "removals"
        | "removals additions"
        | "removals text"
        | "text"
        | "text additions"
        | "text removals"
        | undefined;
      /** Indicates that user input is required on the element before a form may be submitted. */
      "aria-required"?: BooleanLike | undefined;
      /** Defines a human-readable, author-localized description for the role of an element. */
      "aria-roledescription"?: string | undefined;
      /**
       * Defines the total number of rows in a table, grid, or treegrid.
       * @see aria-rowindex.
       */
      "aria-rowcount"?: number | undefined;
      /**
       * Defines an element's row index or position with respect to the total number of rows within a table, grid, or treegrid.
       * @see aria-rowcount
       * @see aria-rowspan.
       */
      "aria-rowindex"?: number | undefined;
      /**
       * Defines the number of rows spanned by a cell or gridcell within a table, grid, or treegrid.
       * @see aria-rowindex
       * @see aria-colspan.
       */
      "aria-rowspan"?: number | undefined;
      /**
       * Indicates the current "selected" state of various widgets.
       * @see aria-checked
       * @see aria-pressed.
       */
      "aria-selected"?: BooleanLike | undefined;
      /**
       * Defines the number of items in the current set of listitems or treeitems. Not required if all elements in the set are present in the DOM.
       * @see aria-posinset.
       */
      "aria-setsize"?: number | undefined;
      /** Indicates if items in a table or grid are sorted in ascending or descending order. */
      "aria-sort"?: "none" | "ascending" | "descending" | "other" | undefined;
      /** Defines the maximum allowed value for a range widget. */
      "aria-valuemax"?: number | undefined;
      /** Defines the minimum allowed value for a range widget. */
      "aria-valuemin"?: number | undefined;
      /**
       * Defines the current value for a range widget.
       * @see aria-valuetext.
       */
      "aria-valuenow"?: number | undefined;
      /** Defines the human readable text alternative of aria-valuenow for a range widget. */
      "aria-valuetext"?: string | undefined;
    }

    type HTMLAttributes<E> = AriaAttributes &
      Partial<
        | Omit<
            {
              [K in keyof E]: HandleConversions<E[K]>;
            },
            `aria${Capitalize<string>}`
          >
        | { dangerouslySetInnerHTML: { __html: string } }
        | JSX.ElementChildrenAttribute
      >;

    interface IntrinsicElements {
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
  }
}

/*
END JSX INTRISIC ELEMENTS CODE
*/

/*
HWY EXPORTS
*/
export { setupLiveRefreshEndpoints } from "./src/dev-init.js";
