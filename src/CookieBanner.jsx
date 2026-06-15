import { useState, useEffect } from 'react'

const COOKIE_KEY = 'webforge_cookies_consent'

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_KEY)
    if (!consent) {
      // Small delay so the banner slides in after page loads
      const t = setTimeout(() => setVisible(true), 900)
      return () => clearTimeout(t)
    }
  }, [])

  if (!visible) return null

  function acceptAll() {
    localStorage.setItem(COOKIE_KEY, 'all')
    setVisible(false)
  }

  function acceptEssential() {
    localStorage.setItem(COOKIE_KEY, 'essential')
    setVisible(false)
  }

  return (
    <div className={`cookie-banner${visible ? ' cookie-banner--visible' : ''}`} role="dialog" aria-label="Aviso de cookies" aria-live="polite">
      <div className="cookie-inner">
        <div className="cookie-main">
          <span className="cookie-emoji" aria-hidden="true">🍪</span>
          <div className="cookie-text">
            <p className="cookie-title">Usamos cookies</p>
            <p className="cookie-body">
              Utilizamos cookies esenciales para el funcionamiento del sitio y cookies de terceros (chatbot, Google Sign-In) para mejorar tu experiencia.{' '}
              <button className="cookie-link" onClick={() => setExpanded(v => !v)}>
                {expanded ? 'Ocultar detalles' : 'Ver detalles'}
              </button>
            </p>

            {expanded && (
              <div className="cookie-details">
                <div className="cookie-detail-row">
                  <div>
                    <strong>Esenciales</strong>
                    <span>Sesión, preferencias, seguridad. Siempre activas.</span>
                  </div>
                  <span className="cookie-badge cookie-badge--on">Siempre</span>
                </div>
                <div className="cookie-detail-row">
                  <div>
                    <strong>Funcionales</strong>
                    <span>Google Sign-In, chatbot Chatbase.</span>
                  </div>
                  <span className="cookie-badge cookie-badge--opt">Opcionales</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="cookie-actions">
          <button className="cookie-btn-secondary" onClick={acceptEssential}>
            Solo esenciales
          </button>
          <button className="cookie-btn-primary" onClick={acceptAll}>
            Aceptar todo
          </button>
        </div>
      </div>
    </div>
  )
}
