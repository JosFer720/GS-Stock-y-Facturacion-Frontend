// Middleware de autorización por JWT con verificación de rol contra la BD.
// Factory: authenticateJWT(['Administrador', ...]) restringe por rol; sin
// argumentos sólo exige un token válido de un usuario existente.
const jwt = require('jsonwebtoken');
const repo = require('../repositories/usersRepository');

// NOTA: fallback de JWT_SECRET conservado por compatibilidad (pendiente de rotar).
const JWT_SECRET = process.env.JWT_SECRET || 'fba7a07f4174d84d67ad67aedf16422a';

function authenticateJWT(allowedRoles = []) {
  return async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Token no proporcionado' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await repo.findUserWithRole(decoded.id);

      if (!user) return res.status(403).json({ error: 'Usuario no autorizado' });

      if (allowedRoles.length && !allowedRoles.includes(user.rol)) {
        return res.status(403).json({ error: 'No tienes permisos para esta acción' });
      }

      req.user = user;
      next();
    } catch {
      return res.status(403).json({ error: 'Token inválido o expirado' });
    }
  };
}

module.exports = authenticateJWT;
