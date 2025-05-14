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

// Middleware para verificar token JWT
// Este middleware debe implementarse en un archivo separado
// y ser importado aquí como se muestra arriba

// Endpoint para obtener todos los inventarios (protegido)
router.get('/inventarios', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, cantidad, id_zapatos, fecha_de_ingreso, id_usuarios, estado FROM inventarios');
    
    if (result.rows.length === 0) {
      return res.status(200).json({ message: 'No hay inventarios registrados', data: [] });
    }
    
    res.status(200).json({
      message: 'Inventarios obtenidos correctamente',
      count: result.rows.length,
      data: result.rows
    });
  } catch (err) {
    console.error('Error al obtener inventarios:', err);
    res.status(500).json({ 
      error: 'Error al consultar la base de datos',
      details: err.message
    });
  }
});

// Endpoint para obtener un inventario específico por ID (protegido)
router.get('/inventarios/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM inventarios WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Inventario no encontrado' });
    }
    
    res.status(200).json({
      message: 'Inventario obtenido correctamente',
      data: result.rows[0]
    });
  } catch (err) {
    console.error('Error al obtener inventario:', err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Crear un nuevo inventario (protegido)
router.post('/inventarios', auth, async (req, res) => {
  try {
    const { cantidad, id_zapatos, id_usuarios, estado } = req.body;
    
    // Validación básica
    if (!cantidad || !id_zapatos || !id_usuarios || !estado) {
      return res.status(400).json({ 
        error: 'Los campos cantidad, id_zapatos, id_usuarios y estado son obligatorios' 
      });
    }
    
    // Validar que la cantidad sea un número positivo
    if (isNaN(cantidad) || cantidad <= 0) {
      return res.status(400).json({ 
        error: 'La cantidad debe ser un número positivo' 
      });
    }
    
    const result = await pool.query(
      `INSERT INTO inventarios 
       (cantidad, id_zapatos, id_usuarios, estado) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [cantidad, id_zapatos, id_usuarios, estado]
    );
    
    res.status(201).json({
      message: 'Inventario creado correctamente',
      data: result.rows[0]
    });
  } catch (err) {
    console.error('Error al crear inventario:', err);
    res.status(500).json({ 
      error: 'Error en el servidor',
      details: err.message 
    });
  }
});

// Actualizar un inventario existente (protegido)
router.put('/inventarios/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { cantidad, id_zapatos, id_usuarios, estado } = req.body;
    
    // Validación básica
    if (!cantidad || !id_zapatos || !id_usuarios || !estado) {
      return res.status(400).json({ 
        error: 'Los campos cantidad, id_zapatos, id_usuarios y estado son obligatorios' 
      });
    }
    
    // Validar que la cantidad sea un número positivo
    if (isNaN(cantidad)) {
      return res.status(400).json({ 
        error: 'La cantidad debe ser un número' 
      });
    }
    
    // Validar que el inventario existe
    const checkResult = await pool.query(
      'SELECT * FROM inventarios WHERE id = $1',
      [id]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Inventario no encontrado' });
    }
    
    // Actualizar el inventario
    const result = await pool.query(
      `UPDATE inventarios 
       SET cantidad = $1, id_zapatos = $2, id_usuarios = $3, estado = $4 
       WHERE id = $5 
       RETURNING *`,
      [cantidad, id_zapatos, id_usuarios, estado, id]
    );
    
    res.status(200).json({
      message: 'Inventario actualizado correctamente',
      data: result.rows[0]
    });
  } catch (err) {
    console.error('Error al actualizar inventario:', err);
    res.status(500).json({ 
      error: 'Error en el servidor',
      details: err.message 
    });
  }
});

// Eliminar un inventario (protegido) 
router.delete('/inventarios/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validar que el inventario existe
    const checkResult = await pool.query(
      'SELECT * FROM inventarios WHERE id = $1',
      [id]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Inventario no encontrado' });
    }
    
    // Eliminar el inventario
    await pool.query('DELETE FROM inventarios WHERE id = $1', [id]);
    
    res.status(200).json({
      message: 'Inventario eliminado correctamente'
    });
  } catch (err) {
    console.error('Error al eliminar inventario:', err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Endpoint para obtener inventarios según su estado (protegido)
router.get('/inventarios/estado/:estado', auth, async (req, res) => {
  try {
    const { estado } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM inventarios WHERE estado = $1',
      [estado]
    );
    
    res.status(200).json({
      message: `Inventarios con estado '${estado}' obtenidos correctamente`,
      count: result.rows.length,
      data: result.rows
    });
  } catch (err) {
    console.error('Error al obtener inventarios por estado:', err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

module.exports = router;