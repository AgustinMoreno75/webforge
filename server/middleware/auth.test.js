import test from 'node:test'
import assert from 'node:assert/strict'
import { requireRole } from './auth.js'

test('requireRole allows request when accountType matches', () => {
  const middleware = requireRole(['CEO', 'SUPER_ADMIN'])
  const req = { user: { accountType: 'CEO' } }
  let calledNext = false

  const res = {
    status() {
      throw new Error('status should not be called on allowed request')
    },
  }

  middleware(req, res, () => {
    calledNext = true
  })

  assert.equal(calledNext, true)
})

test('requireRole returns 403 when accountType does not match', () => {
  const middleware = requireRole(['CEO', 'SUPER_ADMIN'])
  const req = { user: { accountType: 'CLIENT' } }
  let statusCode = 0
  let body = null

  const res = {
    status(code) {
      statusCode = code
      return {
        json(payload) {
          body = payload
          return payload
        },
      }
    },
  }

  middleware(req, res, () => {
    throw new Error('next should not be called when role is denied')
  })

  assert.equal(statusCode, 403)
  assert.equal(body?.success, false)
})
