const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const auth = require('../middleware/auth'); // Middleware de autenticación

// Configuración de la conexión a PostgreSQL usando las variables del docker-compose
const pool = new Pool({
  user: process.env.DB_USER || 'admin',
  host: process.env.DB_HOST || 'postgres',
  database: process.env.DB_NAME || 'mydb',
  password: process.env.DB_PASSWORD || 'secret',
  port: process.env.DB_PORT || 5432,
});

// Endpoint para obtener todos los usuarios (protegido)
router.get('/usuarios', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, id_roles, nombre, apellido, email, estado FROM usuarios');
    
    if (result.rows.length === 0) {
      return res.status(200).json({ message: 'No hay usuarios registrados', data: [] });
    }
    
    res.status(200).json({
      message: 'Usuarios obtenidos correctamente',
      count: result.rows.length,
      data: result.rows
    });
  } catch (err) {
    console.error('Error al obtener usuarios:', err);
    res.status(500).json({ 
      error: 'Error al consultar la base de datos',
      details: err.message
    });
  }
});

// Endpoint para obtener un usuario específico por ID (protegido)
router.get('/usuarios/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM usuarios WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    res.status(200).json({
      message: 'Usuario obtenido correctamente',
      data: result.rows[0]
    });
  } catch (err) {
    console.error('Error al obtener usuario:', err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Endpoint para obtener usuarios según su estado (protegido)
router.get('/usuarios/estado/:estado', auth, async (req, res) => {
  try {
    const estado = req.params.estado === 'true'; // Convertir string a boolean
    
    const result = await pool.query(
      'SELECT * FROM usuarios WHERE estado = $1',
      [estado]
    );
    
    res.status(200).json({
      message: ` Usuarios con estado '${estado}' obtenidos correctamente`,
      count: result.rows.length,
      data: result.rows
    });
  } catch (err) {
    console.error('Error al obtener usuarios por estado:', err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Endpoint para obtener usuarios por rol (protegido)
router.get('/usuarios/rol/:id_rol', auth, async (req, res) => {
  try {
    const { id_rol } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM usuarios WHERE id_roles = $1',
      [id_rol]
    );
    
    res.status(200).json({
      message: ` Usuarios con rol ID ${id_rol} obtenidos correctamente`,
      count: result.rows.length,
      data: result.rows
    });
  } catch (err) {
    console.error('Error al obtener usuarios por rol:', err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

module.exports = router;