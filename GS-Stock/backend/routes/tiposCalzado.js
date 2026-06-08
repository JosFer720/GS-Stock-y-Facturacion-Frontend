const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// Obtener todos los tipos de calzado
router.get('/', auth, async (req, res) => {
  try {
    const query = 'SELECT id, tipo FROM Tipos_De_Calzados ORDER BY tipo';
    const result = await pool.query(query);
    
    res.json({
      success: true,
      data: result.rows,
      message: 'Tipos de calzado obtenidos correctamente'
    });
  } catch (error) {
    console.error('Error al obtener tipos de calzado:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener tipos de calzado'
    });
  }
});

module.exports = router;