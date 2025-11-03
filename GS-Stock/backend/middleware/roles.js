const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'fba7a07f4174d84d67ad67aedf16422a';

const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Acceso denegado.' });
      }
      
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      
      if (!allowedRoles.includes(decoded.rol)) {
        return res.status(403).json({ error: 'No tienes permiso para esta acción.' });
      }
      
      req.user = decoded;
      next();
    } catch (error) {
      res.status(401).json({ error: 'Error de autenticación.' });
    }
  };
};

const roles = {
  admin: ['Super Admin', 'Administrador'],
  secretaria: ['Super Admin', 'Secretaria', 'Administrador'],
  vendedor: ['Super Admin', 'Vendedor', 'Administrador'],
  inventario: ['Super Admin', 'Encargado de Inventario', 'Administrador']
};

module.exports = { checkRole, roles };