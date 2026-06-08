// Repositorio de Pagos: SQL de pagos_pedidos, pedidos y clientes.
// Cada función recibe un `executor` (pool compartido o client de transacción).
const pool = require('../db');

async function findClientesPendientes(executor = pool) {
  const result = await executor.query(
    `SELECT DISTINCT c.*
       FROM Clientes c
       INNER JOIN Pedidos p ON c.id = p.id_cliente
       WHERE p.id_pedido_estado_pago = 1
       ORDER BY c.nombre, c.apellido`
  );
  return result.rows;
}

// Pedidos pendientes de un cliente, ajustando total/saldo por devoluciones y pagos.
async function findPedidosPendientesByCliente(clienteId, executor = pool) {
  const result = await executor.query(
    `SELECT
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
          SELECT pp.total_pedido FROM pagos_pedidos pp
          WHERE pp.id_pedido = p.id ORDER BY pp.id DESC LIMIT 1
        ), COALESCE(p.total - COALESCE(d.monto, 0), p.total)) as saldo_pendiente,
        COALESCE((
          SELECT SUM(pp.monto_pagado) FROM pagos_pedidos pp WHERE pp.id_pedido = p.id
        ), 0) as monto_pagado
      FROM Pedidos p
      INNER JOIN Clientes c ON p.id_cliente = c.id
      INNER JOIN pedidos_estado_pago pep ON p.id_pedido_estado_pago = pep.id
      LEFT JOIN Devoluciones d ON p.id = d.id_pedido
      WHERE p.id_cliente = $1
        AND p.id_pedido_estado_pago = 1
        AND (d.id IS NULL OR d.monto < p.total)
      ORDER BY p.fecha DESC`,
    [clienteId]
  );
  return result.rows;
}

async function findPedidoForPago(idPedido, executor = pool) {
  const result = await executor.query(
    'SELECT p.total, p.id_cliente, p.id_pedido_estado_pago FROM Pedidos p WHERE p.id = $1',
    [idPedido]
  );
  return result.rows[0];
}

// Saldo restante del último pago registrado para el pedido (o undefined).
async function findLatestBalance(idPedido, executor = pool) {
  const result = await executor.query(
    'SELECT total_pedido FROM pagos_pedidos WHERE id_pedido = $1 ORDER BY id DESC LIMIT 1',
    [idPedido]
  );
  return result.rows[0]?.total_pedido;
}

async function insertPago(
  { idPedido, totalPedido, idMetodo, montoPagado, vuelto, observaciones },
  executor = pool
) {
  const result = await executor.query(
    `INSERT INTO pagos_pedidos
        (id_pedido, total_pedido, id_metodos_de_pago, monto_pagado, vuelto, observaciones, fecha_de_pago)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
       RETURNING *`,
    [idPedido, totalPedido, idMetodo, montoPagado, vuelto, observaciones]
  );
  return result.rows[0];
}

async function updateEstadoPago(estado, idPedido, executor = pool) {
  await executor.query('UPDATE Pedidos SET id_pedido_estado_pago = $1 WHERE id = $2', [
    estado,
    idPedido,
  ]);
}

async function findHistorial(executor = pool) {
  const result = await executor.query(
    `SELECT
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
      ORDER BY pp.fecha_de_pago DESC`
  );
  return result.rows;
}

module.exports = {
  findClientesPendientes,
  findPedidosPendientesByCliente,
  findPedidoForPago,
  findLatestBalance,
  insertPago,
  updateEstadoPago,
  findHistorial,
};
