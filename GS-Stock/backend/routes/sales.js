const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const SocketService = require('../services/socketService');

// Configuración de conexión PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER || 'admin',
  host: process.env.DB_HOST || 'postgres',
  database: process.env.DB_NAME || 'mydb',
  password: process.env.DB_PASSWORD || 'secret',
  port: process.env.DB_PORT || 5432,
});

// Middleware para obtener el servicio socket
router.use((req, res, next) => {
  const io = req.app.get('socketio');
  req.socketService = new SocketService(io);
  next();
});

// Endpoint para registrar una venta
router.post('/register', async (req, res) => {
  try {
    const { producto_id, cantidad, subtotal, total, vendedor_id, fecha_venta } = req.body;

    // Insertar venta en la base de datos
    const query = `
      INSERT INTO ventas (producto_id, cantidad, subtotal, total, vendedor_id, fecha_venta)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    // Usar fecha_venta si viene, o la actual si no
    const fecha = fecha_venta || new Date();

    const values = [producto_id, cantidad, subtotal, total, vendedor_id, fecha];

    const result = await pool.query(query, values);

    const nuevaVenta = result.rows[0];

    // Emitir evento para actualizar en tiempo real
    req.socketService.emitNewSale(nuevaVenta);

    res.json({
      success: true,
      data: nuevaVenta,
      message: 'Venta registrada correctamente'
    });
  } catch (error) {
    console.error('Error registrando venta:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar la venta'
    });
  }
});

module.exports = router;
