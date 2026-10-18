import express from 'express'
import cors from 'cors'
import { pathToFileURL } from 'url'

import customersRouter from './routes/customers.js'
import leadsRouter from './routes/leads.js'
import followupsRouter from './routes/followups.js'
import dealsRouter from './routes/deals.js'
import dashboardRouter from './routes/dashboard.js'
import analyticsRouter from './routes/analytics.js'
import searchRouter from './routes/search.js'
import exportRouter from './routes/export.js'

export const app = express()

app.use(cors())
app.use(express.json())

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok' }))

// API routes
app.use('/api/customers', customersRouter)
app.use('/api/leads', leadsRouter)
app.use('/api/followups', followupsRouter)
app.use('/api/deals', dealsRouter)
app.use('/api/dashboard', dashboardRouter)
app.use('/api/analytics', analyticsRouter)
app.use('/api/search', searchRouter)
app.use('/api/export', exportRouter)

// Global error handler
app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: err.message })
})

// Only start listening when run directly (not imported by tests)
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { seedIfEmpty } = await import('./seed.js')
  seedIfEmpty()

  const port = process.env.PORT || 3001
  app.listen(port, () => {
    console.log(`CRM backend listening on http://localhost:${port}`)
  })
}
