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

# TO-DO

- Setup "USE_PREACT_COMPAT"

# WHERE IS HTMX?

- [x] initers.ts // not needed anymore (put in htmx utils)
- [x] get-is-hx-request.ts // not needed anymore (put in htmx utils)
- [x] redirect.ts // not needed anymore (put in htmx utils)
- [x] default-body-props.ts // not needed anymore (put in htmx utils)
- [ ] Create-hwy package in general
- [ ] client-cookie-events.ts

# ARGS

- Preact is a more stable and mature JSX rendering primitive
- Moving to Preact for JSX rendering allows us to use Preact (and React
  ecosystem) on the client if desired, either in islands or for entire apps
- Using Preact for JSX rendering reduces our reliance on Hono, making it very
  possible to switch out Hono for other servers in the future if desired
