import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import fs from 'node:fs'
import path from 'node:path'

function localDatabasePlugin(): Plugin {
  return {
    name: 'local-database-sync',
    configureServer(server) {
      server.middlewares.use((_req, res, next) => {
        // Enforce baseline security headers on all responses
        res.setHeader('X-Content-Type-Options', 'nosniff')
        res.setHeader('X-Frame-Options', 'SAMEORIGIN')
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
        next()
      })

      server.middlewares.use('/api/database', (req, res, next) => {
        const dbPath = path.resolve(process.cwd(), 'database', 'logins.json')
        if (!fs.existsSync(path.dirname(dbPath))) {
          fs.mkdirSync(path.dirname(dbPath), { recursive: true })
        }

        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
        res.setHeader('Content-Type', 'application/json')

        if (req.method === 'GET') {
          if (fs.existsSync(dbPath)) {
            const content = fs.readFileSync(dbPath, 'utf-8')
            res.end(content || '[]')
          } else {
            res.end('[]')
          }
          return
        }

        if (req.method === 'POST') {
          let body = ''
          let totalBytes = 0
          const MAX_PAYLOAD_SIZE = 1024 * 1024 // 1 MB limit

          req.on('data', chunk => {
            totalBytes += chunk.length
            if (totalBytes > MAX_PAYLOAD_SIZE) {
              res.statusCode = 413 // Payload Too Large
              res.end(JSON.stringify({ error: 'Payload exceeds maximum limit of 1MB' }))
              req.destroy()
              return
            }
            body += chunk
          })

          req.on('end', () => {
            try {
              if (body) {
                // Ensure body is valid JSON before writing to disk
                const parsed = JSON.parse(body)
                if (!Array.isArray(parsed)) {
                  res.statusCode = 400
                  res.end(JSON.stringify({ error: 'Payload must be a JSON array' }))
                  return
                }
                fs.writeFileSync(dbPath, JSON.stringify(parsed, null, 2), 'utf-8')
              }
              res.end(JSON.stringify({ success: true }))
            } catch (err) {
              res.statusCode = 400
              res.end(JSON.stringify({ error: 'Invalid JSON payload: ' + String(err) }))
            }
          })
          return
        }

        next()
      })
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), localDatabasePlugin()],
})
