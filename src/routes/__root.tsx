/// <reference types="vite/client" />
import * as React from 'react'
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router'
import appCss from '~/styles/app.css?url'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export const Route = createRootRoute({
  staleTime: 5 * 60 * 1000,
  beforeLoad: async () => {
    await sleep(300)
    return { locale: 'en', platformAppVersion: null as string | null }
  },
  loader: async () => {
    // Mirrors an un-awaited streamed promise (kicked off, resolved after the
    // shell flushes) plus an awaited slow-ish value.
    const sessionVerdictPromise = (async () => {
      await sleep(300)
      return { kind: 'unknown' }
    })()
    await sleep(50)
    return { sessionVerdictPromise, featureFlags: {} }
  },
  head: () => ({
    meta: [{ title: 'context-loss repro' }],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  errorComponent: ({ error }) => (
    <div data-testid="route-error" style={{ padding: 16 }}>
      <h1>Caught by root errorComponent</h1>
      <pre>{String(error)}</pre>
    </div>
  ),
  component: RootComponent,
})

function LocaleProbe() {
  const { locale } = Route.useRouteContext()
  // Mirrors a component calling a locale-asserting getter during render
  // (paraglide's assertIsLocale in the real app).
  if (locale === undefined) {
    console.error('LOCALE_UNDEFINED_AT_RENDER')
    throw new Error('Invalid locale: undefined (repro)')
  }
  return <meta name="x-locale" content={locale} />
}

function RootComponent() {
  const ctx = Route.useRouteContext()
  Route.useLoaderData()
  if (typeof window !== 'undefined') {
    console.log('ROOT_RENDER locale=' + String(ctx.locale))
  }
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <head>
        <LocaleProbe />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
