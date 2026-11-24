import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import path from 'node:path'

// The public website's pages are built as dist/<page>/index.html (scripts/prerender.mjs).
// On the live site vercel.json sends /<page> to that file. This does the same for
// "vite preview", which the tests run against.
const sitePages = () => ({
  name: 'qplan-site-pages',
  configurePreviewServer(server) {
    server.middlewares.use((req, _res, next) => {
      const [pathname, query] = (req.url || '').split('?')
      const out = server.config.build.outDir
      const q = query ? '?' + query : ''
      if (/^\/[a-z0-9-]+$/.test(pathname) && fs.existsSync(path.join(out, pathname.slice(1), 'index.html'))) {
        req.url = `${pathname}/index.html${q}`
      } else if (pathname !== '/' && !path.extname(pathname) && fs.existsSync(path.join(out, 'app.html'))) {
        // not a website page and not a file: the app (login, a job summary), as on the live site
        req.url = `/app.html${q}`
      }
      next()
    })
  },
})

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    sitePages(),
  ],
  server: {
    historyApiFallback: true,
  },
  preview: {
    historyApiFallback: true,
  },
})
