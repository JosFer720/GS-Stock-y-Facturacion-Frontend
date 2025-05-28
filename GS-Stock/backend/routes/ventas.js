const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const auth = require('../middleware/auth'); // Añadido: Importar middleware de autenticación

// Configuración de la conexión a PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER || 'admin',
  host: process.env.DB_HOST || 'postgres',
  database: process.env.DB_NAME || 'mydb',
  password: process.env.DB_PASSWORD || 'secret',
  port: process.env.DB_PORT || 5432,
});

// Endpoint para obtener todas las ventas (protegido)
router.get('/ventas', auth, async (req, res) => { // Añadido: middleware auth
  try {
    const query = `
      SELECT 
        p.Id AS pedido_id,
        c.Nombre || ' ' || c.Apellido AS cliente,
        ep.Estado AS estado_pedido,
        u.Nombre || ' ' || u.Apellido AS vendedor,
        mp.Tipo AS metodo_pago,
        p.Fecha,
        p.Subtotal,
        p.Total,
        dp.Cantidad,
        z.Nombre AS zapato
      FROM Pedidos p
      JOIN Detalle_Pedidos dp ON p.Id = dp.Id_Pedido
      JOIN Clientes c ON p.Id_Cliente = c.Id
      JOIN Estados_Pedidos ep ON p.Id_Estado_Pedido = ep.Id
      JOIN Vendedores v ON p.Id_Vendedor = v.Id
      JOIN Usuarios u ON v.Id_Usuarios = u.Id
      JOIN Metodos_De_Pago mp ON p.Id_Metodo_De_Pago = mp.Id
      JOIN Zapatos z ON dp.Id_Zapato = z.Id
      ORDER BY p.Fecha DESC
    `;
    
    const result = await pool.query(query);
    
    if (result.rows.length === 0) {
      return res.status(200).json({ 
        message: 'No hay ventas registradas', 
        data: [] 
      });
    }
    
    // Agrupar los detalles por pedido
    const ventasAgrupadas = {};
    result.rows.forEach(row => {
      if (!ventasAgrupadas[row.pedido_id]) {
        ventasAgrupadas[row.pedido_id] = {
          pedido_id: row.pedido_id,
          cliente: row.cliente,
          estado_pedido: row.estado_pedido,
          vendedor: row.vendedor,
          metodo_pago: row.metodo_pago,
          fecha: row.fecha,
          subtotal: row.subtotal,
          total: row.total,
          productos: []
        };
      }
      ventasAgrupadas[row.pedido_id].productos.push({
        zapato: row.zapato,
        cantidad: row.cantidad
      });
    });
    
    res.status(200).json({
      message: 'Ventas obtenidas correctamente',
      count: Object.keys(ventasAgrupadas).length,
      data: Object.values(ventasAgrupadas)
    });
  } catch (err) {
    console.error('Error al obtener ventas:', err);
    res.status(500).json({ 
      error: 'Error al consultar la base de datos',
      details: err.message
    });
  }
});

// Endpoint para obtener una venta específica por ID de pedido (protegido)
router.get('/ventas/:id', auth, async (req, res) => { // Añadido: middleware auth
  try {
    const { id } = req.params;
    
    const query = `
      SELECT 
        p.Id AS pedido_id,
        c.Nombre || ' ' || c.Apellido AS cliente,
        ep.Estado AS estado_pedido,
        u.Nombre || ' ' || u.Apellido AS vendedor,
        mp.Tipo AS metodo_pago,
        p.Fecha,
        p.Subtotal,
        p.Total,
        dp.Cantidad,
        z.Nombre AS zapato
      FROM Pedidos p
      JOIN Detalle_Pedidos dp ON p.Id = dp.Id_Pedido
      JOIN Clientes c ON p.Id_Cliente = c.Id
      JOIN Estados_Pedidos ep ON p.Id_Estado_Pedido = ep.Id
      JOIN Vendedores v ON p.Id_Vendedor = v.Id
      JOIN Usuarios u ON v.Id_Usuarios = u.Id
      JOIN Metodos_De_Pago mp ON p.Id_Metodo_De_Pago = mp.Id
      JOIN Zapatos z ON dp.Id_Zapato = z.Id
      WHERE p.Id = $1
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }
    
    // Estructurar la respuesta
    const venta = {
      pedido_id: result.rows[0].pedido_id,
      cliente: result.rows[0].cliente,
      estado_pedido: result.rows[0].estado_pedido,
      vendedor: result.rows[0].vendedor,
      metodo_pago: result.rows[0].metodo_pago,
      fecha: result.rows[0].fecha,
      subtotal: result.rows[0].subtotal,
      total: result.rows[0].total,
      productos: result.rows.map(row => ({
        zapato: row.zapato,
        cantidad: row.cantidad
      }))
    };
    
    res.status(200).json({
      message: 'Venta obtenida correctamente',
      data: venta
    });
  } catch (err) {
    console.error('Error al obtener venta:', err);
    res.status(500).json({ 
      error: 'Error en el servidor',
      details: err.message
    });
  }
});

module.exports = router;