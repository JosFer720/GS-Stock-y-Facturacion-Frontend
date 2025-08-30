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

// Get clients with pending payments (id_pedido_estado_pago = 1)
router.get('/clientes-pendientes', auth, async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT c.* 
      FROM Clientes c
      INNER JOIN Pedidos p ON c.Id = p.Id_Cliente
      WHERE p.Id_Pedido_Estado_Pago = 1
      ORDER BY c.Nombre, c.Apellido
    `;
    
    const result = await pool.query(query);
    res.json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    console.error('Error al obtener clientes con pagos pendientes:', err);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Get pending orders for a specific client (id_pedido_estado_pago = 1)
router.get('/pedidos-cliente/:clienteId', auth, async (req, res) => {
  try {
    const { clienteId } = req.params;
    
    const query = `
      SELECT 
        p.Id,
        p.Total,
        p.Fecha,
        pep.Estado as estado_pago,
        CONCAT(c.Nombre, ' ', c.Apellido) as cliente_nombre,
        c.Empresa
      FROM Pedidos p
      INNER JOIN Clientes c ON p.Id_Cliente = c.Id
      INNER JOIN pedidos_estado_pago pep ON p.Id_Pedido_Estado_Pago = pep.Id
      WHERE p.Id_Cliente = $1 AND p.Id_Pedido_Estado_Pago = 1
      ORDER BY p.Fecha DESC
    `;
    
    const result = await pool.query(query, [clienteId]);
    res.json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    console.error('Error al obtener pedidos del cliente:', err);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Register a new payment
router.post('/', auth, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id_pedido, id_metodo_pago, monto_pagado, observaciones } = req.body;
    
    // Get the order details
    const orderQuery = `
      SELECT p.Total, p.Id_Cliente, p.Id_Pedido_Estado_Pago
      FROM Pedidos p
      WHERE p.Id = $1
    `;
    
    const orderResult = await client.query(orderQuery, [id_pedido]);
    
    if (orderResult.rows.length === 0) {
      throw new Error('Pedido no encontrado');
    }
    
    const order = orderResult.rows[0];
    const currentTotal = parseFloat(order.total);
    
    if (currentTotal <= 0 && order.id_pedido_estado_pago === 2) {
      throw new Error('Este pedido ya ha sido pagado completamente');
    }
    
    // Calculate change if payment amount exceeds the remaining total
    let vuelto = 0;
    let newTotal = currentTotal - monto_pagado;
    
    if (newTotal < 0) {
      vuelto = Math.abs(newTotal);
      newTotal = 0;
    }
    
    // Insert payment record
    const insertPaymentQuery = `
      INSERT INTO pagos_pedidos 
        (Id_Pedido, Id_Metodos_De_Pago, Monto_Pagado, Vuelto, Observaciones, Fecha_De_Pago)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      RETURNING *
    `;
    
    const paymentResult = await client.query(insertPaymentQuery, [
      id_pedido, 
      id_metodo_pago, 
      monto_pagado, 
      vuelto > 0 ? vuelto : null, 
      observaciones
    ]);
    
    // Update order total and payment status
    let paymentStatus = 1; // pendiente
    if (newTotal <= 0) {
      paymentStatus = 2; // pagado
    }
    
    const updateOrderQuery = `
      UPDATE Pedidos 
      SET Total = $1, Id_Pedido_Estado_Pago = $2
      WHERE Id = $3
    `;
    
    await client.query(updateOrderQuery, [newTotal, paymentStatus, id_pedido]);
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      data: {
        payment: paymentResult.rows[0],
        newOrderTotal: newTotal,
        paymentStatus: paymentStatus === 2 ? 'pagado' : 'pendiente',
        vuelto: vuelto > 0 ? vuelto : 0
      },
      message: 'Pago registrado exitosamente'
    });
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al registrar pago:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Error interno del servidor'
    });
  } finally {
    client.release();
  }
});

// Get payment history
router.get('/', auth, async (req, res) => {
  try {
    const query = `
      SELECT 
        pp.Id,
        pp.Id_Pedido,
        pp.Monto_Pagado,
        pp.Vuelto,
        pp.Observaciones,
        pp.Fecha_De_Pago,
        mdp.Tipo as metodo_pago,
        p.Total as total_pedido,
        CONCAT(c.Nombre, ' ', c.Apellido) as cliente_nombre,
        c.Apellido as cliente_apellido,
        c.Empresa,
        CONCAT(u.Nombre, ' ', u.Apellido) as vendedor_nombre,
        pep.Estado as estado_pago
      FROM pagos_pedidos pp
      INNER JOIN Pedidos p ON pp.Id_Pedido = p.Id
      INNER JOIN Clientes c ON p.Id_Cliente = c.Id
      INNER JOIN Vendedores v ON p.Id_Vendedor = v.Id
      INNER JOIN Usuarios u ON v.Id_Usuarios = u.Id
      INNER JOIN Metodos_De_Pago mdp ON pp.Id_Metodos_De_Pago = mdp.Id
      INNER JOIN pedidos_estado_pago pep ON p.Id_Pedido_Estado_Pago = pep.Id
      ORDER BY pp.Fecha_De_Pago DESC
    `;
    
    const result = await pool.query(query);
    res.json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    console.error('Error al obtener historial de pagos:', err);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

module.exports = router;