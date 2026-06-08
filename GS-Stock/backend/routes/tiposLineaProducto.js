const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// Endpoint para obtener tipos de línea de producto
router.get('/', auth, async (req, res) => {
  try {
    console.log('🔍 Obteniendo tipos de línea de producto...');
    
    const query = `
      SELECT 
        Id AS id,
        Nombre AS nombre,
        Descripcion as descripcion,
        Activo as activo,
        Fecha_Creacion as fecha_creacion
      FROM Tipos_Linea_Producto 
      WHERE Activo = TRUE
      ORDER BY Nombre ASC
    `;
    
    const result = await pool.query(query);
    
    console.log(`✅ Se encontraron ${result.rows.length} tipos de línea`);
    console.log('Datos:', result.rows);
    
    res.status(200).json({
      success: true,
      message: 'Tipos de línea de producto obtenidos correctamente',
      data: result.rows,
      total: result.rows.length
    });
    
  } catch (error) {
    console.error('❌ Error al obtener tipos de línea de producto:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message
    });
  }
});

// Endpoint para crear tipos de línea (útil para debugging)
router.post('/', auth, async (req, res) => {
  try {
    const { nombre, descripcion } = req.body;
    
    if (!nombre) {
      return res.status(400).json({
        success: false,
        error: 'El nombre es requerido'
      });
    }
    
    const query = `
      INSERT INTO Tipos_Linea_Producto (Nombre, Descripcion)
      VALUES ($1, $2)
      RETURNING *
    `;
    
    const result = await pool.query(query, [nombre, descripcion]);
    
    res.status(201).json({
      success: true,
      message: 'Tipo de línea creado correctamente',
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error al crear tipo de línea:', error);
    
    if (error.code === '23505') { // Violación de unique constraint
      return res.status(400).json({
        success: false,
        error: 'Ya existe un tipo de línea con ese nombre'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message
    });
  }
});

module.exports = router;