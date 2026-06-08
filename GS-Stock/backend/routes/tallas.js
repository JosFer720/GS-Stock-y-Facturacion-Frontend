const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

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