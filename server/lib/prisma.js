import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis

// Códigos/errores transitorios típicos de bases serverless (p. ej. Neon) que
// suspenden el cómputo tras inactividad: el primer query "despierta" la base.
const TRANSIENT_CODES = new Set(['P1001', 'P1002', 'P1008', 'P1017'])

function isTransientError(error) {
  if (!error) return false
  if (TRANSIENT_CODES.has(error.code)) return true
  const message = String(error.message || '')
  return (
    message.includes("Can't reach database server") ||
    message.includes('Connection reset') ||
    message.includes('kind: Closed')
  )
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function createPrismaClient() {
  const base = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })

  // Reintenta operaciones (incluyendo queries crudas) ante errores transitorios de conexión.
  return base.$extends({
    query: {
      async $allOperations({ args, query }) {
        const maxAttempts = 5
        let lastError
        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
          try {
            return await query(args)
          } catch (error) {
            lastError = error
            if (!isTransientError(error) || attempt === maxAttempts) {
              throw error
            }
            await sleep(500 * attempt)
          }
        }
        throw lastError
      },
    },
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

