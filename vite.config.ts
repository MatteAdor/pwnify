import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import fs from 'node:fs'
import path from 'node:path'

function localDatabasePlugin(): Plugin {
  return {
    name: 'local-database-sync',
    configureServer(server) {
      server.middlewares.use('/api/database', (req, res, next) => {
        const dbPath = path.resolve(process.cwd(), 'database', 'logins.json')
        if (!fs.existsSync(path.dirname(dbPath))) {
          fs.mkdirSync(path.dirname(dbPath), { recursive: true })
        }

        if (req.method === 'GET') {
          if (fs.existsSync(dbPath)) {
            const content = fs.readFileSync(dbPath, 'utf-8')
            res.setHeader('Content-Type', 'application/json')
            res.end(content || '[]')
          } else {
            res.setHeader('Content-Type', 'application/json')
            res.end('[]')
          }
          return
        }

        if (req.method === 'POST') {
          let body = ''
          req.on('data', chunk => {
            body += chunk
          })
          req.on('end', () => {
            try {
              if (body) {
                fs.writeFileSync(dbPath, body, 'utf-8')
              }
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: true }))
            } catch (err) {
              res.statusCode = 500
              res.end(JSON.stringify({ error: String(err) }))
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
