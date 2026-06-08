const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// Get clients with pending payments (id_pedido_estado_pago = 1)
router.get('/clientes-pendientes', auth, async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT c.* 
      FROM Clientes c
      INNER JOIN Pedidos p ON c.id = p.id_cliente
      WHERE p.id_pedido_estado_pago = 1
      ORDER BY c.nombre, c.apellido
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

// CORREGIDO: Get ALL pending orders for a specific client (id_pedido_estado_pago = 1)
// Excluye pedidos con devolución completa y ajusta el total si hay devolución parcial
router.get('/pedidos-cliente/:clienteId', auth, async (req, res) => {
  try {
    const { clienteId } = req.params;
    
    console.log(`Buscando pedidos pendientes para cliente ID: ${clienteId}`);
    
    const query = `
      SELECT 
        p.id,
        p.total as total_original,
        COALESCE(p.total - COALESCE(d.monto, 0), p.total) as total,
        p.fecha,
        pep.estado as estado_pago,
        CONCAT(c.nombre, ' ', c.apellido) as cliente_nombre,
        c.empresa,
        COALESCE(d.monto, 0) as monto_devuelto,
        CASE WHEN d.id IS NOT NULL THEN true ELSE false END as tiene_devolucion,
        COALESCE((
          SELECT pp.total_pedido
          FROM pagos_pedidos pp
          WHERE pp.id_pedido = p.id
          ORDER BY pp.id DESC
          LIMIT 1
        ), COALESCE(p.total - COALESCE(d.monto, 0), p.total)) as saldo_pendiente,
        COALESCE((
          SELECT SUM(pp.monto_pagado)
          FROM pagos_pedidos pp
          WHERE pp.id_pedido = p.id
        ), 0) as monto_pagado
      FROM Pedidos p
      INNER JOIN Clientes c ON p.id_cliente = c.id
      INNER JOIN pedidos_estado_pago pep ON p.id_pedido_estado_pago = pep.id
      LEFT JOIN Devoluciones d ON p.id = d.id_pedido
      WHERE p.id_cliente = $1 
        AND p.id_pedido_estado_pago = 1
        AND (d.id IS NULL OR d.monto < p.total)
      ORDER BY p.fecha DESC
    `;
    
    const result = await pool.query(query, [clienteId]);
    
    console.log(`Encontrados ${result.rows.length} pedidos pendientes para cliente ${clienteId}`);
    
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
    
    console.log('Registrando pago:', { id_pedido, id_metodo_pago, monto_pagado });
    
    // Validate that monto_pagado is a positive number
    if (!monto_pagado || monto_pagado <= 0) {
      throw new Error('El monto pagado debe ser mayor a cero');
    }
    
    // Get the order details including the current total from pedidos
    const orderQuery = `
      SELECT p.total, p.id_cliente, p.id_pedido_estado_pago
      FROM Pedidos p
      WHERE p.id = $1
    `;
    
    const orderResult = await client.query(orderQuery, [id_pedido]);
    
    if (orderResult.rows.length === 0) {
      throw new Error('Pedido no encontrado');
    }
    
    const order = orderResult.rows[0];
    const originalTotal = parseFloat(order.total);
    
    if (originalTotal <= 0 && order.id_pedido_estado_pago === 2) {
      throw new Error('Este pedido ya ha sido pagado completamente');
    }
    
    // Get the latest payment record for this order to get the current remaining balance
    const latestPaymentQuery = `
      SELECT total_pedido 
      FROM pagos_pedidos 
      WHERE id_pedido = $1 
      ORDER BY id DESC 
      LIMIT 1
    `;
    
    const latestPaymentResult = await client.query(latestPaymentQuery, [id_pedido]);
    
    let currentBalance = originalTotal;
    
    // If there are previous payments, use the latest total_pedido (which is the remaining balance)
    if (latestPaymentResult.rows.length > 0) {
      currentBalance = parseFloat(latestPaymentResult.rows[0].total_pedido);
    }
    
    // VALIDACIÓN: No permitir que el monto pagado sea mayor al saldo pendiente
    if (monto_pagado > currentBalance) {
      throw new Error(`El monto ingresado (Q${monto_pagado.toFixed(2)}) excede el saldo pendiente (Q${currentBalance.toFixed(2)})`);
    }
    
    // Calculate change if payment amount exceeds the remaining balance
    let vuelto = 0;
    let newBalance = currentBalance - monto_pagado;
    
    if (newBalance < 0) {
      vuelto = Math.abs(newBalance);
      newBalance = 0;
    }
    
    // Insert payment record with the NEW balance (after this payment)
    const insertPaymentQuery = `
      INSERT INTO pagos_pedidos 
        (id_pedido, total_pedido, id_metodos_de_pago, monto_pagado, vuelto, observaciones, fecha_de_pago)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      RETURNING *
    `;
    
    const paymentResult = await client.query(insertPaymentQuery, [
      id_pedido, 
      newBalance, // Store the NEW remaining balance after this payment
      id_metodo_pago, 
      monto_pagado, 
      vuelto > 0 ? vuelto : null, 
      observaciones
    ]);
    
    // Update order payment status based on the new balance
    let paymentStatus = 1; // pendiente
    if (newBalance <= 0) {
      paymentStatus = 2; // pagado
    }
    
    const updateOrderStatusQuery = `
      UPDATE Pedidos 
      SET id_pedido_estado_pago = $1
      WHERE id = $2
    `;
    
    await client.query(updateOrderStatusQuery, [paymentStatus, id_pedido]);
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      data: {
        payment: paymentResult.rows[0],
        newBalance: newBalance,
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

// CORREGIDO: Get payment history with proper table names
router.get('/', auth, async (req, res) => {
  try {
    const query = `
      SELECT 
        pp.id,
        pp.id_pedido,
        pp.total_pedido as remaining_balance,
        pp.monto_pagado,
        pp.vuelto,
        pp.observaciones,
        pp.fecha_de_pago,
        mdp.tipo as metodo_pago,
        p.total as pedido_original_total,
        CONCAT(c.nombre, ' ', c.apellido) as cliente_nombre,
        c.apellido as cliente_apellido,
        c.empresa,
        CONCAT(u.nombre, ' ', u.apellido) as vendedor_nombre,
        pep.estado as estado_pago
      FROM pagos_pedidos pp
      INNER JOIN Pedidos p ON pp.id_pedido = p.id
      INNER JOIN Clientes c ON p.id_cliente = c.id
      INNER JOIN Usuarios u ON p.id_vendedor = u.id
      INNER JOIN metodos_de_pago mdp ON pp.id_metodos_de_pago = mdp.id
      INNER JOIN pedidos_estado_pago pep ON p.id_pedido_estado_pago = pep.id
      ORDER BY pp.fecha_de_pago DESC
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