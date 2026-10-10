import { loadEnv, type Plugin } from 'vite'

// Serves /api/* from the same handlers Vercel runs in production, so `npm run dev` talks to the real sheet.
export function apiPlugin(): Plugin {
  return {
    name: 'wedding-api',
    configureServer(server) {
      Object.assign(process.env, loadEnv(server.config.mode, process.cwd(), '')) // server-side only; no VITE_ prefix means it never reaches the client
      server.middlewares.use(async (req, res, next) => {
        const m = req.url?.match(/^\/api\/(guest|rsvp|wishes)(?:\?|$)/)
        if (!m) return next()
        try {
          const mod = await server.ssrLoadModule(`/api/${m[1]}.ts`)
          await mod.default(req, res)
        } catch (e) {
          server.config.logger.error(`[api/${m[1]}] ${e instanceof Error ? e.message : 'error'}`)
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Internal error' }))
        }
      })
    },
  }
}
