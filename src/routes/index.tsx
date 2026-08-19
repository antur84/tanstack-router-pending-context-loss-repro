import { Link, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: () => (
    <div style={{ padding: 16 }}>
      <h1 data-testid="home">home (ssr:false shell)</h1>
      <p data-testid="router-version">@tanstack/react-router {__ROUTER_VERSION__}</p>
      <Link to="/other">to other</Link>
      <button
        type="button"
        data-testid="login-pattern"
        onClick={() => {
          const router = (window as any).__TSR_ROUTER__
          router.invalidate()
          router.navigate({ to: '/other' })
        }}
      >
        invalidate + navigate (post-login pattern)
      </button>
    </div>
  ),
})
