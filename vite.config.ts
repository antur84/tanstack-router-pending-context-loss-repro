import { createRequire } from 'node:module'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { defineConfig } from 'vite'
import viteReact from '@vitejs/plugin-react'

const require = createRequire(import.meta.url)
const routerVersion = require('@tanstack/react-router/package.json').version

export default defineConfig({
  define: {
    __ROUTER_VERSION__: JSON.stringify(routerVersion),
  },
  server: {
    port: 3000,
  },
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [tanstackStart(), viteReact()],
})
