import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config, validateEnv } from './config.js'
import contactRouter from './routes/contact.js'
import authRouter from './routes/auth.js'
import billingRouter from './routes/billing.js'
import ticketsRouter from './routes/tickets.js'
import adminRouter from './routes/admin.js'
import { startPlatformScheduler } from './jobs/scheduler.js'

validateEnv()

const app = express()

if (config.trustProxy) {
  app.set('trust proxy', 1)
}

app.use(
  helmet({
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  }),
)
app.use(cors({ origin: config.appOrigin }))
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'))
app.use(express.json({ limit: '200kb' }))
app.use(express.urlencoded({ extended: false }))

app.use((req, res, next) => {
  if (config.blockedIps.includes(req.ip)) {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado.',
    })
  }

  return next()
})

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Demasiadas solicitudes. Intenta nuevamente en unos minutos.',
  },
})

app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'ok' })
})

app.get('/api/public-config', (_req, res) => {
  res.status(200).json({
    success: true,
    config: {
      analyticsMeasurementId: config.analytics.measurementId,
      recaptchaEnabled: config.recaptcha.enabled,
      recaptchaSiteKey: config.recaptcha.siteKey,
      appBaseUrl: config.appBaseUrl,
    },
  })
})

app.use('/api/auth', authRouter)
app.use('/api/contact', contactLimiter, contactRouter)
app.use('/api/billing', billingRouter)
app.use('/api/tickets', ticketsRouter)
app.use('/api/admin', adminRouter)

if (config.nodeEnv === 'production') {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)
  const distPath = path.resolve(__dirname, '../dist')

  app.use(express.static(distPath))
  app.get(/^\/(?!api).*/, (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

app.use((err, req, res, next) => {
  console.error(err)

  const response = res && typeof res.status === 'function' && typeof res.json === 'function'
    ? res
    : next && typeof next.status === 'function' && typeof next.json === 'function'
      ? next
      : null

  if (!response) {
    return undefined
  }

  if (response.headersSent) {
    if (typeof next === 'function') {
      return next(err)
    }
    return undefined
  }

  return response.status(500).json({
    success: false,
    message: err?.message || 'Error interno del servidor.',
    path: req?.originalUrl || null,
  })
})

startPlatformScheduler()

app.listen(config.port, () => {
  console.log(`WebForge API running on http://localhost:${config.port}`)
})
