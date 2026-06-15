import { config } from './config.js'

export async function verifyRecaptchaToken(token, remoteIp) {
  if (!config.recaptcha.enabled) {
    return { success: true, score: 1 }
  }

  if (!token) {
    return { success: false, reason: 'missing_token' }
  }

  const params = new URLSearchParams()
  params.set('secret', config.recaptcha.secretKey)
  params.set('response', token)
  if (remoteIp) {
    params.set('remoteip', remoteIp)
  }

  const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  })

  if (!response.ok) {
    return { success: false, reason: 'provider_error' }
  }

  const data = await response.json()
  if (!data.success) {
    return { success: false, reason: 'validation_failed' }
  }

  if (typeof data.score === 'number' && data.score < config.recaptcha.scoreThreshold) {
    return { success: false, reason: 'low_score', score: data.score }
  }

  return { success: true, score: typeof data.score === 'number' ? data.score : 1 }
}
