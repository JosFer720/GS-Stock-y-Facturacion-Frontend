// Repositorio de Devoluciones: SQL de devoluciones, pedidos y stock.
// Cada función recibe un `executor` (pool compartido o client de transacción).
const pool = require('../db');

async function findMetodos(executor = pool) {
  const result = await executor.query(
    'SELECT Id as id, Metodo as metodo FROM Metodos_Devolucion ORDER BY Metodo'
  );
  return result.rows;
}

// Pedidos "Despachado" de un cliente (sin devolución previa) con sus productos.
async function findPedidosDespachadosByCliente(clienteId, executor = pool) {
  const result = await executor.query(
    `SELECT
        p.id as pedido_id,
        p.fecha as pedido_fecha,
        p.total as pedido_total,
        ep.estado as pedido_estado,
        dp.id as detalle_id,
        dp.cantidad,
        dp.precio_unitario,
        z.id as zapato_id,
        z.codigo,
        z.nombre as zapato_nombre,
        t.id as talla_id,
        t.talla_eu,
        t.talla_us
      FROM Pedidos p
      INNER JOIN Estados_Pedidos ep ON p.id_estado_pedido = ep.id
      INNER JOIN Detalle_Pedidos dp ON p.id = dp.id_pedido
      INNER JOIN Zapatos z ON dp.id_zapato = z.id
      LEFT JOIN Tallas t ON dp.id_talla = t.id
      WHERE p.id_cliente = $1
        AND ep.estado = 'Despachado'
        AND NOT EXISTS (SELECT 1 FROM Devoluciones d WHERE d.id_pedido = p.id)
      ORDER BY p.fecha DESC, z.codigo`,
    [clienteId]
  );
  return result.rows;
}

async function findPedidoConEstado(idPedido, executor = pool) {
  const result = await executor.query(
    `SELECT
        p.id, p.total, p.id_cliente, ep.estado,
        CONCAT(c.nombre, ' ', c.apellido) as cliente_nombre
      FROM Pedidos p
      INNER JOIN Estados_Pedidos ep ON p.id_estado_pedido = ep.id
      INNER JOIN Clientes c ON p.id_cliente = c.id
      WHERE p.id = $1`,
    [idPedido]
  );
  return result.rows[0];
}

async function existsDevolucionByPedido(idPedido, executor = pool) {
  const result = await executor.query('SELECT id FROM Devoluciones WHERE id_pedido = $1', [
    idPedido,
  ]);
  return result.rows.length > 0;
}

async function findDetallePedido(detalleId, idPedido, executor = pool) {
  const result = await executor.query(
    `SELECT dp.id, dp.cantidad, dp.precio_unitario, dp.id_zapato, dp.id_talla, z.codigo, z.nombre
       FROM Detalle_Pedidos dp
       INNER JOIN Zapatos z ON dp.id_zapato = z.id
       WHERE dp.id = $1 AND dp.id_pedido = $2`,
    [detalleId, idPedido]
  );
  return result.rows[0];
}

async function insertDevolucion({ idPedido, motivo, idMetodo, monto }, executor = pool) {
  const result = await executor.query(
    `INSERT INTO Devoluciones (id_pedido, motivo, id_metodo_devolucion, monto, fecha)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       RETURNING id, fecha`,
    [idPedido, motivo, idMetodo, monto]
  );
  return result.rows[0];
}

async function incrementStockTalla(cantidad, zapatoId, tallaId, executor = pool) {
  await executor.query(
    'UPDATE Zapatos_Tallas SET stock = stock + $1 WHERE id_zapato = $2 AND id_talla = $3',
    [cantidad, zapatoId, tallaId]
  );
}

async function incrementInventario(cantidad, zapatoId, executor = pool) {
  await executor.query('UPDATE Inventarios SET cantidad = cantidad + $1 WHERE id_zapatos = $2', [
    cantidad,
    zapatoId,
  ]);
}

async function insertHistoricoDespachado(idPedido, idUsuario, observacion, executor = pool) {
  await executor.query(
    `INSERT INTO Estados_Pedido_Historico (id_pedido, id_estado_pedido, id_usuario, fecha_actualizacion, observacion)
       VALUES ($1, (SELECT id FROM Estados_Pedidos WHERE estado = 'Despachado'), $2, CURRENT_TIMESTAMP, $3)`,
    [idPedido, idUsuario, observacion]
  );
}

// Listado de devoluciones con cliente, método y productos.
async function findAll(executor = pool) {
  const result = await executor.query(
    `SELECT
        d.id as devolucion_id,
        d.fecha as fecha,
        d.motivo as motivo,
        d.monto as monto_total,
        p.id as pedido_id,
        CONCAT(c.nombre, ' ', c.apellido) as cliente_nombre,
        c.empresa as cliente_empresa,
        STRING_AGG(DISTINCT t.telefono, ', ') as cliente_telefono,
        md.metodo as metodo_devolucion,
        z.codigo,
        z.nombre as zapato_nombre,
        t2.talla_eu,
        dp.cantidad as unidades,
        dp.precio_unitario
      FROM Devoluciones d
      INNER JOIN Pedidos p ON d.id_pedido = p.id
      INNER JOIN Clientes c ON p.id_cliente = c.id
      LEFT JOIN Cliente_Telefonos ct ON c.id = ct.id_cliente
      LEFT JOIN Telefonos t ON ct.id_telefono = t.id
      INNER JOIN Metodos_Devolucion md ON d.id_metodo_devolucion = md.id
      INNER JOIN Detalle_Pedidos dp ON p.id = dp.id_pedido
      INNER JOIN Zapatos z ON dp.id_zapato = z.id
      LEFT JOIN Tallas t2 ON dp.id_talla = t2.id
      GROUP BY d.id, d.fecha, d.motivo, d.monto, p.id, c.nombre, c.apellido,
               c.empresa, md.metodo, z.codigo, z.nombre, t2.talla_eu,
               dp.cantidad, dp.precio_unitario
      ORDER BY d.fecha DESC`
  );
  return result.rows;
}

async function findById(id, executor = pool) {
  const result = await executor.query('SELECT * FROM Devoluciones WHERE id = $1', [id]);
  return result.rows[0];
}

// Actualización parcial: sólo las columnas presentes en `fields`.
async function updateFields(id, fields, executor = pool) {
  const keys = Object.keys(fields);
  const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
  const values = keys.map((key) => fields[key]);
  const result = await executor.query(
    `UPDATE Devoluciones SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *`,
    [...values, id]
  );
  return result.rows[0];
}

async function deleteById(id, executor = pool) {
  await executor.query('DELETE FROM Devoluciones WHERE id = $1', [id]);
}

module.exports = {
  findMetodos,
  findPedidosDespachadosByCliente,
  findPedidoConEstado,
  existsDevolucionByPedido,
  findDetallePedido,
  insertDevolucion,
  incrementStockTalla,
  incrementInventario,
  insertHistoricoDespachado,
  findAll,
  findById,
  updateFields,
  deleteById,
};
