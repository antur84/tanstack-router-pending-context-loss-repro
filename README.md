# Repro: pending presentation renders routes with their beforeLoad context stripped

On client-side navigation, a route's rendered `useRouteContext()` can lose every
key its `beforeLoad` provides — for the duration of the reload — crashing any
component that treats those keys as always-present. Regression between
`@tanstack/react-router` 1.170.15 and 1.170.29 (the lane loader rewrite).
Filed as https://github.com/TanStack/router/issues/8115.

## Run

```
pnpm install
pnpm build
pnpm start
```

Open http://localhost:3000, then either:

- click **to other** (a plain `<Link>` navigation), or
- click **invalidate + navigate** (a post-login-style `router.invalidate()`
  followed immediately by `router.navigate()`).

The console logs `ROOT_RENDER locale=undefined` and the root `errorComponent`
takes over: the root route's component re-rendered while `useRouteContext().locale`
— provided by the root `beforeLoad` on every previous render — was gone.

In both cases the root `errorComponent` shows briefly and the navigation then
completes — the stripped render happens mid-load, and the load's own commit
replaces it. In a real app every flash is a rendered crash screen plus an
error report; components that cache the bad value (an i18n runtime seeded from
context, say) can stay broken past the flash.

Two things to know when clicking around:

- **One attempt per page load.** Once `/other` has rendered, later
  navigations retain it — no match goes pending, so the mid-load presentation
  that exposes the stripped context never happens. Hard-reload between
  attempts.
- **Hover preloading masks it.** With `defaultPreload: 'intent'`, hovering
  the link pre-runs the load, so a mouse click navigates outside the
  vulnerable window. This repro disables preload; in production the bug
  correspondingly skews to touch devices, where intent preloading never fires.

The `old-versions-clean` branch pins `@tanstack/react-router` 1.170.15 /
`@tanstack/react-start` 1.168.25: same app, same clicks, no context loss.

## Ingredients

1. A `defaultPendingComponent` plus `defaultPendingMs` (150 here) — or any
   pending component on the navigation target.
2. A root (or any always-rendered) route whose async `beforeLoad` returns
   context and takes longer than `pendingMs`. 300 ms here; on real mobile
   devices this is an ordinary duration.
3. A component that reads that context during render.

With `router.invalidate()` in the mix, ingredient 2 weakens: invalidated
matches present with **zero** delay (`match.invalid ? 0 : pendingMs`), so even
a fast `beforeLoad` window gets rendered.

## Where it happens (v1.171.24 router-core, `dist/esm/load-client.js`)

`contextualize()` mutates the in-flight lane's match in place, in two steps:

```js
context = { ...parentContext, ...routeContext };
match.context = context;               // ← beforeLoad-provided keys GONE
...
const result = await waitFor(beforeLoad(beforeLoadContext), signal);  // async gap
...
match.context = { ...context, ...result };   // ← keys restored
```

Meanwhile `offerPending()` fires at `pendingMs` and presents shallow clones of
those same lane matches to React:

```js
const offered = matches.map((match) => ({ ...match, _flight: void 0 }));
offered[boundary].status = "pending";
router.startTransition(() => router.stores.setMatches(offered), offered);
```

If the timer fires inside the async gap, the presented root match has
`status: "success"` (it is above the pending boundary) and a context missing
everything `beforeLoad` provides. The root component re-renders from it.

On 1.170.15 the pre-rewrite pipeline never published a mid-`beforeLoad`
context, so the same app is unaffected.

## Suggested fix

Don't overwrite `match.context` before `beforeLoad` settles — keep the fresh
merge local and assign once, after the result is in:

```js
context = { ...parentContext, ...routeContext };
if (!beforeLoad) { match.context = context; continue; }
...
const result = await waitFor(beforeLoad(beforeLoadContext), signal);
match.context = { ...context, ...result };
```

A retained match then keeps its previous (complete) context visible while it
reloads — which is also what the rendered UI expects — and a fresh match below
the pending boundary is presented as `pending`, so nothing reads its
still-empty context.

## Real-world impact

Found in production at lovable.dev after upgrading: ~500 users/hour crashed to
the root error screen (`Invalid locale: undefined` from our i18n runtime — the
locale lives in root `beforeLoad` context). Reverting the upgrade stopped it.
