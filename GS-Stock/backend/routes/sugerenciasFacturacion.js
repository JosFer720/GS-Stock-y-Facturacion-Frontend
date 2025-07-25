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
    // Obtener clientes con empresa y teléfono principal
    const clientesQuery = `
      SELECT DISTINCT
        c.id, 
        c.nombre, 
        c.apellido, 
        c.empresa,
        COALESCE(
          (SELECT t.telefono 
           FROM cliente_telefonos ct 
           JOIN telefonos t ON ct.id_telefono = t.id 
           WHERE ct.id_cliente = c.id 
           LIMIT 1), 
          'Sin teléfono'
        ) AS telefono_principal,
        COALESCE(
          (SELECT array_agg(d.direccion) 
           FROM cliente_direcciones cd 
           JOIN direcciones d ON cd.id_direccion = d.id 
           WHERE cd.id_cliente = c.id), 
          ARRAY[]::text[]
        ) AS direcciones
      FROM clientes c
      ORDER BY c.empresa, c.nombre
    `;

    const clientesResult = await pool.query(clientesQuery);

    // Obtener métodos de pago
    const metodosPagoQuery = 'SELECT id, tipo FROM metodos_de_pago ORDER BY tipo';
    const metodosResult = await pool.query(metodosPagoQuery);

    // Obtener productos disponibles con precios
    const productosQuery = `
      SELECT 
        z.id, 
        z.nombre, 
        z.codigo, 
        z.precio_venta,
        t.talla_eu, 
        t.talla_us, 
        zt.stock,
        CONCAT(z.nombre, ' - Talla EU: ', t.talla_eu, ' (Stock: ', zt.stock, ')') as descripcion_completa
      FROM zapatos z
      JOIN zapatos_tallas zt ON z.id = zt.id_zapato
      JOIN tallas t ON zt.id_talla = t.id
      WHERE zt.stock > 0
      ORDER BY z.nombre, t.talla_eu
    `;
    const productosResult = await pool.query(productosQuery);

    res.json({
      success: true,
      data: {
        clientes: clientesResult.rows,
        metodosPago: metodosResult.rows,
        productos: productosResult.rows
      }
    });
  } catch (error) {
    console.error('Error al obtener sugerencias:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error al obtener datos para autollenado',
      details: error.message 
    });
  }
});

// Buscar cliente por empresa (endpoint adicional para búsqueda específica)
router.get('/buscar-cliente-empresa/:empresa', auth, async (req, res) => {
  const { empresa } = req.params;
  
  try {
    const query = `
      SELECT 
        c.id,
        c.nombre,
        c.apellido,
        c.empresa,
        COALESCE(
          (SELECT t.telefono 
           FROM cliente_telefonos ct 
           JOIN telefonos t ON ct.id_telefono = t.id 
           WHERE ct.id_cliente = c.id 
           LIMIT 1), 
          'Sin teléfono'
        ) AS telefono,
        COALESCE(
          (SELECT d.direccion 
           FROM cliente_direcciones cd 
           JOIN direcciones d ON cd.id_direccion = d.id 
           WHERE cd.id_cliente = c.id 
           LIMIT 1), 
          'Sin dirección'
        ) AS direccion
      FROM clientes c
      WHERE LOWER(c.empresa) LIKE LOWER($1)
      ORDER BY c.nombre
    `;
    
    const result = await pool.query(query, [`%${empresa}%`]);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error al buscar cliente por empresa:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error al buscar cliente',
      details: error.message 
    });
  }
});

module.exports = router;