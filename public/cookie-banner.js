;(function () {
  const KEY = 'webforge_cookies_consent'
  if (localStorage.getItem(KEY)) return

  /* ─── Inject styles ─── */
  const style = document.createElement('style')
  style.textContent = `
    #wf-cookie-banner {
      position: fixed;
      bottom: 0; left: 0; right: 0;
      z-index: 9998;
      background: rgba(6,14,30,0.94);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border-top: 1px solid rgba(155,243,216,0.16);
      padding: 18px 24px;
      transform: translateY(110%);
      transition: transform 0.5s cubic-bezier(0.22,1,0.36,1);
      font-family: 'Montserrat', 'Segoe UI', sans-serif;
      box-sizing: border-box;
    }
    #wf-cookie-banner.is-visible {
      transform: translateY(0);
    }
    #wf-cookie-inner {
      max-width: 1180px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      gap: 24px;
      flex-wrap: wrap;
    }
    #wf-cookie-main {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      flex: 1;
      min-width: 240px;
    }
    #wf-cookie-emoji {
      font-size: 1.6rem;
      line-height: 1;
      flex-shrink: 0;
      margin-top: 2px;
    }
    #wf-cookie-text { display: flex; flex-direction: column; gap: 4px; }
    #wf-cookie-title {
      font-size: 0.82rem;
      font-weight: 700;
      color: #f9fafb;
      margin: 0;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    #wf-cookie-body {
      font-size: 0.8rem;
      color: rgba(229,231,235,0.72);
      margin: 0;
      line-height: 1.6;
    }
    #wf-cookie-toggle {
      background: none; border: none; padding: 0;
      cursor: pointer;
      font-size: 0.8rem;
      color: #9bf3d8;
      text-decoration: underline;
      text-underline-offset: 3px;
      font-family: inherit;
    }
    #wf-cookie-toggle:hover { color: #c8faea; }
    #wf-cookie-details {
      display: none;
      margin-top: 10px;
      padding: 12px 14px;
      border-radius: 10px;
      background: rgba(155,243,216,0.05);
      border: 1px solid rgba(155,243,216,0.12);
      flex-direction: column;
      gap: 8px;
    }
    #wf-cookie-details.open { display: flex; }
    .wf-cookie-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .wf-cookie-row-info { display: flex; flex-direction: column; gap: 2px; }
    .wf-cookie-row strong {
      font-size: 0.78rem;
      color: rgba(229,231,235,0.9);
      font-weight: 600;
    }
    .wf-cookie-row span.desc {
      font-size: 0.74rem;
      color: rgba(229,231,235,0.52);
    }
    .wf-badge {
      font-size: 0.66rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 3px 9px;
      border-radius: 20px;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .wf-badge--on {
      background: rgba(155,243,216,0.12);
      border: 1px solid rgba(155,243,216,0.3);
      color: #9bf3d8;
    }
    .wf-badge--opt {
      background: rgba(251,191,36,0.10);
      border: 1px solid rgba(251,191,36,0.28);
      color: #fbbf24;
    }
    #wf-cookie-actions {
      display: flex;
      gap: 10px;
      flex-shrink: 0;
      align-items: center;
    }
    .wf-btn {
      font-family: 'Montserrat', 'Segoe UI', sans-serif;
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      min-height: 38px;
      border-radius: 10px;
      cursor: pointer;
      transition: opacity 0.2s, transform 0.2s, border-color 0.2s, color 0.2s;
    }
    .wf-btn-secondary {
      padding: 0 16px;
      border: 1px solid rgba(229,231,235,0.28);
      background: transparent;
      color: rgba(229,231,235,0.8);
    }
    .wf-btn-secondary:hover {
      border-color: rgba(155,243,216,0.5);
      color: #9bf3d8;
    }
    .wf-btn-primary {
      padding: 0 20px;
      border: none;
      background: linear-gradient(135deg,#22c1c3,#6d28d9);
      color: #fff;
    }
    .wf-btn-primary:hover { opacity: 0.88; transform: translateY(-1px); }
    @media (max-width: 640px) {
      #wf-cookie-banner { padding: 16px; }
      #wf-cookie-inner  { flex-direction: column; align-items: stretch; gap: 14px; }
      #wf-cookie-actions { justify-content: flex-end; }
    }
  `
  document.head.appendChild(style)

  /* ─── Build HTML ─── */
  const banner = document.createElement('div')
  banner.id = 'wf-cookie-banner'
  banner.setAttribute('role', 'dialog')
  banner.setAttribute('aria-label', 'Aviso de cookies')
  banner.innerHTML = `
    <div id="wf-cookie-inner">
      <div id="wf-cookie-main">
        <span id="wf-cookie-emoji" aria-hidden="true">🍪</span>
        <div id="wf-cookie-text">
          <p id="wf-cookie-title">Usamos cookies</p>
          <p id="wf-cookie-body">
            Utilizamos cookies esenciales para el funcionamiento del sitio y cookies de
            terceros (chatbot, Google Sign-In) para mejorar tu experiencia.&nbsp;
            <button id="wf-cookie-toggle">Ver detalles</button>
          </p>
          <div id="wf-cookie-details">
            <div class="wf-cookie-row">
              <div class="wf-cookie-row-info">
                <strong>Esenciales</strong>
                <span class="desc">Sesión, preferencias, seguridad. Siempre activas.</span>
              </div>
              <span class="wf-badge wf-badge--on">Siempre</span>
            </div>
            <div class="wf-cookie-row">
              <div class="wf-cookie-row-info">
                <strong>Funcionales</strong>
                <span class="desc">Google Sign-In, chatbot Chatbase.</span>
              </div>
              <span class="wf-badge wf-badge--opt">Opcionales</span>
            </div>
          </div>
        </div>
      </div>
      <div id="wf-cookie-actions">
        <button class="wf-btn wf-btn-secondary" id="wf-cookie-essential">Solo esenciales</button>
        <button class="wf-btn wf-btn-primary"   id="wf-cookie-accept">Aceptar todo</button>
      </div>
    </div>
  `
  document.body.appendChild(banner)

  /* ─── Show after short delay ─── */
  setTimeout(() => banner.classList.add('is-visible'), 900)

  /* ─── Toggle details ─── */
  let detailsOpen = false
  document.getElementById('wf-cookie-toggle').addEventListener('click', function () {
    detailsOpen = !detailsOpen
    document.getElementById('wf-cookie-details').classList.toggle('open', detailsOpen)
    this.textContent = detailsOpen ? 'Ocultar detalles' : 'Ver detalles'
  })

  /* ─── Accept handlers ─── */
  function dismiss(value) {
    localStorage.setItem(KEY, value)
    banner.style.transform = 'translateY(110%)'
    setTimeout(() => banner.remove(), 600)
  }

  document.getElementById('wf-cookie-accept').addEventListener('click', () => dismiss('all'))
  document.getElementById('wf-cookie-essential').addEventListener('click', () => dismiss('essential'))
})()
