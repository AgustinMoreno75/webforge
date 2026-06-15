import { useEffect, useState } from 'react'

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

export default function VerifyEmailApp() {
  const [status, setStatus] = useState({
    message: 'Procesando enlace...',
    tone: '',
    title: 'Verificando tu correo',
    subtitle: 'Estamos confirmando tu dirección de email en WebForge.',
  })

  useEffect(() => {
    let cancelled = false

    const verifyEmail = async () => {
      const token = new URLSearchParams(window.location.search).get('token')

      if (!token) {
        if (!cancelled) {
          setStatus({
            message: 'Falta el token de verificación.',
            tone: 'err',
            title: 'No pudimos verificar tu correo',
            subtitle: 'Necesitas abrir el enlace completo enviado por WebForge.',
          })
        }
        return
      }

      try {
        const response = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({ token }),
        })
        const result = await parseApiResponse(response)

        if (!response.ok || !result.success) {
          throw new Error(result.message || 'No pudimos verificar tu correo.')
        }

        if (!cancelled) {
          setStatus({
            message: result.message || 'Correo verificado correctamente.',
            tone: 'ok',
            title: 'Correo verificado',
            subtitle: 'Tu cuenta ya puede iniciar sesión normalmente en WebForge.',
          })
        }
      } catch (error) {
        if (!cancelled) {
          setStatus({
            message: error.message || 'No pudimos verificar tu correo.',
            tone: 'err',
            title: 'No pudimos verificar tu correo',
            subtitle: 'El enlace puede haber expirado o ya haber sido utilizado.',
          })
        }
      }
    }

    verifyEmail()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main className="verify-card">
      <h1>{status.title}</h1>
      <p className="muted">{status.subtitle}</p>
      <div className={`status ${status.tone}`.trim()} aria-live="polite">{status.message}</div>
      <div className="actions">
        <a className="btn btn-primary" href="/login.html">Ir a login</a>
        <a className="btn" href="/">Volver al sitio</a>
      </div>
    </main>
  )
}