import { html, LitElement } from "lit";

export class LightElement extends LitElement {
  createRenderRoot() {
    return this;
  }
}

let makeCompGlobalCount = 0;

export type AsComp<T extends typeof LitElement> = ReturnType<
  typeof makeComp<T>
>;

export function makeComp<T extends typeof LitElement>(
  litElement: T,
  name?: string,
) {
  let n = name;
  if (!n) {
    n = `lit-anon-${makeCompGlobalCount++}`;
  } else if (!n.includes("-")) {
    n = `lit-${n}`;
  }

  customElements.define(n, litElement);

  const keys = extractPropertyKeys(litElement);
  let openingStr = `<${n}`;
  if (keys?.[0]) {
    openingStr += ` .${keys[0]}=`;
  }
  const closingStr = `></${n}>`;

  const innerStrs: Array<string> = [];
  for (let i = 1; i < keys.length; i++) {
    innerStrs.push(` .${keys[i]}=`);
  }

  const strings = [openingStr, ...innerStrs, closingStr] as Array<string> & {
    raw: Array<string>;
  };
  strings.raw = strings;

  return function fn(props: ExtractProps<T>) {
    const values = keys.map((key) => (props as any)[key]);
    return html(strings, ...values);
  };
}

function extractPropertyKeys(litElement: typeof LitElement) {
  const propertyKeys: Array<string> = [];
  for (const x of litElement.elementProperties.keys()) {
    propertyKeys.push(x.toString());
  }
  return propertyKeys;
}

type ExtractProps<T extends typeof LitElement> = {
  [K in keyof T["prototype"] as K extends
    | ExcludedProperties
    | StartsWithUnderscore<K>
    ? never
    : K]: T["prototype"][K];
};

type ExcludedProperties =
  | keyof LitElement
  | "render"
  | "createRenderRoot"
  | "connectedCallback"
  | "attributeChangedCallback"
  | "adoptedCallback"
  | "firstUpdated";

type StartsWithUnderscore<T> = T extends `_${string}` ? T : never;
