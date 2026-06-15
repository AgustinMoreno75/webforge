import jwt from 'jsonwebtoken'
import { config } from '../config.js'

export function signAccessToken(user) {
  const payload = {
    sub: user.id,
    email: user.email,
    accountType: user.accountType,
    name: user.name,
  }

  if (typeof user.mustChangePassword === 'boolean') payload.mustChangePassword = user.mustChangePassword

  return jwt.sign(
    payload,
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  )
}

export function verifyAccessToken(token) {
  return jwt.verify(token, config.jwt.secret)
}

export function signResetToken(userId) {
  return jwt.sign(
    { sub: userId, type: 'password_reset' },
    config.jwt.secret,
    { expiresIn: '15m' }
  )
}

export function verifyResetToken(token) {
  const payload = jwt.verify(token, config.jwt.secret)
  if (payload.type !== 'password_reset') throw new Error('Invalid token type')
  return payload
}

export function signEmailVerificationToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, type: 'email_verification' },
    config.jwt.secret,
    { expiresIn: '24h' },
  )
}

export function verifyEmailVerificationToken(token) {
  const payload = jwt.verify(token, config.jwt.secret)
  if (payload.type !== 'email_verification') throw new Error('Invalid token type')
  return payload
}
