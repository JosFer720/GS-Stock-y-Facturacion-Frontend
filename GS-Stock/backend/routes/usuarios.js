const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const auth = require('../middleware/auth');

const pool = new Pool({
  user: process.env.DB_USER || 'admin',
  host: process.env.DB_HOST || 'postgres',
  database: process.env.DB_NAME || 'mydb',
  password: process.env.DB_PASSWORD || 'secret',
  port: process.env.DB_PORT || 5432,
});

// Obtener todos los usuarios
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

// Crear un nuevo usuario
router.post('/usuarios', auth, async (req, res) => {
  try {
    const { nombre, apellido, email, id_roles, estado } = req.body;
    
    // Validación básica
    if (!nombre || !apellido || !id_roles) {
      return res.status(400).json({ error: 'Nombre, apellido y rol son obligatorios' });
    }

    const result = await pool.query(
      'INSERT INTO usuarios (nombre, apellido, email, id_roles, estado) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [nombre, apellido, email, id_roles, estado]
    );

    res.status(201).json({
      message: 'Usuario creado correctamente',
      data: result.rows[0]
    });
  } catch (err) {
    console.error('Error al crear usuario:', err);
    res.status(500).json({ 
      error: 'Error al crear el usuario',
      details: err.message
    });
  }
});

// Actualizar un usuario
router.put('/usuarios/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, apellido, email, id_roles, estado } = req.body;
    
    const result = await pool.query(
      'UPDATE usuarios SET nombre = $1, apellido = $2, email = $3, id_roles = $4, estado = $5 WHERE id = $6 RETURNING *',
      [nombre, apellido, email, id_roles, estado, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.status(200).json({
      message: 'Usuario actualizado correctamente',
      data: result.rows[0]
    });
  } catch (err) {
    console.error('Error al actualizar usuario:', err);
    res.status(500).json({ 
      error: 'Error al actualizar el usuario',
      details: err.message
    });
  }
});

// Desactivar un usuario (marcar como inactivo)
router.put('/usuarios/:id/deactivate', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'UPDATE usuarios SET estado = false WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.status(200).json({
      message: 'Usuario desactivado correctamente',
      data: result.rows[0]
    });
  } catch (err) {
    console.error('Error al desactivar usuario:', err);
    res.status(500).json({ 
      error: 'Error al desactivar el usuario',
      details: err.message
    });
  }
});

// Eliminar un usuario (eliminación física)
router.delete('/usuarios/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM usuarios WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.status(200).json({
      message: 'Usuario eliminado correctamente',
      data: result.rows[0]
    });
  } catch (err) {
    console.error('Error al eliminar usuario:', err);
    res.status(500).json({ 
      error: 'Error al eliminar el usuario',
      details: err.message
    });
  }
});

// Obtener un usuario específico por ID
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

// Obtener usuarios por estado
router.get('/usuarios/estado/:estado', auth, async (req, res) => {
  try {
    const estado = req.params.estado === 'true';
    
    const result = await pool.query(
      'SELECT * FROM usuarios WHERE estado = $1',
      [estado]
    );
    
    res.status(200).json({
      message: `Usuarios con estado '${estado}' obtenidos correctamente`,
      count: result.rows.length,
      data: result.rows
    });
  } catch (err) {
    console.error('Error al obtener usuarios por estado:', err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Obtener usuarios por rol
router.get('/usuarios/rol/:id_rol', auth, async (req, res) => {
  try {
    const { id_rol } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM usuarios WHERE id_roles = $1',
      [id_rol]
    );
    
    res.status(200).json({
      message: `Usuarios con rol ID ${id_rol} obtenidos correctamente`,
      count: result.rows.length,
      data: result.rows
    });
  } catch (err) {
    console.error('Error al obtener usuarios por rol:', err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

module.exports = router;