import nodemailer from 'nodemailer'
import { config } from './config.js'

const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: config.smtp.secure,
  auth: {
    user: config.smtp.user,
    pass: config.smtp.pass,
  },
})

// Color secundario de marca: azul.
const BRAND_BLUE = '#2563eb'
// const BRAND_BLUE_DARK = '#1d4ed8'
const INK = '#0b1d3a'

function layout({ title, accent = BRAND_BLUE, bodyHtml }) {
  return `
    <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;color:${INK};">
      <div style="border-top:4px solid ${accent};border-radius:4px 4px 0 0;"></div>
      <div style="padding:28px 8px;">
        <h2 style="color:${accent};margin:0 0 16px;">${escapeHtml(title)}</h2>
        ${bodyHtml}
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0 12px;"/>
        <p style="color:#94a3b8;font-size:0.8rem;margin:0;">WebForge — Tu ecosistema digital completo</p>
      </div>
    </div>
  `
}

function ctaButton(href, label, accent = BRAND_BLUE) {
  return `<p style="margin:26px 0;">
    <a href="${href}" style="background:${accent};color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:600;display:inline-block;">${escapeHtml(label)}</a>
  </p>`
}

async function deliver({ to, subject, text, html, replyTo }) {
  await transporter.sendMail({
    from: config.mailFrom,
    to,
    replyTo,
    subject,
    text,
    html,
  })
}

export async function sendSmtpTestEmail() {
  await transporter.sendMail({
    from: config.mailFrom,
    to: 'agustinezequielmoreno@gmail.com',
    subject: 'WebForge SMTP Test',
    text: 'SMTP test successful',
    html: 'SMTP test successful',
  })
}

// 1) Formulario de contacto de la home pública → CEO.
export async function sendContactEmail(payload) {
  const { nombre, email, servicio, mensaje } = payload
  const subject = `Nuevo lead WebForge | ${servicio}`
  const text = [
    'Nuevo lead desde formulario WebForge',
    `Nombre: ${nombre}`,
    `Email: ${email}`,
    `Servicio: ${servicio}`,
    'Mensaje:',
    mensaje,
  ].join('\n')

  const html = layout({
    title: 'Nuevo lead desde WebForge',
    bodyHtml: `
      <p><strong>Nombre:</strong> ${escapeHtml(nombre)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p><strong>Servicio:</strong> ${escapeHtml(servicio)}</p>
      <p><strong>Mensaje:</strong></p>
      <p>${escapeHtml(mensaje).replace(/\n/g, '<br/>')}</p>
    `,
  })

  await deliver({ to: config.contactToEmail, replyTo: email, subject, text, html })
}

// 2) Recuperación de contraseña.
export async function sendPasswordResetEmail(toEmail, name, resetUrl) {
  const subject = 'Recupera tu contraseña | WebForge'
  const text = [
    `Hola ${name},`,
    '',
    'Recibimos una solicitud para restablecer la contraseña de tu cuenta WebForge.',
    'Abre el siguiente enlace para crear una nueva contraseña:',
    resetUrl,
    '',
    'Este enlace es válido por 15 minutos.',
    'Si no solicitaste el cambio, puedes ignorar este email.',
  ].join('\n')

  const html = layout({
    title: 'Recupera tu contraseña',
    bodyHtml: `
      <p>Hola <strong>${escapeHtml(name)}</strong>,</p>
      <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta WebForge.</p>
      ${ctaButton(resetUrl, 'Restablecer contraseña')}
      <p style="color:#64748b;font-size:0.875rem;">El enlace expira en <strong>15 minutos</strong>. Si no solicitaste el cambio, ignora este email.</p>
    `,
  })

  await deliver({ to: toEmail, subject, text, html })
}

// 3) Bienvenida (al registrarse como LEAD).
export async function sendWelcomeEmail({ toEmail, name }) {
  const subject = 'Bienvenido a WebForge'
  const plansUrl = `${config.appBaseUrl}/plans.html`
  const text = [
    `Hola ${name},`,
    '',
    'Tu cuenta WebForge fue creada correctamente.',
    'Ya puedes explorar nuestros planes y activar el que mejor se adapte a tu negocio.',
    plansUrl,
    '',
    '— Equipo WebForge',
  ].join('\n')

  const html = layout({
    title: '¡Bienvenido a WebForge!',
    bodyHtml: `
      <p>Hola <strong>${escapeHtml(name)}</strong>,</p>
      <p>Tu cuenta fue creada correctamente. Estás a un paso de poner en marcha tu ecosistema digital.</p>
      <p>Explorá nuestros planes y activá el que mejor se adapte a tu negocio.</p>
      ${ctaButton(plansUrl, 'Ver planes')}
    `,
  })

  await deliver({ to: toEmail, subject, text, html })
}

export async function sendEmailVerificationEmail({ toEmail, name, token }) {
  const verifyUrl = `${config.appBaseUrl}/verify-email.html?token=${encodeURIComponent(token)}`
  const subject = 'Verifica tu correo | WebForge'
  const text = [
    `Hola ${name},`,
    '',
    'Gracias por registrarte en WebForge.',
    'Confirma tu correo electrónico desde el siguiente enlace:',
    verifyUrl,
    '',
    'Este enlace es válido por 24 horas.',
  ].join('\n')

  const html = layout({
    title: 'Verifica tu correo',
    bodyHtml: `
      <p>Hola <strong>${escapeHtml(name)}</strong>,</p>
      <p>Gracias por registrarte en WebForge. Confirmá tu correo electrónico para dejar tu cuenta validada.</p>
      ${ctaButton(verifyUrl, 'Verificar correo')}
      <p style="color:#64748b;font-size:0.875rem;">El enlace expira en <strong>24 horas</strong>.</p>
    `,
  })

  await deliver({ to: toEmail, subject, text, html })
}

// 4) Compra realizada.
export async function sendPurchaseConfirmationEmail({ toEmail, name, planName, amount, currency }) {
  const subject = `Compra confirmada | Plan ${planName}`
  const text = [
    `Hola ${name},`,
    '',
    `Confirmamos la compra del plan ${planName}.`,
    `Monto: ${formatCurrency(amount, currency)}`,
    'En breve activaremos todos los servicios incluidos.',
    '',
    '— Equipo WebForge',
  ].join('\n')

  const html = layout({
    title: 'Compra confirmada',
    bodyHtml: `
      <p>Hola <strong>${escapeHtml(name)}</strong>,</p>
      <p>Confirmamos la compra del plan <strong>${escapeHtml(planName)}</strong>.</p>
      <div style="padding:16px;border-radius:12px;background:#eff6ff;border:1px solid #bfdbfe;">
        <p style="margin:0;"><strong>Plan:</strong> ${escapeHtml(planName)}</p>
        <p style="margin:8px 0 0;"><strong>Monto:</strong> ${escapeHtml(formatCurrency(amount, currency))}</p>
      </div>
      <p style="margin-top:16px;">En breve activaremos todos los servicios incluidos.</p>
    `,
  })

  await deliver({ to: toEmail, subject, text, html })
}

// 5) Plan activado.
export async function sendPlanActivatedEmail({ toEmail, name, planName, planEndDate }) {
  const subject = `Tu plan ${planName} está activo`
  const accountUrl = `${config.appBaseUrl}/cuenta.html`
  const text = [
    `Hola ${name},`,
    '',
    `Tu plan ${planName} ya está activo.`,
    `Próxima renovación: ${formatDate(planEndDate)}`,
    accountUrl,
    '',
    '— Equipo WebForge',
  ].join('\n')

  const html = layout({
    title: 'Plan activado',
    accent: '#16a34a',
    bodyHtml: `
      <p>Hola <strong>${escapeHtml(name)}</strong>,</p>
      <p>Tu plan <strong>${escapeHtml(planName)}</strong> ya se encuentra <strong>activo</strong>.</p>
      <p><strong>Próxima renovación:</strong> ${escapeHtml(formatDate(planEndDate))}</p>
      ${ctaButton(accountUrl, 'Ir a mi panel')}
    `,
  })

  await deliver({ to: toEmail, subject, text, html })
}

export async function sendClientWelcomeEmail({ toEmail, name, planName }) {
  const accountUrl = `${config.appBaseUrl}/cuenta.html`
  const subject = `Bienvenido como cliente WebForge | ${planName}`
  const text = [
    `Hola ${name},`,
    '',
    `Ya formas parte de WebForge como cliente activo con el plan ${planName}.`,
    'Desde tu cuenta podrás seguir el estado de tu servicio y abrir tickets de soporte cuando lo necesites.',
    accountUrl,
  ].join('\n')

  const html = layout({
    title: 'Bienvenido como cliente',
    accent: '#16a34a',
    bodyHtml: `
      <p>Hola <strong>${escapeHtml(name)}</strong>,</p>
      <p>Tu cuenta ya fue activada como <strong>cliente</strong> en WebForge con el plan <strong>${escapeHtml(planName)}</strong>.</p>
      <p>Desde tu panel podrás seguir el estado del servicio, gestionar tu información y abrir tickets de soporte.</p>
      ${ctaButton(accountUrl, 'Ir a mi cuenta', '#16a34a')}
    `,
  })

  await deliver({ to: toEmail, subject, text, html })
}

// 6) Próximo vencimiento.
export async function sendRenewalReminderEmail({ toEmail, name, planName, planEndDate }) {
  const subject = `Tu plan ${planName} está por vencer`
  const accountUrl = `${config.appBaseUrl}/cuenta.html`
  const text = [
    `Hola ${name},`,
    '',
    `Tu plan ${planName} vence el ${formatDate(planEndDate)}.`,
    'Renueva para mantener tus servicios activos sin interrupciones.',
    accountUrl,
    '',
    '— Equipo WebForge',
  ].join('\n')

  const html = layout({
    title: 'Tu plan está por vencer',
    accent: '#f59e0b',
    bodyHtml: `
      <p>Hola <strong>${escapeHtml(name)}</strong>,</p>
      <p>Tu plan <strong>${escapeHtml(planName)}</strong> vence el <strong>${escapeHtml(formatDate(planEndDate))}</strong>.</p>
      <p>Renová para mantener tus servicios activos sin interrupciones.</p>
      ${ctaButton(accountUrl, 'Renovar mi plan')}
    `,
  })

  await deliver({ to: toEmail, subject, text, html })
}

// 7) Plan vencido.
export async function sendPlanExpiredEmail({ toEmail, name, planName }) {
  const subject = `Tu plan ${planName} venció`
  const accountUrl = `${config.appBaseUrl}/cuenta.html`
  const text = [
    `Hola ${name},`,
    '',
    `Tu plan ${planName} venció y los servicios quedaron en pausa.`,
    'Renueva para reactivarlos.',
    accountUrl,
    '',
    '— Equipo WebForge',
  ].join('\n')

  const html = layout({
    title: 'Tu plan venció',
    accent: '#dc2626',
    bodyHtml: `
      <p>Hola <strong>${escapeHtml(name)}</strong>,</p>
      <p>Tu plan <strong>${escapeHtml(planName)}</strong> venció y los servicios quedaron en pausa.</p>
      <p>Renová para reactivarlos cuanto antes.</p>
      ${ctaButton(accountUrl, 'Reactivar mi plan')}
    `,
  })

  await deliver({ to: toEmail, subject, text, html })
}

// 8) Nuevo ticket → CEO.
export async function sendNewTicketEmail({ userName, userEmail, subject, description, ticketId }) {
  const mailSubject = `Nuevo ticket de soporte | ${subject}`
  const text = [
    'Nuevo ticket creado en WebForge.',
    `Cliente: ${userName} (${userEmail})`,
    `Ticket: ${ticketId}`,
    `Asunto: ${subject}`,
    'Descripción:',
    description,
  ].join('\n')

  const html = layout({
    title: 'Nuevo ticket de soporte',
    bodyHtml: `
      <p><strong>Cliente:</strong> ${escapeHtml(userName)} (${escapeHtml(userEmail)})</p>
      <p><strong>Ticket:</strong> ${escapeHtml(ticketId)}</p>
      <p><strong>Asunto:</strong> ${escapeHtml(subject)}</p>
      <p><strong>Descripción:</strong></p>
      <p>${escapeHtml(description).replace(/\n/g, '<br/>')}</p>
    `,
  })

  await deliver({ to: config.contactToEmail, replyTo: userEmail, subject: mailSubject, text, html })
}

export async function sendTicketResolvedEmail({ toEmail, name, subject, ticketId }) {
  const accountUrl = `${config.appBaseUrl}/cuenta.html`
  const mailSubject = `Tu ticket fue resuelto | ${subject}`
  const text = [
    `Hola ${name},`,
    '',
    `Tu ticket ${ticketId} fue marcado como resuelto por el equipo WebForge.`,
    `Asunto: ${subject}`,
    accountUrl,
  ].join('\n')

  const html = layout({
    title: 'Ticket resuelto',
    accent: '#16a34a',
    bodyHtml: `
      <p>Hola <strong>${escapeHtml(name)}</strong>,</p>
      <p>Tu ticket <strong>${escapeHtml(ticketId)}</strong> fue marcado como <strong>resuelto</strong> por el equipo WebForge.</p>
      <p><strong>Asunto:</strong> ${escapeHtml(subject)}</p>
      ${ctaButton(accountUrl, 'Ver mi cuenta', '#16a34a')}
    `,
  })

  await deliver({ to: toEmail, subject: mailSubject, text, html })
}

// 9) Lead convertido a Client → CEO.
export async function sendLeadConvertedEmail({ name, email, planName, amount, currency }) {
  const subject = `Conversión: ${name} contrató el plan ${planName}`
  const text = [
    'Un lead se convirtió en cliente.',
    `Nombre: ${name}`,
    `Email: ${email}`,
    `Plan: ${planName}`,
    `Monto: ${formatCurrency(amount, currency)}`,
  ].join('\n')

  const html = layout({
    title: 'Nuevo cliente convertido',
    accent: '#16a34a',
    bodyHtml: `
      <p>Un lead se convirtió en <strong>cliente</strong>.</p>
      <div style="padding:16px;border-radius:12px;background:#f0fdf4;border:1px solid #bbf7d0;">
        <p style="margin:0;"><strong>Nombre:</strong> ${escapeHtml(name)}</p>
        <p style="margin:8px 0 0;"><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p style="margin:8px 0 0;"><strong>Plan:</strong> ${escapeHtml(planName)}</p>
        <p style="margin:8px 0 0;"><strong>Monto:</strong> ${escapeHtml(formatCurrency(amount, currency))}</p>
      </div>
    `,
  })

  await deliver({ to: config.contactToEmail, subject, text, html })
}

// 10) Solicitud de compra de un lead → CEO (notificación interna para activar manualmente).
export async function sendPurchaseRequestEmail({ name, email, phone, planName }) {
  const subject = `Solicitud de plan: ${name} quiere ${planName}`
  const text = [
    'Un usuario solicitó contratar un plan.',
    `Nombre: ${name}`,
    `Email: ${email}`,
    `Teléfono: ${phone}`,
    `Plan solicitado: ${planName}`,
    'Activá el plan desde el panel de administración cuando se confirme el pago.',
  ].join('\n')

  const html = layout({
    title: 'Solicitud de contratación',
    bodyHtml: `
      <p>Un usuario solicitó contratar un plan.</p>
      <div style="padding:16px;border-radius:12px;background:#eff6ff;border:1px solid #bfdbfe;">
        <p style="margin:0;"><strong>Nombre:</strong> ${escapeHtml(name)}</p>
        <p style="margin:8px 0 0;"><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p style="margin:8px 0 0;"><strong>Teléfono:</strong> ${escapeHtml(phone)}</p>
        <p style="margin:8px 0 0;"><strong>Plan solicitado:</strong> ${escapeHtml(planName)}</p>
      </div>
      <p style="margin-top:16px;">Activá el plan desde el panel de administración cuando se confirme el pago.</p>
    `,
  })

  await deliver({ to: config.contactToEmail, replyTo: email, subject, text, html })
}

function formatDate(value) {
  if (!value) return 'Sin fecha'
  return new Date(value).toLocaleDateString('es-AR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatCurrency(value, currency = 'ARS') {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: currency || 'ARS',
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}
