# Breaking Changes

## Preact for JSX Rendering

We are transitioning away from Hono JSX to Preact.

We are still using Hono for our server, just not for our JSX rendering.

This allows us to let Hwy users choose whether they want to use HTMX or Preact.

So for projects that work well with HTMX, choose HTMX. For projects that might
work better with a virtual DOM, choose Preact.

## Preact Client-Side Mode

If you want, now you can choose Preact instead of HTMX

## Splitting of Page Files

To support this new Preact option,

######

# TODO

- Add "classic-mpa" mode.
- It's really time to update the docs.
- Setup "USE_PREACT_COMPAT"

# WHERE IS HTMX?

- [x] initers.ts // not needed anymore (put in htmx utils)
- [x] get-is-hx-request.ts // not needed anymore (put in htmx utils)
- [x] redirect.ts // not needed anymore (put in htmx utils)
- [x] default-body-props.ts // not needed anymore (put in htmx utils)
- [ ] Create-hwy package in general
- [ ] client-cookie-events.ts
