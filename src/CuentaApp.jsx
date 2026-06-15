import { useEffect, useRef, useState } from 'react'

const TOKEN_KEY = 'webforge_token'
const USER_KEY = 'webforge_user'

const STATUS_LABELS = {
  PENDING: 'Pendiente',
  ACTIVE: 'Activo',
  EXPIRED: 'Vencido',
  SUSPENDED: 'Suspendido',
  CANCELLED: 'Cancelado',
}

const TICKET_STATUS_LABELS = {
  OPEN: 'Abierto',
  IN_PROGRESS: 'En progreso',
  CLOSED: 'Cerrado',
}

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

function fmtDate(value) {
  if (!value) {
    return '—'
  }

  return new Date(value).toLocaleDateString('es-AR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function fmtMoney(value, currency) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: currency || 'ARS',
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}

function redirectToLogin() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  window.location.href = '/login.html'
}

function useToast() {
  const [toastState, setToastState] = useState({ message: '', type: '', visible: false })
  const timeoutRef = useRef(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const showToast = (message, type = 'ok') => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current)
    }

    setToastState({ message, type, visible: true })
    timeoutRef.current = window.setTimeout(() => {
      setToastState({ message: '', type: '', visible: false })
      timeoutRef.current = null
    }, 3200)
  }

  return { toastState, showToast }
}

function StatusBadge({ value, labels }) {
  return <span className={`badge ${value}`}>{labels[value] || value}</span>
}

function SharedSection({
  user,
  profileForm,
  passwordForm,
  profileSubmitting,
  passwordSubmitting,
  onProfileChange,
  onPasswordChange,
  onProfileSubmit,
  onPasswordSubmit,
}) {
  return (
    <div className="grid grid-2">
      <div className="card">
        <h3>Información personal</h3>
        <form onSubmit={onProfileSubmit}>
          <div className="field">
            <label htmlFor="profile-name">Nombre</label>
            <input
              id="profile-name"
              name="name"
              value={profileForm.name}
              onChange={onProfileChange}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="profile-phone">
              Teléfono{' '}
              {user.accountType === 'LEAD' ? <span className="muted">(obligatorio para solicitar un plan)</span> : null}
            </label>
            <input
              id="profile-phone"
              name="phone"
              value={profileForm.phone}
              onChange={onProfileChange}
              placeholder="+54 9 ..."
              required={user.accountType === 'LEAD'}
              minLength={user.accountType === 'LEAD' ? 5 : undefined}
            />
          </div>
          <div className="field">
            <label htmlFor="profile-email">Email</label>
            <input
              id="profile-email"
              name="email"
              type="email"
              value={profileForm.email}
              onChange={onProfileChange}
              required
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={profileSubmitting}>
            {profileSubmitting ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </form>
      </div>
      <div className="card">
        <h3>Seguridad</h3>
        <form onSubmit={onPasswordSubmit}>
          <div className="field">
            <label htmlFor="current-password">Contraseña actual</label>
            <input
              id="current-password"
              name="currentPassword"
              type="password"
              value={passwordForm.currentPassword}
              onChange={onPasswordChange}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="new-password">Nueva contraseña</label>
            <input
              id="new-password"
              name="newPassword"
              type="password"
              value={passwordForm.newPassword}
              onChange={onPasswordChange}
              minLength="8"
              required
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={passwordSubmitting}>
            {passwordSubmitting ? 'Actualizando...' : 'Cambiar contraseña'}
          </button>
        </form>
      </div>
    </div>
  )
}

function LeadHome({ user }) {
  const benefits = [
    ['◆', 'Sistema digital completo', 'Web, software y automatización en un solo lugar, sin coordinar varios proveedores.'],
    ['↑', 'Pensado para crecer', 'Arquitectura simple y escalable que acompaña la evolución de tu negocio.'],
    ['⚡', 'Implementación rápida', 'Activamos tus servicios y te acompañamos en cada paso del onboarding.'],
    ['◈', 'Soporte real', 'Un canal de tickets directo con el equipo para resolver lo que necesites.'],
  ]

  return (
    <>
      <h1 className="hello">Hola, {user.name} 👋</h1>
      <p className="hello-sub">Estás a un paso de activar tu ecosistema digital. Elegí el plan que mejor se adapte a tu negocio.</p>

      <div className="grid grid-2">
        {benefits.map(([icon, title, description]) => (
          <div className="card benefit" key={title}>
            <div className="ico">{icon}</div>
            <div>
              <p className="bt">{title}</p>
              <p className="bd">{description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="section-title">Elige Tu Primer Paso</div>
      <div className="lead-step-card">
        <p className="lead-step-kicker">Ruta recomendada para leads</p>
        <h2 className="lead-step-title">Definí tu plan ideal y activemos tu primer sistema</h2>
        <p className="lead-step-copy">
          Revisá los planes públicos, elegí el que mejor encaja con tu etapa y enviá tu solicitud. Cuando la recibamos,
          te contactamos para activar tu plan y poner en marcha tu ecosistema digital.
        </p>
        <div className="lead-step-actions">
          <a className="lead-step-btn" href="/plans.html">Ir a Planes WebForge</a>
          <a className="lead-step-link" href="/plans.html#top">Ver detalle completo de Starter, Premium y Business</a>
        </div>
      </div>
    </>
  )
}

function PlanCard({ plan, isSubmitting, onRequestPlan }) {
  return (
    <div className={`card plan-card ${plan.code === 'PREMIUM' ? 'featured' : ''}`}>
      <h2>{plan.name}</h2>
      <div className="plan-price">
        {fmtMoney(plan.price, plan.currency)} <small>/ mes</small>
      </div>
      <p className="muted plan-description">{plan.description}</p>
      <ul className="plan-features">
        {plan.features.map((feature) => (
          <li key={feature}>{feature}</li>
        ))}
      </ul>
      <button
        className="btn btn-primary plan-btn"
        type="button"
        disabled={isSubmitting}
        onClick={() => onRequestPlan(plan.code)}
      >
        {isSubmitting ? 'Enviando...' : 'Solicitar este plan'}
      </button>
    </div>
  )
}

function TicketList({ tickets, ticketsLoading, ticketsError }) {
  if (ticketsLoading) {
    return <p className="muted">Cargando...</p>
  }

  if (ticketsError) {
    return <p className="muted">No pudimos cargar tus tickets.</p>
  }

  if (!tickets.length) {
    return <p className="muted">Todavía no tenés tickets.</p>
  }

  return tickets.map((ticket) => (
    <div className="ticket-item" key={ticket.id}>
      <div className="tk-top">
        <span className="tk-sub">{ticket.subject}</span>
        <StatusBadge value={ticket.status} labels={TICKET_STATUS_LABELS} />
      </div>
      <p className="tk-desc">{ticket.description}</p>
      <p className="tk-date">{fmtDate(ticket.createdAt)}</p>
    </div>
  ))
}

function ClientHome({
  user,
  plan,
  plans,
  showUpgradePlans,
  tickets,
  ticketsLoading,
  ticketsError,
  ticketForm,
  ticketSubmitting,
  cancelSubmitting,
  planSubmitting,
  onToggleUpgradePlans,
  onCancelPlan,
  onTicketChange,
  onTicketSubmit,
  onRequestPlan,
}) {
  return (
    <>
      <h1 className="hello">Hola, {user.name} 👋</h1>
      <p className="hello-sub">Este es el estado de tu servicio WebForge.</p>

      <div className="grid grid-2">
        <div className="card">
          <h3>Estado del plan</h3>
          <div className="dl">
            <div className="k">Plan</div><div className="v">{plan ? plan.name : user.plan}</div>
            <div className="k">Estado</div><div className="v"><StatusBadge value={user.status} labels={STATUS_LABELS} /></div>
            <div className="k">Inicio</div><div className="v">{fmtDate(user.planStartDate)}</div>
            <div className="k">Próximo vencimiento</div><div className="v">{fmtDate(user.planEndDate)}</div>
            <div className="k">Último pago</div><div className="v">{fmtDate(user.lastPaymentDate)}</div>
          </div>
          <div className="row actions-row">
            <button className="btn" type="button" onClick={onToggleUpgradePlans}>Mejorar plan</button>
            <button className="btn btn-danger" type="button" disabled={cancelSubmitting} onClick={onCancelPlan}>
              {cancelSubmitting ? 'Cancelando...' : 'Cancelar plan'}
            </button>
          </div>
        </div>

        <div className="card">
          <h3>Tu servicio incluye</h3>
          {plan ? (
            <ul className="plan-features">
              {plan.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
          ) : (
            <p className="muted">Tu plan no tiene detalle de servicios.</p>
          )}
        </div>
      </div>

      <div className="section-title">Soporte</div>
      <div className="grid grid-2">
        <div className="card">
          <h3>Abrir un ticket</h3>
          <p className="muted form-subnote">Podés tener 1 ticket abierto a la vez.</p>
          <form onSubmit={onTicketSubmit}>
            <div className="field">
              <label htmlFor="ticket-subject">Asunto</label>
              <input
                id="ticket-subject"
                name="subject"
                maxLength="140"
                placeholder="Resumen del problema"
                required
                value={ticketForm.subject}
                onChange={onTicketChange}
              />
            </div>
            <div className="field">
              <label htmlFor="ticket-description">Descripción</label>
              <textarea
                id="ticket-description"
                name="description"
                rows="5"
                maxLength="3000"
                placeholder="Contanos en detalle qué necesitás."
                required
                value={ticketForm.description}
                onChange={onTicketChange}
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={ticketSubmitting}>
              {ticketSubmitting ? 'Enviando...' : 'Enviar ticket'}
            </button>
          </form>
        </div>
        <div className="card">
          <h3>Mis tickets</h3>
          <TicketList tickets={tickets} ticketsLoading={ticketsLoading} ticketsError={ticketsError} />
        </div>
      </div>

      <div className="section-title">Tu perfil y seguridad</div>

      {showUpgradePlans ? (
        <div className="upgrade-wrapper">
          <div className="section-title">Elegí tu nuevo plan</div>
          <div className="grid grid-3">
            {plans.length ? plans.map((item) => (
              <PlanCard
                key={item.code}
                plan={item}
                isSubmitting={planSubmitting === item.code}
                onRequestPlan={onRequestPlan}
              />
            )) : <p className="muted">No hay planes disponibles.</p>}
          </div>
        </div>
      ) : null}
    </>
  )
}

export default function CuentaApp() {
  const [loadState, setLoadState] = useState('loading')
  const [user, setUser] = useState(null)
  const [plans, setPlans] = useState([])
  const [tickets, setTickets] = useState([])
  const [ticketsLoading, setTicketsLoading] = useState(false)
  const [ticketsError, setTicketsError] = useState(false)
  const [showUpgradePlans, setShowUpgradePlans] = useState(false)
  const [ticketForm, setTicketForm] = useState({ subject: '', description: '' })
  const [profileForm, setProfileForm] = useState({ name: '', phone: '', email: '' })
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' })
  const [ticketSubmitting, setTicketSubmitting] = useState(false)
  const [profileSubmitting, setProfileSubmitting] = useState(false)
  const [passwordSubmitting, setPasswordSubmitting] = useState(false)
  const [cancelSubmitting, setCancelSubmitting] = useState(false)
  const [planSubmitting, setPlanSubmitting] = useState('')
  const { toastState, showToast } = useToast()
  const upgradeSectionRef = useRef(null)

  const api = async (path, options = {}) => {
    const token = localStorage.getItem(TOKEN_KEY)
    const headers = {
      Accept: 'application/json',
      Authorization: `Bearer ${token || ''}`,
      ...(options.headers || {}),
    }

    if (options.body && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json'
    }

    const response = await fetch(path, {
      ...options,
      headers,
    })

    if (response.status === 401) {
      redirectToLogin()
      throw new Error('No autorizado')
    }

    const data = await parseApiResponse(response)
    return { ok: response.ok, status: response.status, data }
  }

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) {
      window.location.href = '/login.html'
      return undefined
    }

    let cancelled = false

    const loadAccount = async () => {
      setLoadState('loading')

      try {
        const meResponse = await api('/api/auth/me')
        if (!meResponse.ok || !meResponse.data.user) {
          redirectToLogin()
          return
        }

        if (cancelled) {
          return
        }

        const nextUser = meResponse.data.user
        localStorage.setItem(USER_KEY, JSON.stringify(nextUser))

        if (nextUser.accountType === 'CEO' || nextUser.accountType === 'SUPER_ADMIN') {
          window.location.href = '/admin.html'
          return
        }

        setUser(nextUser)
        setProfileForm({
          name: nextUser.name || '',
          phone: nextUser.phone || '',
          email: nextUser.email || '',
        })

        const plansResponse = await api('/api/billing/plans')
        if (!cancelled) {
          setPlans(plansResponse.ok ? plansResponse.data.plans || [] : [])
          setLoadState('ready')
          showToast('Cuenta cargada correctamente.', 'ok')
        }
      } catch (error) {
        if (!cancelled) {
          console.error(error)
          setLoadState('error')
        }
      }
    }

    loadAccount()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!user || user.accountType !== 'CLIENT') {
      return undefined
    }

    let cancelled = false

    const loadTickets = async () => {
      setTicketsLoading(true)
      setTicketsError(false)

      try {
        const response = await api('/api/tickets/mine')
        if (cancelled) {
          return
        }

        if (!response.ok) {
          setTickets([])
          setTicketsError(true)
          return
        }

        setTickets(response.data.tickets || [])
      } catch (error) {
        if (!cancelled) {
          console.error(error)
          setTickets([])
          setTicketsError(true)
        }
      } finally {
        if (!cancelled) {
          setTicketsLoading(false)
        }
      }
    }

    loadTickets()

    return () => {
      cancelled = true
    }
  }, [user])

  useEffect(() => {
    if (showUpgradePlans && upgradeSectionRef.current) {
      upgradeSectionRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [showUpgradePlans])

  const handleLogout = () => {
    redirectToLogin()
  }

  const handleTicketChange = (event) => {
    const { name, value } = event.target
    setTicketForm((currentValue) => ({ ...currentValue, [name]: value }))
  }

  const handleProfileChange = (event) => {
    const { name, value } = event.target
    setProfileForm((currentValue) => ({ ...currentValue, [name]: value }))
  }

  const handlePasswordChange = (event) => {
    const { name, value } = event.target
    setPasswordForm((currentValue) => ({ ...currentValue, [name]: value }))
  }

  const handleRequestPlan = async (planCode) => {
    setPlanSubmitting(planCode)

    try {
      const response = await api('/api/billing/request', {
        method: 'POST',
        body: JSON.stringify({ plan: planCode }),
      })

      if (response.ok) {
        showToast(response.data.message || 'Solicitud enviada.', 'ok')
      } else {
        showToast(response.data.message || 'No se pudo enviar la solicitud.', 'err')
      }
    } catch (error) {
      console.error(error)
      showToast('No se pudo enviar la solicitud.', 'err')
    } finally {
      setPlanSubmitting('')
    }
  }

  const handleCancelPlan = async () => {
    if (!window.confirm('¿Seguro que querés cancelar tu plan? Tus servicios quedarán en pausa.')) {
      return
    }

    setCancelSubmitting(true)

    try {
      const response = await api('/api/billing/cancel', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      if (!response.ok || !response.data.user) {
        showToast(response.data.message || 'No se pudo cancelar.', 'err')
        return
      }

      setUser(response.data.user)
      localStorage.setItem(USER_KEY, JSON.stringify(response.data.user))
      showToast('Tu plan fue cancelado.', 'ok')
    } catch (error) {
      console.error(error)
      showToast('No se pudo cancelar.', 'err')
    } finally {
      setCancelSubmitting(false)
    }
  }

  const handleTicketSubmit = async (event) => {
    event.preventDefault()
    setTicketSubmitting(true)

    try {
      const response = await api('/api/tickets', {
        method: 'POST',
        body: JSON.stringify(ticketForm),
      })

      if (!response.ok) {
        showToast(response.data.message || 'No se pudo crear el ticket.', 'err')
        return
      }

      setTicketForm({ subject: '', description: '' })
      showToast('Ticket enviado. Te responderemos pronto.', 'ok')
      const refreshTickets = await api('/api/tickets/mine')
      if (refreshTickets.ok) {
        setTickets(refreshTickets.data.tickets || [])
        setTicketsError(false)
      }
    } catch (error) {
      console.error(error)
      showToast('No se pudo crear el ticket.', 'err')
    } finally {
      setTicketSubmitting(false)
    }
  }

  const handleProfileSubmit = async (event) => {
    event.preventDefault()
    setProfileSubmitting(true)

    try {
      const response = await api('/api/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify(profileForm),
      })

      if (!response.ok || !response.data.user) {
        showToast(response.data.message || 'No se pudo actualizar.', 'err')
        return
      }

      if (response.data.token) {
        localStorage.setItem(TOKEN_KEY, response.data.token)
      }

      setUser(response.data.user)
      setProfileForm({
        name: response.data.user.name || '',
        phone: response.data.user.phone || '',
        email: response.data.user.email || '',
      })
      localStorage.setItem(USER_KEY, JSON.stringify(response.data.user))
      showToast('Perfil actualizado.', 'ok')
    } catch (error) {
      console.error(error)
      showToast('No se pudo actualizar.', 'err')
    } finally {
      setProfileSubmitting(false)
    }
  }

  const handlePasswordSubmit = async (event) => {
    event.preventDefault()
    setPasswordSubmitting(true)

    try {
      const response = await api('/api/auth/password', {
        method: 'PATCH',
        body: JSON.stringify(passwordForm),
      })

      if (!response.ok) {
        showToast(response.data.message || 'No se pudo cambiar la contraseña.', 'err')
        return
      }

      setPasswordForm({ currentPassword: '', newPassword: '' })
      showToast('Contraseña actualizada.', 'ok')
    } catch (error) {
      console.error(error)
      showToast('No se pudo cambiar la contraseña.', 'err')
    } finally {
      setPasswordSubmitting(false)
    }
  }

  if (loadState === 'loading') {
    return (
      <main>
        <div className="center-loading">Cargando cuenta...</div>
      </main>
    )
  }

  if (loadState === 'error' || !user) {
    return (
      <main>
        <div className="center-loading">Error al cargar la cuenta.</div>
      </main>
    )
  }

  const currentPlan = plans.find((plan) => plan.code === user.plan)

  return (
    <>
      <header className="topbar">
        <a className="brand" href="/">Web<span>Forge</span></a>
        <div className="topbar-right">
          <a className={`topbar-link ${user.accountType === 'LEAD' || user.accountType === 'CLIENT' ? '' : 'hidden'}`} href="/">
            Volver
          </a>
          <span className="topbar-user">{user.email}</span>
          <button className="btn" type="button" onClick={handleLogout}>Salir</button>
        </div>
      </header>

      <main>
        {user.accountType === 'CLIENT' ? (
          <ClientHome
            user={user}
            plan={currentPlan}
            plans={plans}
            showUpgradePlans={showUpgradePlans}
            tickets={tickets}
            ticketsLoading={ticketsLoading}
            ticketsError={ticketsError}
            ticketForm={ticketForm}
            ticketSubmitting={ticketSubmitting}
            cancelSubmitting={cancelSubmitting}
            planSubmitting={planSubmitting}
            onToggleUpgradePlans={() => setShowUpgradePlans((currentValue) => !currentValue)}
            onCancelPlan={handleCancelPlan}
            onTicketChange={handleTicketChange}
            onTicketSubmit={handleTicketSubmit}
            onRequestPlan={handleRequestPlan}
          />
        ) : (
          <LeadHome user={user} />
        )}

        <div ref={upgradeSectionRef} />

        {user.accountType !== 'CLIENT' ? <div className="section-title">Tu perfil y soporte</div> : null}
        <SharedSection
          user={user}
          profileForm={profileForm}
          passwordForm={passwordForm}
          profileSubmitting={profileSubmitting}
          passwordSubmitting={passwordSubmitting}
          onProfileChange={handleProfileChange}
          onPasswordChange={handlePasswordChange}
          onProfileSubmit={handleProfileSubmit}
          onPasswordSubmit={handlePasswordSubmit}
        />
      </main>

      <div className={`toast ${toastState.visible ? `show ${toastState.type}` : ''}`.trim()} aria-live="polite">
        {toastState.message}
      </div>
    </>
  )
}