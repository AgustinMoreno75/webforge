import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { listPublicPlans, getPlan } from '../lib/plans.js'
import { cancelPlanForUser } from '../lib/accountService.js'
import { sendPurchaseRequestEmail } from '../mailer.js'

const router = Router()

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    accountType: user.accountType,
    plan: user.plan,
    status: user.status,
    planStartDate: user.planStartDate,
    planEndDate: user.planEndDate,
    lastPaymentDate: user.lastPaymentDate,
  }
}

const requestSchema = z.object({
  plan: z.string().trim().min(2),
})

// Catálogo público de planes (consumido por plans.html y las homes).
router.get('/plans', (_req, res) => {
  return res.status(200).json({ success: true, plans: listPublicPlans() })
})

// Un Lead/Client solicita contratar (o mejorar) un plan. Notifica al CEO para activación manual.
router.post('/request', requireAuth, async (req, res) => {
  const parsed = requestSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: 'Plan invalido.' })
  }

  const plan = getPlan(parsed.data.plan)
  if (!plan) {
    return res.status(400).json({ success: false, message: 'Plan invalido.' })
  }

  const user = await prisma.user.findUnique({ where: { id: req.user.sub } })
  if (!user) {
    return res.status(404).json({ success: false, message: 'Usuario no encontrado.' })
  }

  if (!user.phone || String(user.phone).trim().length < 5) {
    return res.status(400).json({
      success: false,
      message: 'Necesitamos tu telefono para procesar la solicitud. Actualizalo en tu perfil antes de elegir un plan.',
    })
  }

  try {
    await sendPurchaseRequestEmail({
      name: user.name,
      email: user.email,
      phone: user.phone,
      planName: plan.name,
    })
  } catch (error) {
    console.error('No se pudo enviar la solicitud de plan:', error?.message || error)
  }

  return res.status(200).json({
    success: true,
    message: 'Solicitud enviada. Te contactaremos para activar tu plan.',
  })
})

// Un Client cancela su plan.
router.post('/cancel', requireAuth, requireRole(['CLIENT']), async (req, res) => {
  try {
    const updated = await cancelPlanForUser({ userId: req.user.sub })
    return res.status(200).json({ success: true, message: 'Tu plan fue cancelado.', user: publicUser(updated) })
  } catch (error) {
    if (error.code === 'USER_NOT_FOUND') {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' })
    }
    throw error
  }
})

export default router
