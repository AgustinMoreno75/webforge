import { useEffect, useRef, useState } from 'react'

const TOKEN_KEY = 'webforge_token'
const USER_KEY = 'webforge_user'
const PENDING_PLAN_KEY = 'webforge_pending_plan'

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

function getHttpErrorMessage(response, result, fallbackMessage) {
  if (result?.message) {
    return result.message
  }

  if (response.status === 502 || response.status === 503) {
    return 'El backend no esta disponible. Inicia el servidor API y vuelve a intentar.'
  }

  return fallbackMessage
}

function redirectByRole(result) {
  const role = result?.user?.accountType
  if (role === 'CEO' || role === 'SUPER_ADMIN') {
    return '/admin.html'
  }

  return '/cuenta.html'
}

export default function RegisterApp() {
  const [formValues, setFormValues] = useState({
    fullName: '',
    phone: '',
    email: '',
    password: '',
    termsAccepted: false,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitLabel, setSubmitLabel] = useState('Crear Cuenta')
  const [status, setStatus] = useState({ message: '', type: '' })
  const redirectTimeoutRef = useRef(null)
  const finalStatusTimeoutRef = useRef(null)

  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) {
        window.clearTimeout(redirectTimeoutRef.current)
      }
      if (finalStatusTimeoutRef.current) {
        window.clearTimeout(finalStatusTimeoutRef.current)
      }
    }
  }, [])

  const handleChange = (event) => {
    const { name, type, checked, value } = event.target
    setFormValues((currentValue) => ({
      ...currentValue,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setStatus({ message: '', type: '' })

    const payload = {
      name: formValues.fullName.trim(),
      phone: formValues.phone.trim(),
      email: formValues.email.trim(),
      password: formValues.password,
      termsAccepted: formValues.termsAccepted,
    }

    if (!payload.termsAccepted) {
      setStatus({ message: 'Debes aceptar los terminos y condiciones.', type: 'error' })
      return
    }

    setIsSubmitting(true)
    setSubmitLabel('Creando cuenta...')
    setStatus({ message: 'Creando cuenta...', type: '' })

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const result = await parseApiResponse(response)
      if (!response.ok || !result.success || !result.token) {
        throw new Error(getHttpErrorMessage(response, result, 'No se pudo crear la cuenta.'))
      }

      localStorage.setItem(TOKEN_KEY, result.token)
      localStorage.setItem(USER_KEY, JSON.stringify(result.user || {}))
      setStatus({ message: 'Cuenta creada correctamente.', type: 'ok' })
      setSubmitLabel('Cuenta creada correctamente')

      finalStatusTimeoutRef.current = window.setTimeout(() => {
        setStatus({ message: 'Redirigiendo...', type: 'ok' })
        setSubmitLabel('Redirigiendo...')
        redirectTimeoutRef.current = window.setTimeout(() => {
          const pendingPlan = sessionStorage.getItem(PENDING_PLAN_KEY)
          if (pendingPlan) {
            sessionStorage.removeItem(PENDING_PLAN_KEY)
            window.location.href = '/plans.html'
            return
          }

          window.location.href = redirectByRole(result)
        }, 500)
      }, 350)
    } catch (error) {
      setIsSubmitting(false)
      setSubmitLabel('Crear Cuenta')
      setStatus({ message: error.message || 'Error de registro.', type: 'error' })
    }
  }

  return (
    <main className="register-shell" aria-label="Registro WebForge">
      <a className="brand" href="/" aria-label="Volver a WebForge">
        <img src="/assets/WebForgeLogo-NoBackground.png" alt="WebForge" />
        <strong>WebForge</strong>
      </a>

      <h1>Crear Cuenta</h1>
      <p>Crea tu cuenta para activar tu plan y gestionar tus servicios.</p>

      <form noValidate onSubmit={handleSubmit}>
        <div>
          <label htmlFor="fullName">Nombre completo</label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            required
            minLength="2"
            value={formValues.fullName}
            onChange={handleChange}
          />
        </div>

        <div>
          <label htmlFor="phone">Teléfono</label>
          <input
            id="phone"
            name="phone"
            type="tel"
            placeholder="+54 9 ..."
            required
            minLength="5"
            value={formValues.phone}
            onChange={handleChange}
          />
        </div>

        <div className="register-grid">
          <div>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={formValues.email}
              onChange={handleChange}
            />
          </div>

          <div>
            <label htmlFor="password">Contrasena</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength="8"
              value={formValues.password}
              onChange={handleChange}
            />
          </div>
        </div>

        <label className="terms" htmlFor="termsAccepted">
          <input
            id="termsAccepted"
            name="termsAccepted"
            type="checkbox"
            checked={formValues.termsAccepted}
            onChange={handleChange}
            required
          />
          <span>Acepto los <a href="/terminos.html" target="_blank" rel="noopener">terminos y condiciones</a>.</span>
        </label>

        <button className="submit" type="submit" disabled={isSubmitting}>
          {submitLabel}
        </button>
        <p className={`status ${status.type}`.trim()} aria-live="polite">{status.message}</p>
      </form>

      <div className="separator">o</div>
      <div className="google-area" aria-hidden="true"></div>
      <p className="google-note">Registro con Google no disponible con la configuración de seguridad actual.</p>

      <a className="back-link" href="/login.html">Ya tengo cuenta</a>
    </main>
  )
}