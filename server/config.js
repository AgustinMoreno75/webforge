import dotenv from 'dotenv'

dotenv.config()

const requiredEnv = [
  'DATABASE_URL',
  'JWT_SECRET',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'MAIL_FROM',
  'CONTACT_TO_EMAIL',
]

export function validateEnv() {
  const missing = requiredEnv.filter((key) => !process.env[key])

  if (process.env.RECAPTCHA_ENABLED === 'true' && !process.env.RECAPTCHA_SECRET_KEY) {
    missing.push('RECAPTCHA_SECRET_KEY')
  }

  if (process.env.RECAPTCHA_ENABLED === 'true' && !process.env.VITE_RECAPTCHA_SITE_KEY) {
    missing.push('VITE_RECAPTCHA_SITE_KEY')
  }

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
}

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 8080),
  appOrigin: process.env.APP_ORIGIN || 'http://localhost:5173',
  appBaseUrl: process.env.APP_BASE_URL || process.env.APP_ORIGIN || 'http://localhost:5173',
  trustProxy: process.env.TRUST_PROXY === 'true',
  databaseUrl: process.env.DATABASE_URL,
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
  },
  analytics: {
    measurementId: process.env.GOOGLE_ANALYTICS_ID || '',
  },
  blockedIps: String(process.env.BLOCKED_IPS || '')
    .split(',')
    .map((ip) => ip.trim())
    .filter(Boolean),
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  mailFrom: process.env.MAIL_FROM,
  contactToEmail: process.env.CONTACT_TO_EMAIL,
  recaptcha: {
    enabled: process.env.RECAPTCHA_ENABLED === 'true',
    secretKey: process.env.RECAPTCHA_SECRET_KEY || '',
    siteKey: process.env.VITE_RECAPTCHA_SITE_KEY || '',
    scoreThreshold: Number(process.env.RECAPTCHA_MIN_SCORE || 0.5),
  },
  security: {
    authMaxFailedAttempts: Number(process.env.AUTH_MAX_FAILED_ATTEMPTS || 5),
    authLockoutMinutes: Number(process.env.AUTH_LOCKOUT_MINUTES || 15),
  },
  jobs: {
    enabled: process.env.JOBS_ENABLED !== 'false',
    timezone: process.env.JOBS_TIMEZONE || 'America/Argentina/Buenos_Aires',
  },
}
