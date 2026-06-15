import { useEffect, useRef, useState } from 'react'

const TOKEN_KEY = 'webforge_token'
const USER_KEY = 'webforge_user'

const PURCHASABLE = ['STARTER', 'PREMIUM', 'BUSINESS']
const ACCOUNT_TYPES = ['CEO', 'SUPER_ADMIN', 'LEAD', 'CLIENT']
const PLANS = ['NONE', 'STARTER', 'PREMIUM', 'BUSINESS']
const STATUSES = ['PENDING', 'ACTIVE', 'EXPIRED', 'SUSPENDED', 'CANCELLED']
const TICKET_STATUS_LABELS = {
  OPEN: 'Abierto',
  IN_PROGRESS: 'En progreso',
  CLOSED: 'Completado',
}

const EMPTY_FILTERS = {
  q: '',
  id: '',
  name: '',
  email: '',
  phone: '',
  accountType: '',
  plan: '',
  status: '',
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

function redirectToLogin() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  window.location.href = '/login.html'
}

function fmtDate(value) {
  if (!value) {
    return '—'
  }

  return new Date(value).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function fmtMoney(value) {
  return `$${Number(value || 0).toLocaleString('es-AR')}`
}

function buildUsersParams(filters) {
  const params = new URLSearchParams()

  Object.entries(filters).forEach(([key, value]) => {
    const normalized = String(value || '').trim()
    if (normalized) {
      params.set(key, normalized)
    }
  })

  return params
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

function Badge({ value, label }) {
  return <span className={`badge ${value}`}>{label || value || '—'}</span>
}

function StatsGrid({ stats, loading }) {
  const cards = [
    ['Usuarios', stats.total],
    ['Leads', stats.leads],
    ['Clientes', stats.clients],
    ['Activos', stats.active],
    ['Starter activos', stats.activeByPlan?.STARTER || 0],
    ['Premium activos', stats.activeByPlan?.PREMIUM || 0],
    ['Business activos', stats.activeByPlan?.BUSINESS || 0],
    ['Facturacion mensual', fmtMoney(stats.monthlyRevenue)],
    ['Pendientes', stats.pending],
    ['Vencidos', stats.expired],
    ['Cancelados', stats.cancelled],
    ['Tickets abiertos', stats.openTickets],
  ]

  if (loading) {
    return (
      <div className="stats stats-loading">
        <div className="stat stat-placeholder">
          <div className="v">...</div>
          <div className="k">Cargando metricas</div>
        </div>
      </div>
    )
  }

  return (
    <div className="stats">
      {cards.map(([label, value]) => (
        <div className="stat" key={label}>
          <div className="v">{value}</div>
          <div className="k">{label}</div>
        </div>
      ))}
    </div>
  )
}

function FiltersPanel({ filters, onChange, onApply, onClear, resultCount, isLoading }) {
  return (
    <div className="panel">
      <div className="filters">
        <div className="full">
          <label className="flab" htmlFor="f-q">Busqueda rapida (nombre, email, telefono, ID)</label>
          <input
            id="f-q"
            name="q"
            value={filters.q}
            onChange={onChange}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                onApply()
              }
            }}
            placeholder="Escribi para buscar..."
          />
        </div>
        <div>
          <label className="flab" htmlFor="f-id">ID</label>
          <input id="f-id" name="id" value={filters.id} onChange={onChange} />
        </div>
        <div>
          <label className="flab" htmlFor="f-name">Nombre</label>
          <input id="f-name" name="name" value={filters.name} onChange={onChange} />
        </div>
        <div>
          <label className="flab" htmlFor="f-email">Email</label>
          <input id="f-email" name="email" value={filters.email} onChange={onChange} />
        </div>
        <div>
          <label className="flab" htmlFor="f-phone">Telefono</label>
          <input id="f-phone" name="phone" value={filters.phone} onChange={onChange} />
        </div>
        <div>
          <label className="flab" htmlFor="f-accountType">Rol</label>
          <select id="f-accountType" name="accountType" value={filters.accountType} onChange={onChange}>
            <option value="">Todos</option>
            {ACCOUNT_TYPES.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="flab" htmlFor="f-plan">Plan</label>
          <select id="f-plan" name="plan" value={filters.plan} onChange={onChange}>
            <option value="">Todos</option>
            {PLANS.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="flab" htmlFor="f-status">Estado</label>
          <select id="f-status" name="status" value={filters.status} onChange={onChange}>
            <option value="">Todos</option>
            {STATUSES.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="filter-actions">
        <button className="btn btn-primary btn-sm" type="button" onClick={onApply} disabled={isLoading}>Filtrar</button>
        <button className="btn btn-sm" type="button" onClick={onClear} disabled={isLoading}>Limpiar</button>
        <span className="result-count">{resultCount ? `${resultCount} resultado(s)` : ''}</span>
      </div>
    </div>
  )
}

function UsersTable({ users, isLoading, error, onActivate, onEdit, onDelete }) {
  let content

  if (isLoading) {
    content = (
      <tr>
        <td colSpan="9" className="muted">Cargando...</td>
      </tr>
    )
  } else if (error) {
    content = (
      <tr>
        <td colSpan="9" className="muted">Error al cargar.</td>
      </tr>
    )
  } else if (!users.length) {
    content = (
      <tr>
        <td colSpan="9" className="muted">Sin resultados.</td>
      </tr>
    )
  } else {
    content = users.map((user) => (
      <tr key={user.id}>
        <td className="mono">{user.id.slice(-6)}</td>
        <td>{user.name}</td>
        <td>{user.email}</td>
        <td>{user.phone || '—'}</td>
        <td><Badge value={user.accountType} /></td>
        <td><Badge value={user.plan} /></td>
        <td><Badge value={user.status} /></td>
        <td>{fmtDate(user.planEndDate)}</td>
        <td>
          <div className="actions">
            <button className="btn btn-sm btn-primary" type="button" onClick={() => onActivate(user)}>Activar</button>
            <button className="btn btn-sm" type="button" onClick={() => onEdit(user)}>Editar</button>
            <button className="btn btn-sm btn-danger" type="button" onClick={() => onDelete(user)}>✕</button>
          </div>
        </td>
      </tr>
    ))
  }

  return (
    <div className="panel">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Email</th>
              <th>Telefono</th>
              <th>Rol</th>
              <th>Plan</th>
              <th>Estado</th>
              <th>Vencimiento</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>{content}</tbody>
        </table>
      </div>
    </div>
  )
}

function TicketsPanel({ tickets, statusFilter, onStatusChange, onRefresh, onUpdateStatus, isLoading, error, updatingTicketId }) {
  let content

  if (isLoading) {
    content = (
      <tr>
        <td colSpan="7" className="muted">Cargando...</td>
      </tr>
    )
  } else if (error) {
    content = (
      <tr>
        <td colSpan="7" className="muted">No se pudieron cargar los tickets.</td>
      </tr>
    )
  } else if (!tickets.length) {
    content = (
      <tr>
        <td colSpan="7" className="muted">No hay tickets para este filtro.</td>
      </tr>
    )
  } else {
    content = tickets.map((ticket) => (
      <tr key={ticket.id}>
        <td>{ticket.user?.name || '—'}</td>
        <td>{ticket.user?.email || '—'}</td>
        <td>{ticket.subject}</td>
        <td><Badge value={ticket.status} label={TICKET_STATUS_LABELS[ticket.status] || ticket.status} /></td>
        <td>{fmtDate(ticket.createdAt)}</td>
        <td className="ticket-description">{ticket.description}</td>
        <td>
          <div className="actions">
            <button
              className="btn btn-sm"
              type="button"
              disabled={ticket.status === 'IN_PROGRESS' || updatingTicketId === ticket.id}
              onClick={() => onUpdateStatus(ticket.id, 'IN_PROGRESS')}
            >
              En progreso
            </button>
            <button
              className="btn btn-sm btn-primary"
              type="button"
              disabled={ticket.status === 'CLOSED' || updatingTicketId === ticket.id}
              onClick={() => onUpdateStatus(ticket.id, 'CLOSED')}
            >
              Completado
            </button>
          </div>
        </td>
      </tr>
    ))
  }

  return (
    <div className="panel">
      <div className="section-head">
        <div>
          <h2 className="section-title">Tickets de soporte</h2>
          <p className="section-copy">Revisa tickets abiertos, pasalos a en progreso o marcalos como completados.</p>
        </div>
        <div className="ticket-filter-bar">
          <div>
            <label className="flab" htmlFor="t-status">Estado</label>
            <select id="t-status" value={statusFilter} onChange={onStatusChange}>
              <option value="">Todos</option>
              <option value="OPEN">OPEN</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="CLOSED">CLOSED</option>
            </select>
          </div>
          <button className="btn btn-sm btn-primary" type="button" onClick={onRefresh} disabled={isLoading}>Actualizar</button>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Email</th>
              <th>Asunto</th>
              <th>Estado</th>
              <th>Creado</th>
              <th>Descripcion</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>{content}</tbody>
        </table>
      </div>
    </div>
  )
}

function ActivateModal({ user, value, submitting, onChange, onClose, onSubmit }) {
  return (
    <div className="overlay" role="presentation">
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="activate-title">
        <h3 id="activate-title">Activar plan</h3>
        <p className="modal-copy">
          Convierte a <strong>{user.name}</strong> en cliente y activa el plan. Esto mantiene el mismo flujo de compra y conversion.
        </p>
        <div className="field">
          <label className="flab" htmlFor="activate-plan">Plan</label>
          <select id="activate-plan" value={value} onChange={onChange} disabled={submitting}>
            {PURCHASABLE.map((plan) => (
              <option key={plan} value={plan}>{plan}</option>
            ))}
          </select>
        </div>
        <div className="row-actions">
          <button className="btn" type="button" onClick={onClose} disabled={submitting}>Cancelar</button>
          <button className="btn btn-primary" type="button" onClick={onSubmit} disabled={submitting}>
            {submitting ? 'Activando...' : 'Activar plan'}
          </button>
        </div>
      </div>
    </div>
  )
}

function EditModal({ formValues, submitting, onChange, onClose, onSubmit }) {
  return (
    <div className="overlay" role="presentation">
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="edit-title">
        <h3 id="edit-title">Editar usuario</h3>
        <div className="field">
          <label className="flab" htmlFor="m-name">Nombre</label>
          <input id="m-name" name="name" value={formValues.name} onChange={onChange} disabled={submitting} />
        </div>
        <div className="field">
          <label className="flab" htmlFor="m-phone">Telefono</label>
          <input id="m-phone" name="phone" value={formValues.phone} onChange={onChange} disabled={submitting} />
        </div>
        <div className="field">
          <label className="flab" htmlFor="m-accountType">Rol</label>
          <select id="m-accountType" name="accountType" value={formValues.accountType} onChange={onChange} disabled={submitting}>
            {ACCOUNT_TYPES.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="flab" htmlFor="m-plan">Plan</label>
          <select id="m-plan" name="plan" value={formValues.plan} onChange={onChange} disabled={submitting}>
            {PLANS.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="flab" htmlFor="m-status">Estado</label>
          <select id="m-status" name="status" value={formValues.status} onChange={onChange} disabled={submitting}>
            {STATUSES.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </div>
        <div className="row-actions">
          <button className="btn" type="button" onClick={onClose} disabled={submitting}>Cancelar</button>
          <button className="btn btn-primary" type="button" onClick={onSubmit} disabled={submitting}>
            {submitting ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminApp() {
  const [appState, setAppState] = useState('loading')
  const [currentUser, setCurrentUser] = useState(null)
  const [stats, setStats] = useState({ activeByPlan: {} })
  const [statsLoading, setStatsLoading] = useState(true)
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [users, setUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [usersError, setUsersError] = useState('')
  const [resultCount, setResultCount] = useState(0)
  const [ticketStatus, setTicketStatus] = useState('')
  const [tickets, setTickets] = useState([])
  const [ticketsLoading, setTicketsLoading] = useState(true)
  const [ticketsError, setTicketsError] = useState('')
  const [updatingTicketId, setUpdatingTicketId] = useState('')
  const [activateModal, setActivateModal] = useState(null)
  const [editModal, setEditModal] = useState(null)
  const { toastState, showToast } = useToast()

  const api = async (path, options = {}) => {
    const headers = {
      Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) || ''}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    }

    const response = await fetch(path, {
      ...options,
      headers,
    })

    if (response.status === 401) {
      redirectToLogin()
      throw new Error('401')
    }

    const data = await parseApiResponse(response)
    return { ok: response.ok, status: response.status, data }
  }

  const loadStats = async () => {
    setStatsLoading(true)
    try {
      const response = await api('/api/admin/stats')
      if (response.ok && response.data.stats) {
        setStats(response.data.stats)
      }
    } finally {
      setStatsLoading(false)
    }
  }

  const loadUsers = async (nextFilters = filters) => {
    setUsersLoading(true)
    setUsersError('')
    try {
      const params = buildUsersParams(nextFilters)
      const response = await api(`/api/admin/users${params.toString() ? `?${params.toString()}` : ''}`)
      if (!response.ok) {
        setUsers([])
        setResultCount(0)
        setUsersError(response.data.message || 'Error al cargar.')
        return
      }

      setUsers(response.data.users || [])
      setResultCount(response.data.total || 0)
    } catch (error) {
      if (error.message !== '401') {
        setUsers([])
        setResultCount(0)
        setUsersError('Error al cargar.')
      }
    } finally {
      setUsersLoading(false)
    }
  }

  const loadTickets = async (nextStatus = ticketStatus) => {
    setTicketsLoading(true)
    setTicketsError('')
    try {
      const params = new URLSearchParams()
      if (nextStatus) {
        params.set('status', nextStatus)
      }

      const response = await api(`/api/tickets${params.toString() ? `?${params.toString()}` : ''}`)
      if (!response.ok) {
        setTickets([])
        setTicketsError(response.data.message || 'No se pudieron cargar los tickets.')
        return
      }

      setTickets(response.data.tickets || [])
    } catch (error) {
      if (error.message !== '401') {
        setTickets([])
        setTicketsError('No se pudieron cargar los tickets.')
      }
    } finally {
      setTicketsLoading(false)
    }
  }

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) {
      window.location.href = '/login.html'
      return
    }

    let isMounted = true

    const init = async () => {
      try {
        const me = await api('/api/auth/me')
        if (!me.ok || !me.data.user) {
          redirectToLogin()
          return
        }

        const user = me.data.user
        if (user.accountType !== 'CEO' && user.accountType !== 'SUPER_ADMIN') {
          window.location.href = '/cuenta.html'
          return
        }

        if (!isMounted) {
          return
        }

        setCurrentUser(user)
        setAppState('ready')
        await Promise.all([loadStats(), loadUsers(EMPTY_FILTERS), loadTickets('')])
      } catch (error) {
        if (error.message !== '401' && isMounted) {
          setAppState('error')
        }
      }
    }

    init()

    return () => {
      isMounted = false
    }
  }, [])

  const handleFilterChange = (event) => {
    const { name, value } = event.target
    setFilters((currentValue) => ({
      ...currentValue,
      [name]: value,
    }))
  }

  const handleApplyFilters = async () => {
    await loadUsers(filters)
  }

  const handleClearFilters = async () => {
    setFilters(EMPTY_FILTERS)
    await loadUsers(EMPTY_FILTERS)
  }

  const handleLogout = () => {
    redirectToLogin()
  }

  const handleOpenActivate = (user) => {
    setActivateModal({ user, plan: PURCHASABLE[0], submitting: false })
  }

  const handleActivateSubmit = async () => {
    if (!activateModal) {
      return
    }

    setActivateModal((currentValue) => ({ ...currentValue, submitting: true }))

    try {
      const response = await api(`/api/admin/users/${activateModal.user.id}/activate`, {
        method: 'POST',
        body: JSON.stringify({ plan: activateModal.plan }),
      })

      if (!response.ok) {
        showToast(response.data.message || 'No se pudo activar.', 'err')
        setActivateModal((currentValue) => ({ ...currentValue, submitting: false }))
        return
      }

      showToast('Plan activado y cliente convertido.', 'ok')
      setActivateModal(null)
      await Promise.all([loadStats(), loadUsers(filters)])
    } catch (error) {
      if (error.message !== '401') {
        showToast('No se pudo activar.', 'err')
        setActivateModal((currentValue) => ({ ...currentValue, submitting: false }))
      }
    }
  }

  const handleOpenEdit = (user) => {
    setEditModal({
      user,
      submitting: false,
      form: {
        name: user.name || '',
        phone: user.phone || '',
        accountType: user.accountType,
        plan: user.plan,
        status: user.status,
      },
    })
  }

  const handleEditChange = (event) => {
    const { name, value } = event.target
    setEditModal((currentValue) => ({
      ...currentValue,
      form: {
        ...currentValue.form,
        [name]: value,
      },
    }))
  }

  const handleEditSubmit = async () => {
    if (!editModal) {
      return
    }

    setEditModal((currentValue) => ({ ...currentValue, submitting: true }))

    try {
      const payload = {
        name: editModal.form.name.trim(),
        phone: editModal.form.phone.trim() || null,
        accountType: editModal.form.accountType,
        plan: editModal.form.plan,
        status: editModal.form.status,
      }

      const response = await api(`/api/admin/users/${editModal.user.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        showToast(response.data.message || 'No se pudo actualizar.', 'err')
        setEditModal((currentValue) => ({ ...currentValue, submitting: false }))
        return
      }

      showToast('Usuario actualizado.', 'ok')
      setEditModal(null)
      await Promise.all([loadStats(), loadUsers(filters)])
    } catch (error) {
      if (error.message !== '401') {
        showToast('No se pudo actualizar.', 'err')
        setEditModal((currentValue) => ({ ...currentValue, submitting: false }))
      }
    }
  }

  const handleDeleteUser = async (user) => {
    const confirmed = window.confirm(`¿Eliminar a ${user.name} (${user.email})? Esta accion no se puede deshacer.`)
    if (!confirmed) {
      return
    }

    try {
      const response = await api(`/api/admin/users/${user.id}`, { method: 'DELETE' })
      if (!response.ok) {
        showToast(response.data.message || 'No se pudo eliminar.', 'err')
        return
      }

      showToast('Usuario eliminado.', 'ok')
      await Promise.all([loadStats(), loadUsers(filters)])
    } catch (error) {
      if (error.message !== '401') {
        showToast('No se pudo eliminar.', 'err')
      }
    }
  }

  const handleTicketStatusChange = async (event) => {
    const nextStatus = event.target.value
    setTicketStatus(nextStatus)
    await loadTickets(nextStatus)
  }

  const handleUpdateTicketStatus = async (ticketId, status) => {
    setUpdatingTicketId(ticketId)
    try {
      const response = await api(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })

      if (!response.ok) {
        showToast(response.data.message || 'No se pudo actualizar el ticket.', 'err')
        return
      }

      showToast(status === 'CLOSED' ? 'Ticket marcado como completado.' : 'Ticket actualizado.', 'ok')
      await Promise.all([loadStats(), loadTickets(ticketStatus)])
    } catch (error) {
      if (error.message !== '401') {
        showToast('No se pudo actualizar el ticket.', 'err')
      }
    } finally {
      setUpdatingTicketId('')
    }
  }

  if (appState === 'loading') {
    return (
      <div className="admin-shell admin-loading-shell">
        <div className="loading-state">Cargando panel...</div>
      </div>
    )
  }

  if (appState === 'error') {
    return (
      <div className="admin-shell admin-loading-shell">
        <div className="loading-state">Error al cargar el panel.</div>
      </div>
    )
  }

  return (
    <div className="admin-shell">
      <header className="topbar">
        <a className="brand" href="/">Web<span>Forge</span> · Admin</a>
        <div className="topbar-right">
          <a className="topbar-link" href="/">Volver</a>
          <span className="topbar-user">{currentUser?.email || ''}</span>
          <button className="btn" type="button" onClick={handleLogout}>Salir</button>
        </div>
      </header>

      <main className="admin-main">
        <h1>Panel de administracion</h1>
        <p className="sub">Gestion de usuarios, planes, conversiones y soporte.</p>

        <StatsGrid stats={stats} loading={statsLoading} />

        <div className="stack">
          <FiltersPanel
            filters={filters}
            onChange={handleFilterChange}
            onApply={handleApplyFilters}
            onClear={handleClearFilters}
            resultCount={resultCount}
            isLoading={usersLoading}
          />
          <UsersTable
            users={users}
            isLoading={usersLoading}
            error={usersError}
            onActivate={handleOpenActivate}
            onEdit={handleOpenEdit}
            onDelete={handleDeleteUser}
          />
          <TicketsPanel
            tickets={tickets}
            statusFilter={ticketStatus}
            onStatusChange={handleTicketStatusChange}
            onRefresh={() => loadTickets(ticketStatus)}
            onUpdateStatus={handleUpdateTicketStatus}
            isLoading={ticketsLoading}
            error={ticketsError}
            updatingTicketId={updatingTicketId}
          />
        </div>
      </main>

      {activateModal ? (
        <ActivateModal
          user={activateModal.user}
          value={activateModal.plan}
          submitting={activateModal.submitting}
          onChange={(event) => {
            const { value } = event.target
            setActivateModal((currentValue) => ({ ...currentValue, plan: value }))
          }}
          onClose={() => setActivateModal(null)}
          onSubmit={handleActivateSubmit}
        />
      ) : null}

      {editModal ? (
        <EditModal
          formValues={editModal.form}
          submitting={editModal.submitting}
          onChange={handleEditChange}
          onClose={() => setEditModal(null)}
          onSubmit={handleEditSubmit}
        />
      ) : null}

      <div className={`toast ${toastState.visible ? `show ${toastState.type}` : ''}`.trim()}>{toastState.message}</div>
    </div>
  )
}