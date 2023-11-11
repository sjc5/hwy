import type { Context } from "hono";
import { setCookie } from "hono/cookie";

type CookieEventValues = Record<string, any>;
type CookieEvents<
  T extends Record<string, CookieEventValues> = Record<string, any>,
> = T;
type EventName<T extends CookieEvents> = keyof T & string;

function triggerCookieEventRaw<N extends string, V extends CookieEventValues>({
  c,
  name,
  values,
}: {
  c: Context;
  name: N;
  values: V;
}) {
  setCookie(c, name, JSON.stringify(values));
}

function listenForCookieEventsRaw<
  T extends CookieEvents,
  N extends EventName<T>,
>({
  name,
  callback,
}: {
  name: N;
  callback: (event: Event & { detail: T[N] }) => void;
}) {
  document.body.addEventListener(name, (event) => callback(event as any));
}

function get_client_cookies() {
  const cookie_array = document.cookie.split("; ");
  const cookies = {} as Record<string, string>;

  cookie_array.forEach((cookie_str) => {
    const [name, value] = cookie_str.split("=");
    cookies[name] = decodeURIComponent(value);
  });

  return cookies;
}

function delete_client_cookie(name: string) {
  document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
}

function makeCookieEventHelpers<T extends CookieEvents>(cookieEvents: T) {
  function triggerCookieEvent<E extends EventName<T>>({
    c,
    name,
    values,
  }: {
    c: Context;
    name: E;
    values: T[E];
  }) {
    triggerCookieEventRaw({ c, name, values } as any);
  }

  function listenForCookieEvents<E extends EventName<T>>(
    name: E,
    callback: (event: Event & { detail: T[E] }) => void,
  ) {
    listenForCookieEventsRaw({ name, callback } as any);
  }

  function addGlobalCookieEventListener() {
    const keys = Object.keys(cookieEvents) as Array<EventName<T>>;

    document.body.addEventListener("htmx:afterSettle", function () {
      const cookies = get_client_cookies();

      keys.forEach((key) => {
        if (key in cookies) {
          document.body.dispatchEvent(
            new CustomEvent(key, {
              detail: JSON.parse(cookies[key]),
            }),
          );

          delete_client_cookie(key);
        }
      });
    });
  }

  return {
    triggerCookieEvent,
    listenForCookieEvents,
    addGlobalCookieEventListener,
  };
}

export { makeCookieEventHelpers };
export type { CookieEvents };
