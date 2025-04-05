const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

// Conexión DB
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'gs_stock',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

const JWT_SECRET = process.env.JWT_SECRET || 'fba7a07f4174d84d67ad67aedf16422a';

// Middleware JWT
const authenticateJWT = (allowedRoles = []) => {
  return async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Token no proporcionado' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const result = await pool.query(
        `SELECT u.id, u.nombre, u.apellido, r.rol 
        FROM usuarios u
        JOIN roles r ON u.id_roles = r.id
        WHERE u.id = $1`,
        [decoded.id]
      );

      if (result.rows.length === 0) return res.status(403).json({ error: 'Usuario no autorizado' });

      const user = result.rows[0];
      if (allowedRoles.length && !allowedRoles.includes(user.rol)) {
        return res.status(403).json({ error: 'No tienes permisos para esta acción' });
      }

      req.user = user;
      next();
    } catch (err) {
      return res.status(403).json({ error: 'Token inválido o expirado' });
    }
  };
};

// Perfil
router.get('/profile', authenticateJWT(), (req, res) => {
  res.json({
    message: 'Perfil de usuario',
    user: req.user
  });
});

// Ruta protegida admin
router.get('/admin', authenticateJWT(['Administrador']), (req, res) => {
  res.json({
    message: 'Acceso administrativo',
    user: req.user
  });
});

module.exports = router;
