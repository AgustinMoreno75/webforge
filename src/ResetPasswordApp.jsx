import { useMemo, useRef, useState } from 'react'

function parseApiResponse(response) {
  return response.text().then((raw) => {
    const contentType = response.headers.get('content-type') || ''

    if (!contentType.includes('application/json')) {
      return {
        success: false,
        message: raw.trim() || `Respuesta no JSON del servidor (HTTP ${response.status}).`,
      }
    }

    if (!raw) {
      return {
        success: false,
        message: `Respuesta vacia del servidor (HTTP ${response.status}).`,
      }
    }

    try {
      return JSON.parse(raw)
    } catch {
      return {
        success: false,
        message: `JSON invalido del servidor (HTTP ${response.status}).`,
      }
    }
  })
}

function getStrengthMeta(value) {
  let score = 0
  if (value.length >= 8) score += 1
  if (value.length >= 12) score += 1
  if (/[A-Z]/.test(value)) score += 1
  if (/[0-9]/.test(value)) score += 1
  if (/[^A-Za-z0-9]/.test(value)) score += 1

  const levels = [
    { width: '20%', color: '#ff4d5a', text: 'Muy débil' },
    { width: '40%', color: '#ff8a3d', text: 'Débil' },
    { width: '60%', color: '#facc15', text: 'Regular' },
    { width: '80%', color: '#22c1c3', text: 'Fuerte' },
    { width: '100%', color: '#22c55e', text: 'Muy fuerte' },
  ]

  if (!value.length) {
    return { width: '0%', color: 'rgba(255,255,255,0.3)', text: '—' }
  }

  return levels[Math.min(score, 4)]
}

export default function ResetPasswordApp() {
  const token = useMemo(() => new URLSearchParams(window.location.search).get('token'), [])
  const [formValues, setFormValues] = useState({ newPassword: '', confirmPassword: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitLabel, setSubmitLabel] = useState('Restablecer contraseña')
  const [status, setStatus] = useState({ message: '', type: '' })
  const [isInvalidToken, setIsInvalidToken] = useState(!token)
  const redirectTimeoutRef = useRef(null)
  const strengthMeta = getStrengthMeta(formValues.newPassword)

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormValues((currentValue) => ({
      ...currentValue,
      [name]: value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (formValues.newPassword.length < 8) {
      setStatus({ message: 'La contraseña debe tener al menos 8 caracteres.', type: 'error' })
      return
    }

    if (formValues.newPassword !== formValues.confirmPassword) {
      setStatus({ message: 'Las contraseñas no coinciden.', type: 'error' })
      return
    }

    setIsSubmitting(true)
    setSubmitLabel('Restableciendo...')
    setStatus({ message: '', type: '' })

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ token, newPassword: formValues.newPassword }),
      })
      const result = await parseApiResponse(response)

      if (!response.ok || !result.success) {
        if (response.status === 401) {
          setIsInvalidToken(true)
          return
        }

        throw new Error(result.message || 'Error al restablecer.')
      }

      setStatus({ message: 'Contraseña restablecida correctamente.', type: 'ok' })
      setSubmitLabel('Redirigiendo...')
      redirectTimeoutRef.current = window.setTimeout(() => {
        window.location.href = '/login.html'
      }, 2500)
    } catch (error) {
      setIsSubmitting(false)
      setSubmitLabel('Restablecer contraseña')
      setStatus({ message: error.message || 'Error al restablecer.', type: 'error' })
    }
  }

  if (isInvalidToken) {
    return (
      <div className="shell">
        <a className="brand" href="/">
          <img src="/assets/WebForgeLogo-NoBackground.png" alt="WebForge" />
          <strong>WebForge</strong>
        </a>

        <div className="error-state">
          <div className="icon">⚠️</div>
          <h1>Enlace inválido</h1>
          <p>Este enlace expiró o ya fue utilizado. Solicitá uno nuevo desde la página de login.</p>
          <a className="back-link" href="/login.html">← Volver al login</a>
        </div>
      </div>
    )
  }

  return (
    <div className="shell">
      <a className="brand" href="/">
        <img src="/assets/WebForgeLogo-NoBackground.png" alt="WebForge" />
        <strong>WebForge</strong>
      </a>

      <div>
        <h1>Nueva contraseña</h1>
        <p className="subtitle">Elegí una contraseña segura para tu cuenta WebForge.</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="newPassword">Nueva contraseña</label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              placeholder="Mín. 8 caracteres"
              minLength="8"
              maxLength="72"
              value={formValues.newPassword}
              onChange={handleChange}
            />
            <div className="strength-bar-wrap">
              <div
                className="strength-bar"
                style={{ width: strengthMeta.width, background: strengthMeta.color }}
              ></div>
            </div>
            <span className="strength-label" style={{ color: strengthMeta.color }}>{strengthMeta.text}</span>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirmar contraseña</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="Repetí la nueva contraseña"
              maxLength="72"
              value={formValues.confirmPassword}
              onChange={handleChange}
            />
          </div>

          <button className="btn-submit" type="submit" disabled={isSubmitting}>{submitLabel}</button>
          <p className={`status-msg ${status.type}`.trim()} aria-live="polite">{status.message}</p>
          <a className="back-link" href="/login.html">← Volver al login</a>
        </form>
      </div>
    </div>
  )
}