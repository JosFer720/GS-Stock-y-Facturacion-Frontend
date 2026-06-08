const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// Obtener todas las facturas con filtros 
router.get('/', auth, async (req, res) => {
  try {
    const { fecha, cliente } = req.query;
    
    let query = `
      SELECT 
        f.id,
        f.id_pedido,
        f.fecha_emision,
        f.subtotal,
        f.impuestos,
        f.total,
        f.estado,
        c.nombre as nombre_cliente,
        c.apellido as apellido_cliente,
        c.empresa,
        p.fecha as fecha_pedido,
        u.nombre || ' ' || u.apellido as vendedor_nombre
      FROM Facturas f
      INNER JOIN Pedidos p ON f.id_pedido = p.id
      INNER JOIN Clientes c ON p.id_cliente = c.id
      LEFT JOIN Vendedores v ON p.id_vendedor = v.id
      LEFT JOIN Usuarios u ON v.id_usuarios = u.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;
    
    // Filtro por fecha
    if (fecha) {
      query += ` AND DATE(f.fecha_emision) = $${paramCount}`;
      params.push(fecha);
      paramCount++;
    }
    
    // Filtro por cliente
    if (cliente) {
      query += ` AND (LOWER(c.nombre) LIKE LOWER($${paramCount}) OR LOWER(c.apellido) LIKE LOWER($${paramCount}) OR LOWER(c.empresa) LIKE LOWER($${paramCount}))`;
      params.push(`%${cliente}%`);
      paramCount++;
    }
    
    query += ` ORDER BY f.fecha_emision DESC`;
    
    console.log('Query facturas:', query);
    console.log('Params:', params);
    
    const result = await pool.query(query, params);
    
    res.json(result.rows);
    
  } catch (error) {
    console.error('Error al obtener facturas:', error);
    res.status(500).json({ 
      error: 'Error al obtener facturas',
      details: error.message 
    });
  }
});

// Obtener una factura específica por ID
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT 
        f.*,
        c.nombre as nombre_cliente,
        c.apellido as apellido_cliente,
        c.empresa,
        p.fecha as fecha_pedido,
        u.nombre || ' ' || u.apellido as vendedor_nombre,
        mp.tipo as metodo_pago
      FROM Facturas f
      INNER JOIN Pedidos p ON f.id_pedido = p.id
      INNER JOIN Clientes c ON p.id_cliente = c.id
      LEFT JOIN Vendedores v ON p.id_vendedor = v.id
      LEFT JOIN Usuarios u ON v.id_usuarios = u.id
      LEFT JOIN Metodos_De_Pago mp ON p.id_metodo_de_pago = mp.id
      WHERE f.id = $1
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Factura no encontrada' });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error al obtener factura:', error);
    res.status(500).json({ 
      error: 'Error al obtener factura',
      details: error.message 
    });
  }
});

// Obtener detalles de una factura 
router.get('/:id/detalles', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const facturaQuery = `
      SELECT 
        f.*,
        c.nombre as nombre_cliente,
        c.apellido as apellido_cliente,
        c.empresa,
        p.fecha as fecha_pedido,
        u.nombre || ' ' || u.apellido as vendedor_nombre,
        mp.tipo as metodo_pago
      FROM Facturas f
      INNER JOIN Pedidos p ON f.id_pedido = p.id
      INNER JOIN Clientes c ON p.id_cliente = c.id
      LEFT JOIN Vendedores v ON p.id_vendedor = v.id
      LEFT JOIN Usuarios u ON v.id_usuarios = u.id
      LEFT JOIN Metodos_De_Pago mp ON p.id_metodo_de_pago = mp.id
      WHERE f.id = $1
    `;
    
    const productosQuery = `
      SELECT 
        dp.cantidad,
        z.codigo,
        z.nombre as zapato_nombre,
        tc.tipo as tipo_calzado,
        t.talla_eu,
        t.talla_us
      FROM Detalle_Pedidos dp
      INNER JOIN Zapatos z ON dp.id_zapato = z.id
      LEFT JOIN Tipos_De_Calzados tc ON z.id_tipo_de_zapato = tc.id
      LEFT JOIN Zapatos_Tallas zt ON z.id = zt.id_zapato
      LEFT JOIN Tallas t ON zt.id_talla = t.id
      INNER JOIN Pedidos p ON dp.id_pedido = p.id
      INNER JOIN Facturas f ON p.id = f.id_pedido
      WHERE f.id = $1
    `;
    
    const [facturaResult, productosResult] = await Promise.all([
      pool.query(facturaQuery, [id]),
      pool.query(productosQuery, [id])
    ]);
    
    if (facturaResult.rows.length === 0) {
      return res.status(404).json({ error: 'Factura no encontrada' });
    }
    
    res.json({
      success: true,
      data: {
        factura: facturaResult.rows[0],
        productos: productosResult.rows
      }
    });
    
  } catch (error) {
    console.error('Error al obtener detalles de factura:', error);
    res.status(500).json({ 
      error: 'Error al obtener detalles de factura',
      details: error.message 
    });
  }
});

module.exports = router;