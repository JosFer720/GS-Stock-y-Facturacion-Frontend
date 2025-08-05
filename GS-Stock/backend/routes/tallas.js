const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const auth = require('../middleware/auth');

// Configuración de la conexión a PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER || 'admin',
  host: process.env.DB_HOST || 'postgres',
  database: process.env.DB_NAME || 'mydb',
  password: process.env.DB_PASSWORD || 'secret',
  port: process.env.DB_PORT || 5432,
});

// Obtener todas las tallas
router.get('/', auth, async (req, res) => {
  try {
    const query = 'SELECT id, talla_eu, talla_us FROM Tallas ORDER BY talla_eu';
    const result = await pool.query(query);
    
    res.json({
      success: true,
      data: result.rows,
      message: 'Tallas obtenidas correctamente'
    });
  } catch (error) {
    console.error('Error al obtener tallas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener tallas'
    });
  }
});

module.exports = router;