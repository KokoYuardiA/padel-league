import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import swaggerUi from 'swagger-ui-express'
import { generateOpenApiDocument } from './openapi'
import { groupsRouter } from './routes/groups.routes'
import { eventsRouter } from './routes/events.routes'
import { matchesRouter } from './routes/matches.routes'
import { scheduleRouter } from './routes/schedule.routes'
import { playersRouter } from './routes/players.routes'
import { adminRouter } from './routes/admin.routes'
import { publicRouter } from './routes/public.routes'
import { errorHandler } from './middlewares/error.middleware'

const app = express()

const PORT = process.env.PORT || 3001
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'

// ── Middleware ──────────────────────────────────────────────
app.use(cors({ origin: FRONTEND_URL, credentials: true }))
app.use(express.json())

// Request logging
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`)
  next()
})

// ── API Routes ──────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ── API Docs (OpenAPI / Swagger) ──────────────────────────────
const openApiDocument = generateOpenApiDocument()
app.get('/api/openapi.json', (_req, res) => {
  res.json(openApiDocument)
})
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument))

app.use('/api/groups', groupsRouter)
app.use('/api/events', eventsRouter)
app.use('/api/events', scheduleRouter)
app.use('/api/matches', matchesRouter)
app.use('/api/players', playersRouter)
app.use('/api/admin', adminRouter)
app.use('/api/public', publicRouter)

// ── 404 Handler ─────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

// ── Global Error Handler ─────────────────────────────────────
app.use(errorHandler)

// ── Start Server ─────────────────────────────────────────────
// Only listen on a port for local dev / traditional hosts (Render, etc).
// On Vercel, this module is imported by api/index.ts as a serverless
// function handler instead — no port to bind there.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`
    ✅ Rally Hub — Backend API Server
    🌐 REST API:  http://localhost:${PORT}/api
    🔍 Health:    http://localhost:${PORT}/health
    🌍 CORS:      ${FRONTEND_URL}
    `)
  })
}

export default app
