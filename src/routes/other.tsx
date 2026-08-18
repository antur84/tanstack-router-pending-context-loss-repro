import { Link, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/other')({
  loader: async () => {
    await new Promise((r) => setTimeout(r, 200))
    return {}
  },
  pendingComponent: () => <p data-testid="other-pending">other pending…</p>,
  component: () => (
    <div style={{ padding: 16 }}>
      <h1 data-testid="other">other (ssr:false shell)</h1>
      <Link to="/">to home</Link>
    </div>
  ),
})
