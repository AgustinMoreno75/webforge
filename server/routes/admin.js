import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { activatePlanForUser } from '../lib/accountService.js'
import { sendSmtpTestEmail } from '../mailer.js'
import { isPurchasablePlan, PLAN_CATALOG, PURCHASABLE_PLAN_CODES } from '../lib/plans.js'

const router = Router()

const ACCOUNT_TYPES = ['CEO', 'SUPER_ADMIN', 'LEAD', 'CLIENT']
const PLANS = ['NONE', 'STARTER', 'PREMIUM', 'BUSINESS']
const STATUSES = ['PENDING', 'ACTIVE', 'EXPIRED', 'SUSPENDED', 'CANCELLED']

// Solo CEO y SUPER_ADMIN acceden al panel.
router.use(requireAuth, requireRole(['CEO', 'SUPER_ADMIN']))

router.get('/test-email', async (_req, res) => {
  try {
    await sendSmtpTestEmail()
    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('SMTP test email failed:', error)
    return res.status(500).json({ success: false, error: error?.message || 'Unknown error' })
  }
})

function serializeUser(user) {
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
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
}

const listQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  id: z.string().trim().max(40).optional(),
  name: z.string().trim().max(120).optional(),
  email: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(40).optional(),
  accountType: z.enum(ACCOUNT_TYPES).optional(),
  plan: z.enum(PLANS).optional(),
  status: z.enum(STATUSES).optional(),
})

// Tabla avanzada con filtros + búsqueda rápida.
router.get('/users', async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: 'Filtros invalidos.' })
  }

  const f = parsed.data
  const where = {}

  if (f.q) {
    where.OR = [
      { name: { contains: f.q, mode: 'insensitive' } },
      { email: { contains: f.q, mode: 'insensitive' } },
      { phone: { contains: f.q, mode: 'insensitive' } },
      { id: { contains: f.q } },
    ]
  }
  if (f.id) where.id = f.id
  if (f.name) where.name = { contains: f.name, mode: 'insensitive' }
  if (f.email) where.email = { contains: f.email, mode: 'insensitive' }
  if (f.phone) where.phone = { contains: f.phone, mode: 'insensitive' }
  if (f.accountType) where.accountType = f.accountType
  if (f.plan) where.plan = f.plan
  if (f.status) where.status = f.status

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 500,
  })

  return res.status(200).json({ success: true, total: users.length, users: users.map(serializeUser) })
})

// Resumen para tarjetas del panel.
router.get('/stats', async (_req, res) => {
  const [total, leads, clients, active, pending, expired, suspended, cancelled, activeByPlanRows, openTickets] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { accountType: 'LEAD' } }),
    prisma.user.count({ where: { accountType: 'CLIENT' } }),
    prisma.user.count({ where: { status: 'ACTIVE' } }),
    prisma.user.count({ where: { status: 'PENDING' } }),
    prisma.user.count({ where: { status: 'EXPIRED' } }),
    prisma.user.count({ where: { status: 'SUSPENDED' } }),
    prisma.user.count({ where: { status: 'CANCELLED' } }),
    prisma.user.groupBy({
      by: ['plan'],
      where: { status: 'ACTIVE', plan: { in: PURCHASABLE_PLAN_CODES } },
      _count: { _all: true },
    }),
    prisma.ticket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
  ])

  const activeByPlan = PURCHASABLE_PLAN_CODES.reduce((acc, code) => {
    acc[code] = 0
    return acc
  }, {})

  for (const row of activeByPlanRows) {
    if (!row.plan || !(row.plan in activeByPlan)) continue
    activeByPlan[row.plan] = row._count._all
  }

  const monthlyRevenue = PURCHASABLE_PLAN_CODES.reduce((totalRevenue, code) => {
    const count = activeByPlan[code] || 0
    return totalRevenue + count * PLAN_CATALOG[code].price
  }, 0)

  return res.status(200).json({
    success: true,
    stats: { total, leads, clients, active, pending, expired, suspended, cancelled, openTickets, activeByPlan, monthlyRevenue },
  })
})

const activateSchema = z.object({
  plan: z.string().trim().refine((value) => isPurchasablePlan(value), { message: 'Plan invalido.' }),
})

// Activación manual del plan (flujo de compra Lead → Client con sus emails).
router.post('/users/:id/activate', async (req, res) => {
  const parsed = activateSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: 'Plan invalido.' })
  }

  try {
    const user = await activatePlanForUser({ userId: req.params.id, planCode: parsed.data.plan })
    return res.status(200).json({ success: true, message: 'Plan activado y cliente convertido.', user: serializeUser(user) })
  } catch (error) {
    if (error.code === 'USER_NOT_FOUND') {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' })
    }
    if (error.code === 'INVALID_PLAN') {
      return res.status(400).json({ success: false, message: 'Plan invalido.' })
    }
    throw error
  }
})

const updateUserSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    phone: z.string().trim().min(5).max(40).nullable().optional(),
    accountType: z.enum(ACCOUNT_TYPES).optional(),
    plan: z.enum(PLANS).optional(),
    status: z.enum(STATUSES).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, { message: 'Nada para actualizar.' })

// Acción administrativa: editar campos clave del usuario.
router.patch('/users/:id', async (req, res) => {
  const parsed = updateUserSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: 'Datos invalidos.' })
  }

  const existing = await prisma.user.findUnique({ where: { id: req.params.id } })
  if (!existing) {
    return res.status(404).json({ success: false, message: 'Usuario no encontrado.' })
  }

  const data = {}
  if (parsed.data.name !== undefined) data.name = parsed.data.name
  if (parsed.data.phone !== undefined) data.phone = parsed.data.phone
  if (parsed.data.accountType !== undefined) data.accountType = parsed.data.accountType
  if (parsed.data.plan !== undefined) data.plan = parsed.data.plan
  if (parsed.data.status !== undefined) data.status = parsed.data.status
  if (parsed.data.isActive !== undefined) data.isActive = parsed.data.isActive

  const user = await prisma.user.update({ where: { id: req.params.id }, data })
  return res.status(200).json({ success: true, message: 'Usuario actualizado.', user: serializeUser(user) })
})

// Eliminar usuario (no se puede eliminar la propia cuenta).
router.delete('/users/:id', async (req, res) => {
  if (req.params.id === req.user.sub) {
    return res.status(400).json({ success: false, message: 'No puedes eliminar tu propia cuenta.' })
  }

  const existing = await prisma.user.findUnique({ where: { id: req.params.id } })
  if (!existing) {
    return res.status(404).json({ success: false, message: 'Usuario no encontrado.' })
  }

  await prisma.user.delete({ where: { id: req.params.id } })
  return res.status(200).json({ success: true, message: 'Usuario eliminado.' })
})

export default router
