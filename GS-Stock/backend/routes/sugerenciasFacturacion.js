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

// Obtener datos para autollenado del formulario
router.get('/sugerencias-facturacion', auth, async (req, res) => {
  try {
    // Obtener clientes con sus direcciones
    const clientesQuery = `
      SELECT c.id, c.nombre, c.apellido, c.empresa, d.direccion 
      FROM clientes c
      LEFT JOIN cliente_direcciones cd ON c.id = cd.id_cliente
      LEFT JOIN direcciones d ON cd.id_direccion = d.id
    `;
    const clientesResult = await pool.query(clientesQuery);

    // Obtener métodos de pago
    const metodosPagoQuery = 'SELECT id, tipo FROM metodos_de_pago';
    const metodosResult = await pool.query(metodosPagoQuery);

    // Obtener productos disponibles
    const productosQuery = `
      SELECT z.id, z.nombre, z.codigo, t.talla_eu, t.talla_us, zt.stock
      FROM zapatos z
      JOIN zapatos_tallas zt ON z.id = zt.id_zapato
      JOIN tallas t ON zt.id_talla = t.id
      WHERE zt.stock > 0
    `;
    const productosResult = await pool.query(productosQuery);

    res.json({
      clientes: clientesResult.rows,
      metodosPago: metodosResult.rows,
      productos: productosResult.rows
    });
  } catch (error) {
    console.error('Error al obtener sugerencias:', error);
    res.status(500).json({ error: 'Error al obtener datos para autollenado' });
  }
});

module.exports = router;