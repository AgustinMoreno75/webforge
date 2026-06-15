import { useEffect, useRef, useState } from 'react'

const TOKEN_KEY = 'webforge_token'
const USER_KEY = 'webforge_user'
const PENDING_PLAN_KEY = 'webforge_pending_plan'
const VALID_PLAN_CODES = ['starter', 'premium', 'business']

const PLAN_CARDS = [
  {
    code: 'starter',
    className: 'plan-starter',
    title: 'Starter',
    badge: 'Base',
    description: 'Ideal para negocios que necesitan presencia digital profesional y un sistema inicial de crecimiento.',
    priceBefore: '$ 49.900',
    price: '$ 34.900',
    note: 'Solicitud asistida con activación personalizada por el equipo WebForge.',
    features: [
      'Sitio web profesional (hasta 5 secciones)',
      'Hosting, dominio y certificado SSL',
      'Mantenimiento y actualizaciones mensuales',
      'Backups y seguridad del sitio',
      'Formulario de contacto y botón de WhatsApp',
      'SEO básico y conexión con Google',
      'Panel básico para editar contenido',
      '1 cambio o actualización mensual',
      'Soporte técnico estándar',
    ],
    disclaimer: 'El precio de la creacion de los sistemas no esta contemplado en el precio del plan.',
  },
  {
    code: 'premium',
    className: 'plan-premium',
    title: 'Premium',
    badge: 'Más elegido',
    description: 'Pensado para empresas en crecimiento que necesitan sistemas digitales integrados y escalables.',
    priceBefore: '$ 79.900',
    price: '$ 59.900',
    note: 'Plan recomendado para operaciones en expansión.',
    features: [
      'Todo lo del plan Starter',
      'Sistema de reservas / turnos / pedidos',
      'Blog o catálogo de productos',
      'Automatizaciones básicas (emails, formularios, WhatsApp)',
      'Integraciones con redes sociales y herramientas externas',
      'Analíticas avanzadas y reportes mensuales',
      'SEO intermedio y optimización de velocidad',
      'Hasta 3 cambios o actualizaciones mensuales',
      'Soporte prioritario',
    ],
    insight: 'La mejor relación entre velocidad de ejecución y escalabilidad.',
    disclaimer: 'El precio de la creacion de los sistemas no esta contemplado en el precio del plan.',
  },
  {
    code: 'business',
    className: 'plan-business',
    title: 'Business',
    badge: 'Enterprise',
    description: 'Para equipos que necesitan arquitectura robusta, procesos complejos y evolutivos de alto impacto.',
    priceBefore: '$ 119.900',
    price: '$ 89.900',
    note: 'Implementación integral con foco en performance operativa.',
    features: [
      'Todo lo del plan Premium',
      'Automatizaciones avanzadas y sistemas personalizados',
      'Integraciones con APIs, CRM o sistemas externos',
      'Dashboard y panel administrativo avanzado',
      'Desarrollo continuo de nuevas funcionalidades',
      'Consultoría tecnológica y reuniones estratégicas',
      'Infraestructura escalable y optimización avanzada',
      'Cambios y mejoras mensuales prioritarias',
      'Soporte dedicado y SLA de respuesta',
    ],
    disclaimer: 'El precio de la creacion de los sistemas no esta contemplado en el precio del plan.',
  },
]

const BUILD_PRICES = [
  ['Landing Page', '$ 59.900'],
  ['Sitio Web Básico', '$ 99.900'],
  ['Sitio Web Avanzado', '$ 149.900'],
  ['Tienda Online', '$ 199.900'],
]

const FAQS = [
  ['¿Cuál es la diferencia entre los tres planes?', 'Starter es ideal para presencia digital inicial con automatización básica. Premium añade sistema de reservas, blog, automatizaciones avanzadas e integraciones con redes sociales. Business incluye automatizaciones sin límite, APIs y arquitectura custom para operaciones complejas. Ver la tabla de comparación arriba para detalles completos.'],
  ['¿Qué incluyen todos los planes?', 'Todos los planes incluyen: sitio web profesional, hosting, dominio y certificado SSL, mantenimiento mensual, backups y seguridad, formulario de contacto y botón WhatsApp, SEO básico, panel de edición de contenido, y soporte técnico. Los planes Premium y Business amplían estas características significativamente.'],
  ['¿Cuántas automatizaciones incluye cada plan?', 'Starter incluye 1 flujo de automatización básico. Premium permite hasta 3 flujos de automatización (emails, formularios, WhatsApp). Business incluye automatizaciones avanzadas sin límite de cantidad, ideales para operaciones complejas.'],
  ['¿Qué tipo de integraciones ofrece cada plan?', 'Starter ofrece integraciones básicas (formulario y WhatsApp). Premium integra con redes sociales y herramientas externas comunes. Business incluye integraciones con APIs, CRM, sistemas legacy y arquitectura enterprise personalizada.'],
  ['¿Premium incluye un blog o catálogo?', 'Sí. Premium incluye blog o catálogo de productos según tu necesidad. Esto es perfecto para empresas que necesitan mostrar productos, servicios o contenido editorial. Starter no incluye esto; Business lo puede personalizar completamente según tu arquitectura.'],
  ['¿Cuántos cambios mensuales puedo hacer?', 'Starter permite 1 cambio o actualización mensual. Premium permite hasta 3 cambios mensuales. Business permite cambios y mejoras mensuales prioritarias con desarrollo continuo. Esto es ideal si tu negocio evoluciona rápidamente.'],
  ['¿Qué se incluye en los reportes y analíticas?', 'Starter incluye panel básico de métricas. Premium ofrece analíticas avanzadas con reportes mensuales detallados. Business proporciona analíticas avanzadas más consultoría estratégica sobre tus datos. Todos ayudan a entender el performance de tu sitio.'],
  ['¿Cómo funciona el soporte técnico?', 'Starter ofrece soporte técnico estándar para resolver problemas. Premium incluye soporte prioritario con respuesta rápida. Business incluye soporte dedicado con SLA de respuesta garantizado. Mientras mayor apoyo necesites, mejor es el plan.'],
  ['¿Puedo pasar a un plan superior?', 'Sí. Puedes comenzar con Starter y escalar a Premium o directamente a Business cuando tu empresa crece. El cambio de plan es flexible y se adapta a tus necesidades. Te acompañaremos en la transición sin interrupciones.'],
  ['¿Qué plan recomiendan para una empresa en crecimiento?', 'Para empresas en crecimiento, Premium es la opción ideal: ofrece la mejor relación entre funcionalidad y costo. Incluye automatizaciones múltiples, integraciones modernas, analíticas avanzadas y soporte prioritario. Muchas empresas comienzan en Starter y escalan a Premium en 6-12 meses.'],
]

function getStoredAuthState() {
  return {
    token: localStorage.getItem(TOKEN_KEY) || '',
    storedUser: localStorage.getItem(USER_KEY) || '',
  }
}

export default function PlansApp() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [authState, setAuthState] = useState(() => getStoredAuthState())
  const [messageState, setMessageState] = useState({ visible: false, tone: 'default', text: '' })
  const messageTimeoutRef = useRef(null)

  const showMessage = (text, tone = 'default') => {
    if (messageTimeoutRef.current) {
      window.clearTimeout(messageTimeoutRef.current)
    }

    setMessageState({ visible: true, tone, text })

    messageTimeoutRef.current = window.setTimeout(() => {
      setMessageState((currentValue) => ({
        ...currentValue,
        visible: false,
      }))

      window.setTimeout(() => {
        setMessageState({ visible: false, tone: 'default', text: '' })
      }, 240)

      messageTimeoutRef.current = null
    }, 4200)
  }

  const requestPlan = async (planCode) => {
    const currentToken = localStorage.getItem(TOKEN_KEY)

    if (!currentToken) {
      sessionStorage.setItem(PENDING_PLAN_KEY, planCode)
      window.location.href = '/login.html'
      return
    }

    try {
      const response = await fetch('/api/billing/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${currentToken}`,
        },
        body: JSON.stringify({ plan: planCode }),
      })

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
        sessionStorage.setItem(PENDING_PLAN_KEY, planCode)
        window.location.href = '/login.html'
        return
      }

      const result = await response.json().catch(() => ({}))
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'No se pudo enviar la solicitud.')
      }

      showMessage(result.message || 'Solicitud enviada. Te contactaremos para activar tu plan.', 'success')
    } catch (error) {
      showMessage(error.message || 'No se pudo enviar la solicitud.', 'error')
    }
  }

  useEffect(() => {
    window.scrollTo(0, 0)

    return () => {
      if (messageTimeoutRef.current) {
        window.clearTimeout(messageTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 1080) {
        setMenuOpen(false)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  useEffect(() => {
    const revealItems = document.querySelectorAll('.reveal-item')

    if (!('IntersectionObserver' in window)) {
      revealItems.forEach((element) => element.classList.add('is-revealed'))
      return undefined
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed')
          observer.unobserve(entry.target)
        }
      })
    }, { rootMargin: '200px 0px 200px 0px', threshold: 0 })

    revealItems.forEach((element) => observer.observe(element))

    return () => {
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    const nextAuthState = getStoredAuthState()
    setAuthState(nextAuthState)

    const pendingPlan = sessionStorage.getItem(PENDING_PLAN_KEY)
    if (nextAuthState.token && pendingPlan && VALID_PLAN_CODES.includes(pendingPlan)) {
      sessionStorage.removeItem(PENDING_PLAN_KEY)
      requestPlan(pendingPlan)
    }
  }, [])

  const closeMenuOnMobile = () => {
    if (window.innerWidth <= 1080) {
      setMenuOpen(false)
    }
  }

  const authHref = authState.token && authState.storedUser ? '/cuenta.html' : '/login.html'
  const authLabel = authState.token && authState.storedUser ? 'Cuenta' : 'Login'

  return (
    <>
      <header className={`site-header${menuOpen ? ' menu-open' : ''}`} id="top">
        <div className="header-container">
          <a className="brand" href="/index.html#inicio" aria-label="WebForge inicio" onClick={closeMenuOnMobile}>
            <img src="/assets/WebForgeLogo-NoBackground.png" alt="WebForge" className="brand-logo" />
            <div className="brand-copy">
              <span className="brand-name">WebForge</span>
              <span className="brand-tag">Ecosistema Tecnológico</span>
            </div>
          </a>

          <button
            className="nav-toggle"
            type="button"
            aria-expanded={menuOpen}
            aria-controls="primary-nav"
            aria-label="Abrir menú de navegación"
            onClick={() => setMenuOpen((currentValue) => !currentValue)}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>

          <nav className="main-nav" aria-label="Navegación principal">
            <ul className="nav-list" id="primary-nav">
              <li><a href="/index.html#inicio" onClick={closeMenuOnMobile}>Inicio</a></li>
              <li><a href="/index.html#servicios" onClick={closeMenuOnMobile}>Servicios</a></li>
              <li><a href="/index.html#soluciones" onClick={closeMenuOnMobile}>Soluciones</a></li>
              <li><a href="/plans.html" className="menu-active" onClick={closeMenuOnMobile}>Planes</a></li>
              <li><a href="/index.html#contacto" onClick={closeMenuOnMobile}>Contacto</a></li>
              <li className="nav-mobile-item">
                <a href={authHref} className="header-login nav-mobile-login" onClick={closeMenuOnMobile}>{authLabel}</a>
              </li>
            </ul>
          </nav>

          <div className="header-actions" aria-label="Acciones de usuario">
            <a href={authHref} className="header-login">{authLabel}</a>
            <a href="/index.html#contacto" className="header-cta" data-cta="header_diagnostico_plans">Agendar diagnóstico</a>
          </div>
        </div>
      </header>

      <main aria-label="Contenido principal">
        <section className="plans-hero" aria-labelledby="plans-title">
          <div className="plans-hero-shell reveal-item">
            <p className="plans-kicker">Planes WebForge</p>
            <h1 id="plans-title">Elegí el plan que mejor se adapta al ritmo de tu empresa</h1>
            <p>Todos los planes incluyen acompañamiento técnico y enfoque en resultados. Comienza con Starter, escala con Premium o implementa nivel corporativo con Business.</p>
          </div>
        </section>

        <section className="plans-section" aria-label="Planes de suscripción">
          <div className="plans-grid">
            {PLAN_CARDS.map((plan) => (
              <article key={plan.code} className={`plan-card ${plan.className} reveal-item`} aria-labelledby={`${plan.code}-title`}>
                <div className="plan-topline">
                  <h2 id={`${plan.code}-title`}>{plan.title}</h2>
                  <span className="plan-badge">{plan.badge}</span>
                </div>
                <p className="plan-description">{plan.description}</p>
                <p className="plan-price-before">{plan.priceBefore}</p>
                <p className="plan-price">{plan.price} <span>/ mes</span></p>
                <p className="plan-note">{plan.note}</p>
                <a
                  href="#"
                  className="plan-cta"
                  data-cta={`plan_${plan.code}_checkout`}
                  data-plan-code={plan.code}
                  onClick={(event) => {
                    event.preventDefault()
                    requestPlan(plan.code)
                  }}
                >
                  {`Elegir ${plan.title}`}
                </a>
                <ul className="plan-features" aria-label={`Características ${plan.title}`}>
                  {plan.features.map((feature) => (
                    <li key={feature}>{feature === 'Todo lo del plan Starter' || feature === 'Todo lo del plan Premium' ? <strong>{feature}</strong> : feature}</li>
                  ))}
                </ul>
                {plan.insight ? <p className="plan-insight">{plan.insight}</p> : null}
                <p className="plan-disclaimer">{plan.disclaimer}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="plans-compare reveal-item" aria-labelledby="compare-title">
          <div className="plans-compare-shell">
            <p className="plans-kicker">Comparativa rápida</p>
            <h2 id="compare-title">Qué incluye cada plan</h2>
            <div className="compare-table-wrap">
              <table className="compare-table">
                <thead>
                  <tr>
                    <th>Característica</th>
                    <th>Starter</th>
                    <th>Premium</th>
                    <th>Business</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td>Sitio web profesional</td><td>Hasta 5 secciones</td><td>Todo Starter +</td><td>Todo Premium +</td></tr>
                  <tr><td>Hosting, dominio y SSL</td><td>✓ Incluido</td><td>✓ Incluido</td><td>✓ Incluido</td></tr>
                  <tr><td>Automatizaciones</td><td>1 flujo básico</td><td>Hasta 3 flujos</td><td>Avanzadas sin límite</td></tr>
                  <tr><td>Sistema de reservas / catálogo</td><td>✗ No incluido</td><td>✓ Incluido</td><td>✓ Incluido</td></tr>
                  <tr><td>Integraciones</td><td>Básicas (formulario, WhatsApp)</td><td>Redes sociales, herramientas externas</td><td>APIs, CRM, sistemas legacy</td></tr>
                  <tr><td>Analíticas y reportes</td><td>Panel básico</td><td>Avanzadas mensuales</td><td>Avanzadas + consultoría</td></tr>
                  <tr><td>SEO y optimización</td><td>SEO básico</td><td>SEO intermedio + velocidad</td><td>SEO avanzado + infraestructura escalable</td></tr>
                  <tr><td>Cambios y actualizaciones</td><td>1 mensual</td><td>Hasta 3 mensuales</td><td>Prioritarias mensuales</td></tr>
                  <tr><td>Soporte técnico</td><td>Estándar</td><td>Prioritario</td><td>Dedicado con SLA</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="plans-build reveal-item" aria-labelledby="build-title">
          <div className="plans-build-shell">
            <p className="plans-kicker">Construcción estándar</p>
            <h2 id="build-title">Precios estándar de construcción</h2>
            <p className="plans-build-copy">Estos valores corresponden al desarrollo inicial del producto digital. Luego puedes sumar el plan mensual que mejor acompañe el crecimiento, soporte y evolución de tu sistema.</p>
            <div className="plans-build-grid">
              {BUILD_PRICES.map(([name, price]) => (
                <article className="build-card" key={name}>
                  <p className="build-name">{name}</p>
                  <p className="build-price">{price}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="plans-faq reveal-item" aria-labelledby="faq-title">
          <div className="plans-faq-shell">
            <p className="plans-kicker">Preguntas frecuentes</p>
            <h2 id="faq-title">Todo lo que suele consultarse antes de suscribirse</h2>

            <div className="faq-grid">
              {FAQS.map(([question, answer]) => (
                <details className="faq-item" key={question}>
                  <summary>{question}</summary>
                  <p>{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <section
        className={`plans-flow-message${messageState.visible ? ' is-visible' : ''}`}
        id="plans-flow-message"
        hidden={!messageState.visible && !messageState.text}
        data-tone={messageState.tone}
        aria-live="polite"
      >
        {messageState.text}
      </section>

      <div className="billing-modal" id="billing-modal" hidden>
        <div className="billing-modal__panel" role="dialog" aria-modal="true" aria-labelledby="billing-modal-title">
          <div className="billing-modal__header">
            <div>
              <h2 className="billing-modal__title" id="billing-modal-title">Suscripción WebForge</h2>
              <p className="billing-modal__subtitle" id="billing-modal-subtitle">Preparando checkout seguro...</p>
            </div>
            <button className="billing-modal__close" id="billing-modal-close" type="button" aria-label="Cerrar checkout">X</button>
          </div>
          <div className="billing-modal__body" id="billing-modal-body">
            <div className="billing-modal__status" id="billing-modal-status">
              <div>
                <strong>Inicializando el checkout</strong>
                <span>En unos segundos podrás completar la suscripción sin salir del flujo de WebForge.</span>
              </div>
            </div>
            <iframe className="billing-modal__iframe" id="billing-modal-iframe" title="Checkout de suscripción WebForge" hidden></iframe>
          </div>
        </div>
      </div>

      <footer className="site-footer" aria-label="Pie de página">
        <div className="footer-shell">
          <div className="footer-brand">
            <img src="/assets/WebForgeLogo-NoBackground.png" alt="WebForge" className="footer-logo" />
            <div>
              <p className="footer-name">WebForge</p>
              <p className="footer-tag">Ecosistema tecnológico para empresas y personas</p>
            </div>
          </div>

          <nav className="footer-nav" aria-label="Navegación secundaria">
            <a href="/index.html#inicio">Inicio</a>
            <a href="/index.html#servicios">Servicios</a>
            <a href="/index.html#soluciones">Soluciones</a>
            <a href="/plans.html">Planes</a>
            <a href="/index.html#contacto">Contacto</a>
          </nav>

          <div className="footer-meta">
            <a href="mailto:agustinezequielmoreno@gmail.com">agustinezequielmoreno@gmail.com</a>
            <a href="https://www.instagram.com/webforgeapp" target="_blank" rel="noopener noreferrer" aria-label="Instagram de WebForge">@webforgeapp</a>
            <span>Bahía Blanca, Argentina</span>
            <span>© 2026 WebForge. Todos los derechos reservados.</span>
          </div>
        </div>
      </footer>
    </>
  )
}