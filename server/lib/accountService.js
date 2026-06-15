import { prisma } from './prisma.js'
import { getPlan, computePlanEndDate } from './plans.js'
import {
  sendPurchaseConfirmationEmail,
  sendPlanActivatedEmail,
  sendClientWelcomeEmail,
  sendLeadConvertedEmail,
  sendRenewalReminderEmail,
  sendPlanExpiredEmail,
} from '../mailer.js'

async function safeSend(fn) {
  try {
    await fn()
  } catch (error) {
    console.error('No se pudo enviar un email transaccional:', error?.message || error)
  }
}

function planNameOf(code) {
  return getPlan(code)?.name || code
}

// Flujo de compra: convierte un Lead en Client, activa el plan y registra fechas.
// Reutilizado por la activación manual del admin/CEO.
export async function activatePlanForUser({ userId, planCode }) {
  const plan = getPlan(planCode)
  if (!plan) {
    const error = new Error('Plan invalido.')
    error.code = 'INVALID_PLAN'
    throw error
  }

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    const error = new Error('Usuario no encontrado.')
    error.code = 'USER_NOT_FOUND'
    throw error
  }

  const now = new Date()
  const planEndDate = computePlanEndDate(now, plan.code)

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      accountType: 'CLIENT',
      plan: plan.code,
      status: 'ACTIVE',
      planStartDate: now,
      planEndDate,
      lastPaymentDate: now,
    },
  })

  await safeSend(() =>
    sendPurchaseConfirmationEmail({
      toEmail: updated.email,
      name: updated.name,
      planName: plan.name,
      amount: plan.price,
      currency: plan.currency,
    }),
  )
  await safeSend(() =>
    sendPlanActivatedEmail({
      toEmail: updated.email,
      name: updated.name,
      planName: plan.name,
      planEndDate,
    }),
  )
  await safeSend(() =>
    sendClientWelcomeEmail({
      toEmail: updated.email,
      name: updated.name,
      planName: plan.name,
    }),
  )
  await safeSend(() =>
    sendLeadConvertedEmail({
      name: updated.name,
      email: updated.email,
      planName: plan.name,
      amount: plan.price,
      currency: plan.currency,
    }),
  )

  return updated
}

// Renovación de un plan vigente (extiende la fecha de vencimiento).
export async function renewPlanForUser({ userId, planCode }) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    const error = new Error('Usuario no encontrado.')
    error.code = 'USER_NOT_FOUND'
    throw error
  }

  const code = planCode || user.plan
  const plan = getPlan(code)
  if (!plan) {
    const error = new Error('Plan invalido.')
    error.code = 'INVALID_PLAN'
    throw error
  }

  const now = new Date()
  const base = user.planEndDate && user.planEndDate > now ? user.planEndDate : now
  const planEndDate = computePlanEndDate(base, plan.code)

  return prisma.user.update({
    where: { id: userId },
    data: {
      accountType: 'CLIENT',
      plan: plan.code,
      status: 'ACTIVE',
      planEndDate,
      lastPaymentDate: now,
    },
  })
}

export async function cancelPlanForUser({ userId }) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    const error = new Error('Usuario no encontrado.')
    error.code = 'USER_NOT_FOUND'
    throw error
  }

  return prisma.user.update({
    where: { id: userId },
    data: { status: 'CANCELLED' },
  })
}

// Job diario: vence planes pasados de fecha y envía recordatorios próximos a vencer.
export async function processPlanLifecycle({ reminderDays = 3 } = {}) {
  const now = new Date()
  const soon = new Date(now.getTime() + reminderDays * 24 * 60 * 60 * 1000)

  const expired = await prisma.user.findMany({
    where: {
      status: 'ACTIVE',
      plan: { not: 'NONE' },
      planEndDate: { lt: now },
    },
  })

  for (const user of expired) {
    await prisma.user.update({ where: { id: user.id }, data: { status: 'EXPIRED' } })
    await safeSend(() =>
      sendPlanExpiredEmail({ toEmail: user.email, name: user.name, planName: planNameOf(user.plan) }),
    )
  }

  const dueSoon = await prisma.user.findMany({
    where: {
      status: 'ACTIVE',
      plan: { not: 'NONE' },
      planEndDate: { gte: now, lte: soon },
    },
  })

  for (const user of dueSoon) {
    await safeSend(() =>
      sendRenewalReminderEmail({
        toEmail: user.email,
        name: user.name,
        planName: planNameOf(user.plan),
        planEndDate: user.planEndDate,
      }),
    )
  }

  return { expired: expired.length, reminded: dueSoon.length }
}
