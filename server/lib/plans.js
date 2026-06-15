// Catálogo de planes WebForge (sin tabla en DB: simple y mantenible para 10-50 clientes).
// Los precios están en ARS y coinciden con la página pública de planes.

export const PLAN_CATALOG = {
  STARTER: {
    code: 'STARTER',
    name: 'Starter',
    price: 34900,
    currency: 'ARS',
    billingCycle: 'MONTHLY',
    durationDays: 30,
    description: 'Ideal para negocios que necesitan presencia digital profesional y un sistema inicial de crecimiento.',
    features: ['Hosting administrado', 'Mantenimiento mensual', 'Soporte por email', 'SEO básico', 'Panel de cliente'],
  },
  PREMIUM: {
    code: 'PREMIUM',
    name: 'Premium',
    price: 59900,
    currency: 'ARS',
    billingCycle: 'MONTHLY',
    durationDays: 30,
    description: 'Pensado para empresas en crecimiento que necesitan sistemas digitales integrados y escalables.',
    features: ['Todo lo de Starter', 'Actualizaciones continuas', 'Automatizaciones', 'Integraciones', 'Soporte prioritario'],
  },
  BUSINESS: {
    code: 'BUSINESS',
    name: 'Business',
    price: 89900,
    currency: 'ARS',
    billingCycle: 'MONTHLY',
    durationDays: 30,
    description: 'Para equipos que necesitan arquitectura robusta, procesos complejos y evolutivos de alto impacto.',
    features: ['Todo lo de Premium', 'Infraestructura escalable', 'Soporte dedicado', 'Optimización avanzada', 'SaaS / acceso a producto'],
  },
}

export const PURCHASABLE_PLAN_CODES = Object.keys(PLAN_CATALOG)

export function getPlan(code) {
  if (!code) return null
  return PLAN_CATALOG[String(code).toUpperCase()] || null
}

export function isPurchasablePlan(code) {
  return Boolean(getPlan(code))
}

export function listPublicPlans() {
  return PURCHASABLE_PLAN_CODES.map((code) => PLAN_CATALOG[code])
}

export function computePlanEndDate(startDate, planCode) {
  const plan = getPlan(planCode)
  const days = plan?.durationDays || 30
  const base = startDate ? new Date(startDate) : new Date()
  return new Date(base.getTime() + days * 24 * 60 * 60 * 1000)
}
