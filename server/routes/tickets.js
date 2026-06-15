import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { sendNewTicketEmail, sendTicketResolvedEmail } from '../mailer.js'

const router = Router()

const OPEN_STATES = ['OPEN', 'IN_PROGRESS']
const ticketStatusValues = ['OPEN', 'IN_PROGRESS', 'CLOSED']

const createTicketSchema = z.object({
  subject: z.string().trim().min(3).max(140),
  description: z.string().trim().min(10).max(3000),
})

const updateTicketSchema = z.object({
  status: z.enum(ticketStatusValues),
})

function serializeTicket(ticket) {
  return {
    id: ticket.id,
    subject: ticket.subject,
    description: ticket.description,
    status: ticket.status,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
    user: ticket.user
      ? { id: ticket.user.id, name: ticket.user.name, email: ticket.user.email }
      : undefined,
  }
}

// Tickets del usuario autenticado.
router.get('/mine', requireAuth, async (req, res) => {
  const tickets = await prisma.ticket.findMany({
    where: { userId: req.user.sub },
    orderBy: { createdAt: 'desc' },
  })

  return res.status(200).json({ success: true, tickets: tickets.map(serializeTicket) })
})

// Crear ticket: máximo 1 abierto (OPEN o IN_PROGRESS) por usuario. Notifica al CEO.
router.post('/', requireAuth, async (req, res) => {
  const parsed = createTicketSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: 'Datos del ticket invalidos.', issues: parsed.error.flatten() })
  }

  const openTicket = await prisma.ticket.findFirst({
    where: { userId: req.user.sub, status: { in: OPEN_STATES } },
  })

  if (openTicket) {
    return res.status(409).json({
      success: false,
      message: 'Ya tienes un ticket abierto. Espera a que se resuelva antes de crear otro.',
    })
  }

  const user = await prisma.user.findUnique({ where: { id: req.user.sub } })
  if (!user) {
    return res.status(404).json({ success: false, message: 'Usuario no encontrado.' })
  }

  const ticket = await prisma.ticket.create({
    data: {
      userId: user.id,
      subject: parsed.data.subject,
      description: parsed.data.description,
      status: 'OPEN',
    },
  })

  try {
    await sendNewTicketEmail({
      userName: user.name,
      userEmail: user.email,
      subject: ticket.subject,
      description: ticket.description,
      ticketId: ticket.id,
    })
  } catch (error) {
    console.error('No se pudo notificar el ticket al CEO:', error?.message || error)
  }

  return res.status(201).json({ success: true, message: 'Ticket creado correctamente.', ticket: serializeTicket(ticket) })
})

// Listado completo (solo CEO / SUPER_ADMIN).
router.get('/', requireAuth, requireRole(['CEO', 'SUPER_ADMIN']), async (req, res) => {
  const { status } = req.query
  const where = {}
  if (status && ticketStatusValues.includes(String(status))) {
    where.status = String(status)
  }

  const tickets = await prisma.ticket.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { id: true, name: true, email: true } } },
  })

  return res.status(200).json({ success: true, tickets: tickets.map(serializeTicket) })
})

// Cambiar estado (solo CEO / SUPER_ADMIN).
router.patch('/:id', requireAuth, requireRole(['CEO', 'SUPER_ADMIN']), async (req, res) => {
  const parsed = updateTicketSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: 'Estado invalido.' })
  }

  const existing = await prisma.ticket.findUnique({ where: { id: req.params.id } })
  if (!existing) {
    return res.status(404).json({ success: false, message: 'Ticket no encontrado.' })
  }

  const ticket = await prisma.ticket.update({
    where: { id: req.params.id },
    data: { status: parsed.data.status },
    include: { user: { select: { id: true, name: true, email: true } } },
  })

  if (parsed.data.status === 'CLOSED' && existing.status !== 'CLOSED' && ticket.user?.email) {
    try {
      await sendTicketResolvedEmail({
        toEmail: ticket.user.email,
        name: ticket.user.name,
        subject: ticket.subject,
        ticketId: ticket.id,
      })
    } catch (error) {
      console.error('No se pudo enviar el email de ticket resuelto:', error?.message || error)
    }
  }

  return res.status(200).json({ success: true, message: 'Ticket actualizado.', ticket: serializeTicket(ticket) })
})

export default router
