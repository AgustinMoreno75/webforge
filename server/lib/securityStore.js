import { randomUUID } from 'node:crypto'
import { Prisma } from '@prisma/client'
import { prisma } from './prisma.js'
import { config } from '../config.js'

const MAX_FAILED_ATTEMPTS = config.security.authMaxFailedAttempts
const LOCKOUT_MINUTES = config.security.authLockoutMinutes

export async function isEmailLocked(email) {
  const rows = await prisma.$queryRaw(Prisma.sql`
    SELECT lockout_until
    FROM auth_security
    WHERE email = ${email}
    LIMIT 1
  `)

  const row = rows[0]
  if (!row?.lockout_until) {
    return { locked: false }
  }

  const lockoutUntil = new Date(row.lockout_until)
  const now = new Date()
  if (lockoutUntil > now) {
    const minutesLeft = Math.ceil((lockoutUntil.getTime() - now.getTime()) / 60000)
    return { locked: true, minutesLeft }
  }

  return { locked: false }
}

export async function registerFailedLogin({ email, userId, reason, ipAddress, userAgent }) {
  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO auth_security (id, email, user_id, failed_login_attempts, updated_at)
    VALUES (${randomUUID()}, ${email}, ${userId || null}, 1, NOW())
    ON CONFLICT (email)
    DO UPDATE SET
      failed_login_attempts = auth_security.failed_login_attempts + 1,
      user_id = COALESCE(EXCLUDED.user_id, auth_security.user_id),
      updated_at = NOW()
  `)

  const rows = await prisma.$queryRaw(Prisma.sql`
    SELECT failed_login_attempts
    FROM auth_security
    WHERE email = ${email}
    LIMIT 1
  `)

  const attempts = Number(rows[0]?.failed_login_attempts || 0)

  if (attempts >= MAX_FAILED_ATTEMPTS) {
    await prisma.$executeRaw(Prisma.sql`
      UPDATE auth_security
      SET lockout_until = NOW() + (${LOCKOUT_MINUTES} * INTERVAL '1 minute'),
          failed_login_attempts = 0,
          updated_at = NOW()
      WHERE email = ${email}
    `)
  }

  await recordAuthEvent({
    eventType: 'LOGIN_FAILED',
    email,
    userId,
    success: false,
    reason,
    ipAddress,
    userAgent,
  })
}

export async function clearFailedLogin(email) {
  await prisma.$executeRaw(Prisma.sql`
    UPDATE auth_security
    SET failed_login_attempts = 0,
        lockout_until = NULL,
        updated_at = NOW()
    WHERE email = ${email}
  `)
}

export async function setMustChangePassword(userId, email, value) {
  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO auth_security (id, email, user_id, must_change_password, updated_at)
    VALUES (${randomUUID()}, ${email}, ${userId}, ${value}, NOW())
    ON CONFLICT (email)
    DO UPDATE SET
      user_id = EXCLUDED.user_id,
      must_change_password = EXCLUDED.must_change_password,
      updated_at = NOW()
  `)
}

export async function getMustChangePassword(userId) {
  const rows = await prisma.$queryRaw(Prisma.sql`
    SELECT must_change_password
    FROM auth_security
    WHERE user_id = ${userId}
    LIMIT 1
  `)

  return Boolean(rows[0]?.must_change_password)
}

export async function recordAuthEvent({ eventType, email, userId, success, reason, ipAddress, userAgent }) {
  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO auth_event_log (id, event_type, email, user_id, success, reason, ip_address, user_agent, created_at)
    VALUES (
      ${randomUUID()},
      ${eventType},
      ${email || null},
      ${userId || null},
      ${success},
      ${reason || null},
      ${ipAddress || null},
      ${userAgent || null},
      NOW()
    )
  `)
}
