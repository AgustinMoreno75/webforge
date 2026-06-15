import { verifyAccessToken } from '../lib/auth.js'

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || ''
  const [scheme, token] = authHeader.split(' ')

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({
      success: false,
      message: 'No autorizado. Token requerido.',
    })
  }

  try {
    const payload = verifyAccessToken(token)
    req.user = payload
    return next()
  } catch {
    return res.status(401).json({
      success: false,
      message: 'Token invalido o expirado.',
    })
  }
}

export function requireRole(allowedRoles) {
  return (req, res, next) => {
    const accountType = req.user?.accountType
    const hasRole = typeof accountType === 'string' && allowedRoles.includes(accountType)

    if (!hasRole) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para esta accion.',
      })
    }

    return next()
  }
}
