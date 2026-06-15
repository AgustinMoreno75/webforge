import { Router } from 'express'
import { z } from 'zod'
import { sendContactEmail } from '../mailer.js'
import { verifyRecaptchaToken } from '../recaptcha.js'

const router = Router()

const serviceValues = ['design', 'development', 'automation-ai']

const contactSchema = z.object({
  nombre: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(120),
  servicio: z.enum(serviceValues),
  mensaje: z.string().trim().min(10).max(2000),
  website: z.string().trim().max(0).optional().or(z.literal('')),
  recaptchaToken: z.string().trim().optional(),
})

router.post('/', async (req, res) => {
  const parsed = contactSchema.safeParse(req.body)

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: 'Datos invalidos. Revisa los campos del formulario.',
      issues: parsed.error.flatten(),
    })
  }

  // Honeypot: bots often fill hidden fields. Return success to avoid signal.
  if (parsed.data.website && parsed.data.website.length > 0) {
    return res.status(200).json({ success: true })
  }

  try {
    const recaptcha = await verifyRecaptchaToken(parsed.data.recaptchaToken, req.ip)
    if (!recaptcha.success) {
      return res.status(400).json({
        success: false,
        message: 'No pudimos validar la solicitud. Intenta nuevamente.',
      })
    }

    await sendContactEmail(parsed.data)
    return res.status(200).json({ success: true })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'No pudimos enviar tu solicitud. Intenta nuevamente en unos minutos.',
      error: error instanceof Error ? error.message : 'unknown_error',
    })
  }
})

export default router
