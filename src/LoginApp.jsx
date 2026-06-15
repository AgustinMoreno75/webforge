import { useEffect, useRef, useState } from 'react'

const TOKEN_KEY = 'webforge_token'
const USER_KEY = 'webforge_user'
const GOOGLE_SCRIPT_ID = 'google-gsi-client'

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

function getRedirectTarget(result) {
  const pendingPlan = sessionStorage.getItem('webforge_pending_plan')
  if (pendingPlan) {
    sessionStorage.removeItem('webforge_pending_plan')
    return '/plans.html'
  }

  const role = result?.user?.accountType
  if (role === 'CEO' || role === 'SUPER_ADMIN') {
    return '/admin.html'
  }

  return '/cuenta.html'
}

export default function LoginApp() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitLabel, setSubmitLabel] = useState('Entrar')
  const [formStatus, setFormStatus] = useState({ message: '', type: '' })
  const [showVerificationHelp, setShowVerificationHelp] = useState(false)
  const [verifyStatus, setVerifyStatus] = useState({ message: '', type: '' })
  const [isResendingVerification, setIsResendingVerification] = useState(false)
  const [forgotOpen, setForgotOpen] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotStatus, setForgotStatus] = useState({ message: '', type: '' })
  const [isSendingReset, setIsSendingReset] = useState(false)
  const [googleNote, setGoogleNote] = useState('Google Sign-In no disponible.')
  const googleContainerRef = useRef(null)
  const redirectTimeoutRef = useRef(null)
  const postSuccessTimeoutRef = useRef(null)

  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) {
        window.clearTimeout(redirectTimeoutRef.current)
      }
      if (postSuccessTimeoutRef.current) {
        window.clearTimeout(postSuccessTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const initializeGoogle = async () => {
      try {
        const response = await fetch('/api/auth/google/config', {
          headers: { Accept: 'application/json' },
        })
        const result = await parseApiResponse(response)

        if (!response.ok || !result.enabled || !result.clientId) {
          setGoogleNote('Google Sign-In no disponible en este entorno.')
          return
        }

        const initButton = () => {
          if (cancelled || !window.google?.accounts?.id || !googleContainerRef.current) {
            setGoogleNote('Google Sign-In no disponible en este entorno.')
            return
          }

          window.google.accounts.id.initialize({
            client_id: result.clientId,
            callback: async (googleResponse) => {
              setFormStatus({ message: 'Validando Google Sign-In...', type: '' })
              setShowVerificationHelp(false)

              try {
                const authResponse = await fetch('/api/auth/google', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                  },
                  body: JSON.stringify({ credential: googleResponse.credential }),
                })
                const authResult = await parseApiResponse(authResponse)

                if (!authResponse.ok || !authResult.success || !authResult.token) {
                  throw new Error(getHttpErrorMessage(authResponse, authResult, 'No se pudo ingresar con Google.'))
                }

                localStorage.setItem(TOKEN_KEY, authResult.token)
                localStorage.setItem(USER_KEY, JSON.stringify(authResult.user || {}))
                setFormStatus({ message: 'Credenciales verificadas', type: 'ok' })
                postSuccessTimeoutRef.current = window.setTimeout(() => {
                  setFormStatus({ message: 'Redirigiendo...', type: 'ok' })
                  redirectTimeoutRef.current = window.setTimeout(() => {
                    window.location.href = getRedirectTarget(authResult)
                  }, 500)
                }, 350)
              } catch (error) {
                setFormStatus({ message: error.message || 'Error con Google Sign-In.', type: 'error' })
              }
            },
          })

          googleContainerRef.current.innerHTML = ''
          window.google.accounts.id.renderButton(googleContainerRef.current, {
            type: 'standard',
            theme: 'outline',
            text: 'continue_with',
            shape: 'pill',
            size: 'large',
            width: 320,
          })
          setGoogleNote('Tambien puedes entrar con Google.')
        }

        const existingScript = document.getElementById(GOOGLE_SCRIPT_ID)
        if (existingScript) {
          initButton()
          return
        }

        const script = document.createElement('script')
        script.id = GOOGLE_SCRIPT_ID
        script.src = 'https://accounts.google.com/gsi/client'
        script.async = true
        script.defer = true
        script.onload = initButton
        script.onerror = () => {
          setGoogleNote('Google Sign-In no disponible en este entorno.')
        }
        document.body.appendChild(script)
      } catch {
        if (!cancelled) {
          setGoogleNote('Google Sign-In no disponible en este entorno.')
        }
      }
    }

    initializeGoogle()

    return () => {
      cancelled = true
    }
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!email.trim() || !password) {
      setFormStatus({ message: 'Completa email y contrasena.', type: 'error' })
      return
    }

    setIsSubmitting(true)
    setSubmitLabel('Validando credenciales...')
    setFormStatus({ message: 'Validando credenciales...', type: '' })
    setShowVerificationHelp(false)
    setVerifyStatus({ message: '', type: '' })

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      })

      const result = await parseApiResponse(response)

      if (!response.ok && result?.code === 'EMAIL_NOT_VERIFIED') {
        setShowVerificationHelp(true)
      }

      if (!response.ok || !result.success || !result.token) {
        throw new Error(getHttpErrorMessage(response, result, 'No se pudo iniciar sesion.'))
      }

      localStorage.setItem(TOKEN_KEY, result.token)
      localStorage.setItem(USER_KEY, JSON.stringify(result.user || {}))
      setFormStatus({ message: 'Credenciales verificadas', type: 'ok' })
      setSubmitLabel('Credenciales verificadas')

      postSuccessTimeoutRef.current = window.setTimeout(() => {
        setFormStatus({ message: 'Redirigiendo...', type: 'ok' })
        setSubmitLabel('Redirigiendo...')
        redirectTimeoutRef.current = window.setTimeout(() => {
          window.location.href = getRedirectTarget(result)
        }, 500)
      }, 350)
    } catch (error) {
      setIsSubmitting(false)
      setSubmitLabel('Entrar')
      setFormStatus({ message: error.message || 'Error de autenticacion.', type: 'error' })
    }
  }

  const handleResendVerification = async () => {
    const normalizedEmail = email.trim()
    if (!normalizedEmail) {
      setVerifyStatus({ message: 'Ingresa tu email para reenviar la verificacion.', type: 'error' })
      return
    }

    setIsResendingVerification(true)
    setVerifyStatus({ message: '', type: '' })

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ email: normalizedEmail }),
      })
      const result = await parseApiResponse(response)

      if (!response.ok || !result.success) {
        throw new Error(getHttpErrorMessage(response, result, 'No se pudo reenviar el email de verificacion.'))
      }

      setVerifyStatus({
        message: result.message || 'Si la cuenta existe, reenviamos el correo de verificacion.',
        type: 'ok',
      })
    } catch (error) {
      setVerifyStatus({
        message: error.message || 'Error al reenviar el email de verificacion.',
        type: 'error',
      })
    } finally {
      setIsResendingVerification(false)
    }
  }

  const handleForgotToggle = () => {
    if (!forgotOpen && !forgotEmail && email.trim()) {
      setForgotEmail(email.trim())
    }
    setForgotStatus({ message: '', type: '' })
    setForgotOpen((currentValue) => !currentValue)
  }

  const handleSendReset = async () => {
    const normalizedEmail = forgotEmail.trim()
    if (!normalizedEmail) {
      setForgotStatus({ message: 'Ingresa tu email.', type: 'error' })
      return
    }

    setIsSendingReset(true)
    setForgotStatus({ message: '', type: '' })

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ email: normalizedEmail }),
      })
      const result = await parseApiResponse(response)

      setForgotStatus({
        message: result.message || 'Si tu email esta registrado, recibiras instrucciones.',
        type: 'ok',
      })
    } catch {
      setForgotStatus({ message: 'Error al enviar. Intenta nuevamente.', type: 'error' })
    } finally {
      setIsSendingReset(false)
    }
  }

  return (
    <main className="login-shell" aria-label="Login WebForge">
      <a className="brand" href="/" aria-label="Volver a WebForge">
        <img src="/assets/WebForgeLogo-NoBackground.png" alt="WebForge" />
        <strong>WebForge</strong>
      </a>

      <h1>Iniciar sesion</h1>
      <p>Accede a tu panel WebForge.</p>

      <form id="login-form" noValidate onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <div>
          <label htmlFor="password">Contrasena</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        <button className="submit" type="submit" disabled={isSubmitting}>
          {submitLabel}
        </button>
        <p className={`form-status ${formStatus.type}`.trim()} aria-live="polite">{formStatus.message}</p>
      </form>

      <div className={`verify-box ${showVerificationHelp ? 'visible' : ''}`.trim()} aria-live="polite">
        <p>Si tu correo todavia no esta verificado, te reenviamos el enlace a ese mismo email.</p>
        <button
          id="verify-btn"
          type="button"
          onClick={handleResendVerification}
          disabled={isResendingVerification}
        >
          {isResendingVerification ? 'Reenviando...' : 'Reenviar email de verificacion'}
        </button>
        <p className={`verify-status ${verifyStatus.type}`.trim()}>{verifyStatus.message}</p>
      </div>

      <button className="forgot-link" type="button" onClick={handleForgotToggle}>
        {forgotOpen ? 'Cancelar' : 'Olvidaste tu contrasena?'}
      </button>

      <div className={`forgot-box ${forgotOpen ? 'visible' : ''}`.trim()} aria-live="polite">
        <p>Ingresa tu email y te enviaremos un enlace para restablecer tu contrasena.</p>
        <input
          type="email"
          id="forgot-email"
          placeholder="tu@email.com"
          maxLength="120"
          autoComplete="email"
          value={forgotEmail}
          onChange={(event) => setForgotEmail(event.target.value)}
        />
        <button type="button" onClick={handleSendReset} disabled={isSendingReset}>
          {isSendingReset ? 'Enviando...' : 'Enviar enlace'}
        </button>
        <p className={`forgot-status ${forgotStatus.type}`.trim()}>{forgotStatus.message}</p>
      </div>

      <p className="micro-link">No tienes cuenta? <a href="/register.html">Crear Cuenta</a></p>

      <div className="separator">o</div>
      <div className="google-area" ref={googleContainerRef}></div>
      <p className="google-note">{googleNote}</p>

      <a className="back-link" href="/">Volver al sitio</a>
    </main>
  )
}