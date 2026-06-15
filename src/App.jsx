import { useEffect, useRef, useState } from 'react'
import './App.css'
import CookieBanner from './CookieBanner.jsx'

const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY || ''
const chatbaseBotId = '3wp7x1uDEgOH5G_TDek85'

function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formStatus, setFormStatus] = useState('')
  const [isError, setIsError] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const navListRef = useRef(null)
  const serviceSelectRef = useRef(null)
  const formStatusTimeoutRef = useRef(null)

  useEffect(() => {
    try {
      const token = localStorage.getItem('webforge_token')
      const stored = localStorage.getItem('webforge_user')
      if (token && stored) {
        setCurrentUser(JSON.parse(stored))
      }
    } catch {
      // ignore parse errors
    }
  }, [])

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }

    window.scrollTo(0, 0)
    document.title = 'WebForge | Desarrollo Web, Automatización e IA para Empresas'

    const navList = navListRef.current
    if (!navList) {
      return undefined
    }

    const navLinks = navList.querySelectorAll('a')
    const pill = document.createElement('div')
    pill.className = 'nav-pill'
    navList.appendChild(pill)

    const movePill = (link) => {
      const listRect = navList.getBoundingClientRect()
      const linkRect = link.getBoundingClientRect()
      const padding = 12
      pill.style.left = `${linkRect.left - listRect.left - padding}px`
      pill.style.width = `${linkRect.width + padding * 2}px`
      pill.style.opacity = '1'
    }

    const setActive = (id) => {
      let hasMatch = false
      navLinks.forEach((link) => {
        if (link.getAttribute('href') === `#${id}`) {
          hasMatch = true
        }
      })

      if (!hasMatch) {
        return
      }

      navLinks.forEach((link) => {
        link.classList.remove('menu-active')
        if (link.getAttribute('href') === `#${id}`) {
          link.classList.add('menu-active')
          movePill(link)
        }
      })
    }

    setActive('inicio')

    const onFocusHandlers = []
    const onClickHandlers = []

    navLinks.forEach((link) => {
      const onFocus = () => movePill(link)
      link.addEventListener('focus', onFocus)
      onFocusHandlers.push({ link, handler: onFocus })

      const onClick = () => {
        const href = link.getAttribute('href')
        if (href && href.startsWith('#')) {
          setActive(href.slice(1))
        }
      }
      link.addEventListener('click', onClick)
      onClickHandlers.push({ link, handler: onClick })
    })

    const sections = document.querySelectorAll('section[id]')
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActive(entry.target.id)
          }
        })
      },
      { rootMargin: '-30% 0px -60% 0px', threshold: 0 },
    )

    sections.forEach((section) => sectionObserver.observe(section))

    const revealConfig = [
      { sel: '.services-kicker', delay: 0 },
      { sel: '.services-head h2', delay: 80 },
      { sel: '.services-head p:not(.services-kicker)', delay: 160 },
      { sel: '.service-card-pro', stagger: 80 },
      { sel: '.featured-kicker', delay: 0 },
      { sel: '.featured-head h2', delay: 80 },
      { sel: '.featured-head p:not(.featured-kicker)', delay: 160 },
      { sel: '.featured-card', stagger: 100 },
      { sel: '.contact-kicker', delay: 0 },
      { sel: '.contact-head h2', delay: 80 },
      { sel: '.contact-head p:not(.contact-kicker)', delay: 160 },
      { sel: '.contact-card', stagger: 120 },
    ]

    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed')
            revealObserver.unobserve(entry.target)
          }
        })
      },
      { rootMargin: '200px 0px 200px 0px', threshold: 0 },
    )

    revealConfig.forEach(({ sel, delay = 0, stagger = 0 }) => {
      document.querySelectorAll(sel).forEach((element, index) => {
        element.classList.add('reveal-item')
        element.style.transitionDelay = `${delay + index * stagger}ms`
        revealObserver.observe(element)
      })
    })

    return () => {
      onFocusHandlers.forEach(({ link, handler }) => link.removeEventListener('focus', handler))
      onClickHandlers.forEach(({ link, handler }) => link.removeEventListener('click', handler))
      sectionObserver.disconnect()
      revealObserver.disconnect()
      pill.remove()
    }
  }, [])

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 1080) {
        setIsMenuOpen(false)
      }
    }

    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (!recaptchaSiteKey) {
      return undefined
    }

    const scriptId = 'recaptcha-v3-script'
    if (document.getElementById(scriptId)) {
      return undefined
    }

    const script = document.createElement('script')
    script.id = scriptId
    script.src = `https://www.google.com/recaptcha/api.js?render=${recaptchaSiteKey}`
    script.async = true
    script.defer = true
    document.head.appendChild(script)

    return undefined
  }, [])

  useEffect(() => {
    const existingScript = document.getElementById(chatbaseBotId)
    if (existingScript) {
      return undefined
    }

    if (!window.chatbase || window.chatbase('getState') !== 'initialized') {
      window.chatbase = (...args) => {
        if (!window.chatbase.q) {
          window.chatbase.q = []
        }
        window.chatbase.q.push(args)
      }

      window.chatbase = new Proxy(window.chatbase, {
        get(target, prop) {
          if (prop === 'q') {
            return target.q
          }

          return (...args) => target(prop, ...args)
        },
      })
    }

    const script = document.createElement('script')
    script.src = 'https://www.chatbase.co/embed.min.js'
    script.id = chatbaseBotId
    script.setAttribute('domain', 'www.chatbase.co')
    document.body.appendChild(script)

    return undefined
  }, [])

  useEffect(() => () => {
    if (formStatusTimeoutRef.current) {
      window.clearTimeout(formStatusTimeoutRef.current)
    }
  }, [])

  const handleServiceCTA = (service) => {
    if (serviceSelectRef.current) {
      serviceSelectRef.current.value = service
    }
  }

  const getRecaptchaToken = async () => {
    if (!recaptchaSiteKey || !window.grecaptcha) {
      return ''
    }

    return new Promise((resolve) => {
      window.grecaptcha.ready(async () => {
        try {
          const token = await window.grecaptcha.execute(recaptchaSiteKey, { action: 'contact_submit' })
          resolve(token || '')
        } catch {
          resolve('')
        }
      })
    })
  }

  const handleFormSubmit = async (event) => {
    event.preventDefault()

    const form = event.currentTarget
    const formData = new FormData(form)
    const recaptchaToken = await getRecaptchaToken()
    const payload = {
      nombre: String(formData.get('nombre') || '').trim(),
      email: String(formData.get('email') || '').trim(),
      servicio: String(formData.get('servicio') || '').trim(),
      mensaje: String(formData.get('mensaje') || '').trim(),
      website: String(formData.get('website') || '').trim(),
      recaptchaToken,
    }

    setIsSubmitting(true)
    setFormStatus('')
    setIsError(false)

    if (formStatusTimeoutRef.current) {
      window.clearTimeout(formStatusTimeoutRef.current)
      formStatusTimeoutRef.current = null
    }

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'No se pudo enviar el formulario')
      }

      form.reset()
      if (serviceSelectRef.current) {
        serviceSelectRef.current.value = ''
      }
      setFormStatus('Solicitud enviada. Nos pondremos en contacto pronto.')
      setIsError(false)
      setIsSubmitting(false)
      formStatusTimeoutRef.current = window.setTimeout(() => {
        setFormStatus('')
        formStatusTimeoutRef.current = null
      }, 4500)
    } catch {
      setIsError(true)
      setFormStatus('No pudimos enviar la solicitud. Intenta nuevamente en unos segundos.')
      setIsSubmitting(false)
    }
  }

  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/'
  const isNotFoundRoute = currentPath !== '/' && currentPath !== '/index.html'

  if (isNotFoundRoute) {
    return (
      <>
        <main className="notfound-shell" aria-label="Página no encontrada">
          <section className="notfound-card" aria-labelledby="notfound-title">
            <p className="notfound-kicker">Error 404</p>
            <h1 className="notfound-title" id="notfound-title">Esta página no existe</h1>
            <p className="notfound-body">
              La ruta que intentaste abrir no está disponible o fue movida.
              Puedes volver al inicio o continuar desde planes.
            </p>
            <div className="notfound-actions">
              <a href="/" className="btn-primary">Volver al inicio</a>
              <a href="/plans.html" className="btn-ghost">Ver planes</a>
            </div>
          </section>
        </main>
        <CookieBanner />
      </>
    )
  }

  return (
    <>
      <header className={`site-header ${isMenuOpen ? 'menu-open' : ''}`} id="top">
        <div className="header-container">
          <a className="brand" href="#inicio" aria-label="WebForge inicio">
            <img src="/assets/WebForgeLogo-NoBackground.png" alt="WebForge" className="brand-logo" />
            <div className="brand-copy">
              <span className="brand-name">WebForge</span>
              <span className="brand-tag">Ecosistema Tecnológico</span>
            </div>
          </a>

          <button
            className="nav-toggle"
            type="button"
            aria-expanded={isMenuOpen}
            aria-controls="primary-nav"
            aria-label="Abrir menu de navegación"
            onClick={() => setIsMenuOpen((current) => !current)}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>

          <nav className="main-nav" aria-label="Navegación principal">
            <ul
              className="nav-list"
              id="primary-nav"
              ref={navListRef}
              onClick={(event) => {
                if (event.target.closest('a') && window.innerWidth <= 1080) {
                  setIsMenuOpen(false)
                }
              }}
            >
              <li><a href="#inicio">Inicio</a></li>
              <li><a href="#servicios">Servicios</a></li>
              <li><a href="#soluciones">Soluciones</a></li>
              <li><a href="/plans.html">Planes</a></li>
              <li><a href="#contacto">Contacto</a></li>
              <li className="nav-mobile-item">
                {currentUser
                  ? <a href="/cuenta.html" className="header-login nav-mobile-login">Cuenta</a>
                  : <a href="/login.html" className="header-login nav-mobile-login">Login</a>
                }
              </li>
            </ul>
          </nav>

          <div className="header-actions" aria-label="Acciones de usuario">
            {currentUser
              ? <a href="/cuenta.html" className="header-login">Cuenta</a>
              : <a href="/login.html" className="header-login">Login</a>
            }
            <a href="#contacto" className="header-cta">Agendar diagnostico</a>
          </div>
        </div>
      </header>

      <main aria-label="Contenido principal">
        <section className="hero" id="inicio" aria-labelledby="hero-headline">
          <div className="hero-inner">
            <div className="hero-content">
              <div className="hero-badge">
                <span className="hero-badge-dot" aria-hidden="true"></span>
                Ecosistema Tecnológico
              </div>

              <h1 className="hero-headline" id="hero-headline">
                No construimos paginas
                <br />
                <span className="text-gradient">Construimos ecosistemas</span>
              </h1>

              <p className="hero-body">
                WebForge es una empresa tecnológica que desarrolla software, automatización, inteligencia artificial y
                productos digitales. No somos una agencia. Somos tu ecosistema digital completo.
              </p>

              <div className="hero-actions">
                <a href="#contacto" className="btn-primary">Agendar diagnostico</a>
                <a href="#servicios" className="btn-ghost">Explorar servicios</a>
              </div>

              <div className="hero-stats">
                <div className="hero-stat">
                  <span className="stat-value">3</span>
                  <span className="stat-label">Servicios</span>
                </div>
                <span className="stat-sep" aria-hidden="true"></span>
                <div className="hero-stat">
                  <span className="stat-value">50+</span>
                  <span className="stat-label">Clientes</span>
                </div>
                <span className="stat-sep" aria-hidden="true"></span>
                <div className="hero-stat">
                  <span className="stat-value">∞</span>
                  <span className="stat-label">Escalabilidad</span>
                </div>
              </div>
            </div>

            <div className="hero-visual" aria-hidden="true">
              <div className="hero-glow"></div>
              <div className="divisions-grid">
                <div className="div-card" style={{ '--delay': '0s' }}>
                  <div className="div-icon"><svg viewBox="0 0 24 24" fill="none" focusable="false"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" /></svg></div>
                  <span className="div-name">Design</span>
                  <span className="div-label">UI/UX & Identidad Visual</span>
                </div>
                <div className="div-card" style={{ '--delay': '0.5s' }}>
                  <div className="div-icon"><svg viewBox="0 0 24 24" fill="none" focusable="false"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg></div>
                  <span className="div-name">Development</span>
                  <span className="div-label">Web Apps & Software</span>
                </div>
                <div className="div-card div-card-wide" style={{ '--delay': '1s' }}>
                  <div className="div-icon"><svg viewBox="0 0 24 24" fill="none" focusable="false"><rect x="9" y="9" width="6" height="6" /><path d="M9 2H7a2 2 0 00-2 2v2M15 2h2a2 2 0 012 2v2M2 9v2M2 13v2M22 9v2M22 13v2M9 22H7a2 2 0 01-2-2v-2M15 22h2a2 2 0 002-2v-2" /></svg></div>
                  <span className="div-name">Automation & AI</span>
                  <span className="div-label">Automatización e Inteligencia Artificial</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="services-showcase" id="servicios" aria-labelledby="services-title">
          <div className="services-shell">
            <div className="services-head">
              <p className="services-kicker">Servicios WebForge</p>
              <h2 id="services-title">3 servicios estratégicos para construir sistemas digitales escalables</h2>
              <p>Pasa el cursor sobre cada tarjeta para ver capacidades avanzadas, enfoque de ejecución y el siguiente paso de diagnostico.</p>
            </div>
            <div className="services-grid">
              {[
                { id: '01', title: 'WebForge Design', body: 'Diseño UI/UX e identidad digital orientados a conversion y posicionamiento premium.', items: ['Sistemas visuales escalables', 'UX de alto rendimiento', 'Brand interfaces consistentes'], service: 'design' },
                { id: '02', title: 'WebForge Development', body: 'Desarrollo de sitios, web apps y software a medida con arquitectura mantenible.', items: ['Arquitectura modular', 'Integraciones API', 'Performance first'], service: 'development' },
                { id: '03', title: 'WebForge Automation & AI', body: 'Automatización de procesos e inteligencia artificial aplicada para reducir tiempos, errores y potenciar la toma de decisiones.', items: ['Flujos sin tareas repetitivas', 'Asistentes IA operativos', 'Conectores y analítica accionable'], service: 'automation-ai' },
              ].map((card) => (
                <article className="service-card-pro" key={card.id}>
                  <div className="service-front">
                    <p className="service-eyebrow">{card.id}</p>
                    <h3>{card.title}</h3>
                    <p>{card.body}</p>
                  </div>
                  <div className="service-back">
                    <p className="service-eyebrow">{card.id}</p>
                    <h3>{card.title}</h3>
                    <h4>Características clave</h4>
                    <ul>{card.items.map((item) => <li key={item}>{item}</li>)}</ul>
                    <a href="#contacto" className="service-card-btn" onClick={() => handleServiceCTA(card.service)}>Agendar diagnostico</a>
                  </div>
                </article>
              ))}
            </div>
            <div className="services-actions">
              <a href="/plans.html" className="services-link">Ver planes y suscripciones</a>
            </div>
          </div>
        </section>

        <section className="featured-success" id="soluciones" aria-labelledby="featured-title">
          <div className="featured-shell">
            <div className="featured-head">
              <p className="featured-kicker">Éxitos Destacados</p>
              <h2 id="featured-title">3 proyectos reales lanzados por WebForge</h2>
              <p>Implementaciones publicadas en Vercel con enfoque en marca, conversion y experiencia de usuario de alto nivel.</p>
            </div>

            <div className="featured-grid">
              <article className="featured-card">
                <div className="featured-topline"><span className="featured-sector">Moda Masculina</span><span className="featured-badge">E-commerce Premium</span></div>
                <h3>VARESE Menswear</h3>
                <p>Tienda digital de ropa para hombre con narrativa de marca elegante, catalogo visual curado y estructura orientada a compra.</p>
                <div className="featured-metrics"><div><strong>Brand</strong><span>Estética editorial</span></div><div><strong>UX</strong><span>Flujo de compra claro</span></div></div>
                <div className="featured-actions"><a className="featured-link" href="https://mens-clothing-web-template-varese.vercel.app/" target="_blank" rel="noreferrer">Ver demo en vivo</a><a className="featured-link secondary" href="https://mens-clothing-web-template-varese.vercel.app/checkout.html" target="_blank" rel="noreferrer">Ver checkout</a></div>
              </article>
              <article className="featured-card">
                <div className="featured-topline"><span className="featured-sector">Gastronomía</span><span className="featured-badge">Reserva + Delivery</span></div>
                <h3>Milanno</h3>
                <p>Web de restaurante enfocada en menu visual, reservas instantáneas y canales directos de conversion por WhatsApp y PedidoYa.</p>
                <div className="featured-metrics"><div><strong>2 sedes</strong><span>Bahia y Monte Hermoso</span></div><div><strong>4.9</strong><span>Reseña promedio</span></div></div>
                <div className="featured-actions"><a className="featured-link" href="https://milanno-web-template.vercel.app/" target="_blank" rel="noreferrer">Ver demo en vivo</a><a className="featured-link secondary" href="https://api.whatsapp.com/send?phone=5492915275859" target="_blank" rel="noreferrer">Canal WhatsApp</a></div>
              </article>
              <article className="featured-card">
                <div className="featured-topline"><span className="featured-sector">Barbería Boutique</span><span className="featured-badge">Reservas Online</span></div>
                <h3>Italy Barbershop</h3>
                <p>Sitio profesional para captación de turnos con presentacion de servicios, galería de estilo y formulario de reservas.</p>
                <div className="featured-metrics"><div><strong>09:00-21:00</strong><span>Horario extendido</span></div><div><strong>Lead Gen</strong><span>Turnos desde web</span></div></div>
                <div className="featured-actions"><a className="featured-link" href="https://barbershop-web-template-tau.vercel.app/" target="_blank" rel="noreferrer">Ver demo en vivo</a><a className="featured-link secondary" href="https://barbershop-web-template-tau.vercel.app/#reservas" target="_blank" rel="noreferrer">Ver reservas</a></div>
              </article>
            </div>
          </div>
        </section>

        <section className="contact-section" id="contacto" aria-labelledby="contact-title">
          <div className="contact-shell">
            <div className="contact-head">
              <p className="contact-kicker">Contacto WebForge</p>
              <h2 id="contact-title">Tu proximo sistema digital empieza con una conversacion</h2>
              <p>Contanos tu objetivo y te guiamos con una ruta clara de implementacion, prioridades técnicas y enfoque real en conversion y escalabilidad.</p>
            </div>
            <div className="contact-grid">
              <article className="contact-card contact-card-primary">
                <h3>Canales directos</h3>
                <p>Elegí el canal mas cómodo para iniciar tu diagnostico con el equipo WebForge.</p>
                <ul className="contact-list">
                  <li><span className="contact-label">Correo</span><a href="mailto:agustinezequielmoreno@gmail.com">agustinezequielmoreno@gmail.com</a></li>
                  <li><span className="contact-label">WhatsApp</span><a href="https://api.whatsapp.com/send?phone=5492922432839" target="_blank" rel="noreferrer">+54 9 2922 43-2839</a></li>
                  <li><span className="contact-label">Disponibilidad</span><span>Lunes a Viernes - 09:00 a 19:00 (GMT-3)</span></li>
                </ul>
                <div className="contact-actions"><a href="https://api.whatsapp.com/send?phone=5492922432839" className="contact-btn" target="_blank" rel="noreferrer">Escribir por WhatsApp</a><a href="mailto:agustinezequielmoreno@gmail.com" className="contact-link">Enviar correo</a></div>
              </article>
              <article className="contact-card">
                <h3>Solicitar diagnostico</h3>
                <p>Complétalo en menos de 1 minuto y recibís respuesta con siguientes pasos.</p>
                <form className="contact-form" id="lead-form" method="post" onSubmit={handleFormSubmit}>
                  <input
                    type="text"
                    name="website"
                    tabIndex="-1"
                    autoComplete="off"
                    className="contact-honey"
                    aria-hidden="true"
                  />
                  <label>Nombre<input type="text" name="nombre" placeholder="Tu nombre" required /></label>
                  <label>Correo de trabajo<input type="email" name="email" placeholder="nombre@empresa.com" required /></label>
                  <label>
                    Servicio principal
                    <select name="servicio" defaultValue="" required ref={serviceSelectRef}>
                      <option value="" disabled>Seleccionar servicio</option>
                      <option value="design">Design</option>
                      <option value="development">Development</option>
                      <option value="automation-ai">Automation & AI</option>
                    </select>
                  </label>
                  <label>Mensaje<textarea name="mensaje" rows="4" placeholder="Describe el contexto de tu negocio y lo que necesitas construir." required></textarea></label>
                  <button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Enviando...' : 'Enviar solicitud'}</button>
                  <p className={`form-status ${formStatus ? 'is-visible' : ''} ${isError ? 'is-error' : 'is-success'}`} role="status" aria-live="polite">{formStatus}</p>
                </form>
              </article>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer" aria-label="Pie de pagina">
        <div className="footer-shell">
          <div className="footer-brand">
            <img src="/assets/WebForgeLogo-NoBackground.png" alt="WebForge" className="footer-logo" />
            <div>
              <p className="footer-name">WebForge</p>
              <p className="footer-tag">Ecosistema tecnológico para empresas y personas</p>
            </div>
          </div>

          <nav className="footer-nav" aria-label="Navegación secundaria">
            <a href="#inicio">Inicio</a>
            <a href="#servicios">Servicios</a>
            <a href="#soluciones">Soluciones</a>
            <a href="/plans.html">Planes</a>
            <a href="#contacto">Contacto</a>
          </nav>

          <div className="footer-meta">
            <a href="mailto:agustinezequielmoreno@gmail.com">agustinezequielmoreno@gmail.com</a>
            <a href="https://www.instagram.com/webforgeapp" target="_blank" rel="noreferrer" aria-label="Instagram de WebForge">@webforgeapp</a>
            <span>Bahia Blanca, Argentina</span>
            <span>© 2026 WebForge. Todos los derechos reservados.</span>
          </div>
        </div>
      </footer>
      <CookieBanner />
    </>
  )
}

export default App
