import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { OAuth2Client } from 'google-auth-library'
import { randomBytes } from 'node:crypto'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import {
  signAccessToken,
  signEmailVerificationToken,
  signResetToken,
  verifyEmailVerificationToken,
  verifyResetToken,
} from '../lib/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { config } from '../config.js'
import { sendEmailVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail } from '../mailer.js'
import {
  clearFailedLogin,
  getMustChangePassword,
  isEmailLocked,
  recordAuthEvent,
  registerFailedLogin,
  setMustChangePassword,
} from '../lib/securityStore.js'

const router = Router()

const registerSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    fullName: z.string().trim().min(2).max(100).optional(),
    email: z.string().trim().email().max(120),
    phone: z.string().trim().min(5).max(30),
    password: z.string().min(8).max(72),
    termsAccepted: z.literal(true),
  })
  .refine((data) => Boolean(data.name || data.fullName), {
    message: 'El nombre es obligatorio.',
    path: ['name'],
  })

const loginSchema = z.object({
  email: z.string().trim().email().max(120),
  password: z.string().min(8).max(72),
})

const googleSchema = z.object({
  credential: z.string().min(1),
})

const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  fullName: z.string().trim().min(2).max(100).optional(),
  phone: z.string().trim().min(5).max(30).nullable().optional(),
  email: z.string().trim().email().max(120).optional(),
})

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(72),
})

const forgotPasswordSchema = z.object({
  email: z.string().trim().email(),
})

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8).max(72),
})

const verifyEmailSchema = z.object({
  token: z.string().min(1),
})

const resendVerificationSchema = z.object({
  email: z.string().trim().email().max(120),
})

const googleClient = config.google.clientId ? new OAuth2Client(config.google.clientId) : null

function getDisplayNameFromEmail(email) {
  return email.split('@')[0]
}

function buildUserPayload(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    emailVerifiedAt: user.emailVerifiedAt,
    phone: user.phone,
    accountType: user.accountType,
    plan: user.plan,
    status: user.status,
    planStartDate: user.planStartDate,
    planEndDate: user.planEndDate,
    lastPaymentDate: user.lastPaymentDate,
    createdAt: user.createdAt,
  }
}

async function sendVerificationForUser(user) {
  await sendEmailVerificationEmail({
    toEmail: user.email,
    name: user.name,
    token: signEmailVerificationToken({ id: user.id, email: user.email }),
  })
}

async function issueAuthResponse(user, res) {
  const mustChangePassword = await getMustChangePassword(user.id)
  const token = signAccessToken({
    id: user.id,
    name: user.name,
    email: user.email,
    accountType: user.accountType,
    mustChangePassword,
  })

  return res.status(200).json({
    success: true,
    token,
    user: { ...buildUserPayload(user), mustChangePassword },
  })
}

router.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body)

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: 'Datos invalidos para registro.',
      issues: parsed.error.flatten(),
    })
  }

  const email = parsed.data.email.toLowerCase()
  const name = (parsed.data.name || parsed.data.fullName).trim()

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return res.status(409).json({
      success: false,
      message: 'Ya existe una cuenta con ese email.',
    })
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12)

  // Flujo de registro: todo usuario nuevo nace como LEAD / NONE / PENDING.
  const user = await prisma.user.create({
    data: {
      name,
      email,
      phone: parsed.data.phone || null,
      passwordHash,
      accountType: 'LEAD',
      plan: 'NONE',
      status: 'PENDING',
    },
  })

  await setMustChangePassword(user.id, email, false)
  await recordAuthEvent({
    eventType: 'REGISTER',
    email,
    userId: user.id,
    success: true,
    reason: 'New lead registered',
    ipAddress: req.ip,
    userAgent: req.get('user-agent') || '',
  })

  try {
    await sendVerificationForUser(user)
  } catch (error) {
    console.error('No se pudo enviar el email de verificación:', error?.message || error)
  }

  return issueAuthResponse(user, res)
})

router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body)

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: 'Credenciales invalidas.',
    })
  }

  const email = parsed.data.email.toLowerCase()
  const lockStatus = await isEmailLocked(email)

  if (lockStatus.locked) {
    await recordAuthEvent({
      eventType: 'LOGIN_BLOCKED_LOCKOUT',
      email,
      success: false,
      reason: `Blocked due to lockout (${lockStatus.minutesLeft}m left)`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || '',
    })

    return res.status(423).json({
      success: false,
      message: `Cuenta bloqueada temporalmente. Intenta nuevamente en ${lockStatus.minutesLeft} minutos.`,
    })
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !user.isActive) {
    await registerFailedLogin({
      email,
      userId: user?.id,
      reason: !user ? 'User not found' : 'User inactive',
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || '',
    })
    return res.status(401).json({
      success: false,
      message: 'Email o contrasena incorrectos.',
    })
  }

  const isValidPassword = await bcrypt.compare(parsed.data.password, user.passwordHash)
  if (!isValidPassword) {
    await registerFailedLogin({
      email,
      userId: user.id,
      reason: 'Invalid password',
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || '',
    })
    return res.status(401).json({
      success: false,
      message: 'Email o contrasena incorrectos.',
    })
  }

  await clearFailedLogin(email)

  if (!user.emailVerifiedAt) {
    await recordAuthEvent({
      eventType: 'LOGIN_BLOCKED_UNVERIFIED',
      email,
      userId: user.id,
      success: false,
      reason: 'Email not verified',
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || '',
    })

    return res.status(403).json({
      success: false,
      code: 'EMAIL_NOT_VERIFIED',
      message: 'Debes verificar tu correo antes de iniciar sesion. Revisa tu bandeja o reenvia el email de verificacion.',
    })
  }

  await recordAuthEvent({
    eventType: 'LOGIN_SUCCESS',
    email,
    userId: user.id,
    success: true,
    reason: 'Login success',
    ipAddress: req.ip,
    userAgent: req.get('user-agent') || '',
  })

  return issueAuthResponse(user, res)
})

router.post('/verify-email', async (req, res) => {
  const parsed = verifyEmailSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: 'Token inválido.' })
  }

  try {
    const payload = verifyEmailVerificationToken(parsed.data.token)
    const user = await prisma.user.findUnique({ where: { id: payload.sub } })

    if (!user || user.email !== payload.email) {
      return res.status(404).json({ success: false, message: 'No encontramos la cuenta a verificar.' })
    }

    if (user.emailVerifiedAt) {
      return res.status(200).json({ success: true, message: 'Tu correo ya estaba verificado.' })
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerifiedAt: new Date() },
    })

    return res.status(200).json({ success: true, message: 'Correo verificado correctamente.' })
  } catch {
    return res.status(400).json({ success: false, message: 'El enlace de verificación es inválido o expiró.' })
  }
})

router.post('/resend-verification', async (req, res) => {
  const parsed = resendVerificationSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: 'Email inválido.' })
  }

  const email = parsed.data.email.toLowerCase()
  const user = await prisma.user.findUnique({ where: { email } })

  if (user && user.isActive && !user.emailVerifiedAt) {
    try {
      await sendVerificationForUser(user)
    } catch (error) {
      console.error('No se pudo reenviar el email de verificación:', error?.message || error)
    }
  }

  return res.status(200).json({
    success: true,
    message: 'Si existe una cuenta pendiente de verificacion, te reenviamos el correo.',
  })
})

router.get('/google/config', (_req, res) => {
  return res.status(200).json({
    success: true,
    enabled: Boolean(config.google.clientId),
    clientId: config.google.clientId,
  })
})

router.post('/google', async (req, res) => {
  if (!googleClient || !config.google.clientId) {
    return res.status(503).json({
      success: false,
      message: 'Google Sign-In no esta configurado en el servidor.',
    })
  }

  const parsed = googleSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: 'Token de Google invalido.',
    })
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: parsed.data.credential,
      audience: config.google.clientId,
    })

    const payload = ticket.getPayload()
    const rawEmail = payload?.email || ''
    const email = rawEmail.toLowerCase()

    if (!payload || !payload.email_verified || !email) {
      return res.status(401).json({
        success: false,
        message: 'No se pudo verificar la cuenta de Google.',
      })
    }

    let user = await prisma.user.findUnique({ where: { email } })
    let isNewUser = false
    if (!user) {
      isNewUser = true
      const name = (payload.name || getDisplayNameFromEmail(email)).trim()
      const passwordHash = await bcrypt.hash(randomBytes(24).toString('hex'), 12)

      user = await prisma.user.create({
        data: {
          name,
          email,
          emailVerifiedAt: new Date(),
          passwordHash,
          accountType: 'LEAD',
          plan: 'NONE',
          status: 'PENDING',
        },
      })

      await setMustChangePassword(user.id, user.email, false)
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Tu cuenta esta desactivada.',
      })
    }

    if (isNewUser) {
      try {
        await sendWelcomeEmail({ toEmail: user.email, name: user.name })
      } catch (error) {
        console.error('No se pudo enviar el email de bienvenida:', error?.message || error)
      }
    }

    return issueAuthResponse(user, res)
  } catch {
    return res.status(401).json({
      success: false,
      message: 'No se pudo validar Google Sign-In.',
    })
  }
})

router.get('/me', requireAuth, async (req, res) => {
  const userId = req.user.sub
  const user = await prisma.user.findUnique({ where: { id: userId } })

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'Usuario no encontrado.',
    })
  }

  const mustChangePassword = await getMustChangePassword(user.id)

  return res.status(200).json({
    success: true,
    user: { ...buildUserPayload(user), mustChangePassword },
  })
})

router.patch('/profile', requireAuth, async (req, res) => {
  const parsed = updateProfileSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: 'Datos invalidos.' })
  }

  const userId = req.user.sub
  const data = {}

  const newName = parsed.data.name || parsed.data.fullName
  if (newName) data.name = newName.trim()

  if (parsed.data.phone !== undefined) {
    data.phone = parsed.data.phone ? parsed.data.phone.trim() : null
  }

  if (parsed.data.email) {
    const email = parsed.data.email.toLowerCase()
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing && existing.id !== userId) {
      return res.status(409).json({ success: false, message: 'Ese email ya esta en uso por otra cuenta.' })
    }
    data.email = email
    data.emailVerifiedAt = null
  }

  if (Object.keys(data).length === 0) {
    return res.status(400).json({ success: false, message: 'No hay cambios para guardar.' })
  }

  const user = await prisma.user.update({ where: { id: userId }, data })

  if (data.email) {
    try {
      await sendVerificationForUser(user)
    } catch (error) {
      console.error('No se pudo enviar el email de verificación:', error?.message || error)
    }
  }

  const newToken = signAccessToken({
    id: user.id,
    name: user.name,
    email: user.email,
    accountType: user.accountType,
  })

  return res.status(200).json({
    success: true,
    message: 'Perfil actualizado.',
    token: newToken,
    user: buildUserPayload(user),
  })
})

router.patch('/password', requireAuth, async (req, res) => {
  const parsed = changePasswordSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: 'Datos invalidos.' })
  }

  const userId = req.user.sub
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    return res.status(404).json({ success: false, message: 'Usuario no encontrado.' })
  }

  const isValid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash)
  if (!isValid) {
    return res.status(401).json({ success: false, message: 'La contrasena actual es incorrecta.' })
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12)
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } })
  await setMustChangePassword(userId, user.email, false)

  return res.status(200).json({ success: true, message: 'Contrasena actualizada correctamente.' })
})

router.post('/forgot-password', async (req, res) => {
  const parsed = forgotPasswordSchema.safeParse(req.body)
  // Always respond 200 to avoid leaking user existence
  if (!parsed.success) {
    return res.status(200).json({ success: true, message: 'Si tu email esta registrado, recibiras instrucciones.' })
  }

  try {
    const email = parsed.data.email.toLowerCase()
    const user = await prisma.user.findUnique({ where: { email } })

    if (user && user.isActive) {
      const resetToken = signResetToken(user.id)
      const resetUrl = `${config.appOrigin}/reset-password.html?token=${resetToken}`
      await sendPasswordResetEmail(email, user.name, resetUrl)
    }
  } catch {
    // silently ignore errors to avoid leaking info
  }

  return res.status(200).json({ success: true, message: 'Si tu email esta registrado, recibiras instrucciones.' })
})

router.post('/reset-password', async (req, res) => {
  const parsed = resetPasswordSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: 'Token o contrasena invalidos.' })
  }

  try {
    const payload = verifyResetToken(parsed.data.token)
    const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12)
    await prisma.user.update({ where: { id: payload.sub }, data: { passwordHash } })
    return res.status(200).json({ success: true, message: 'Contrasena restablecida correctamente.' })
  } catch {
    return res.status(401).json({ success: false, message: 'El enlace expiro o es invalido. Solicita uno nuevo.' })
  }
})

export default router
