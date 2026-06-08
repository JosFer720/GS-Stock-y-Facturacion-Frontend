// Repositorio de Clientes: única capa que habla SQL con PostgreSQL.
// Cada función recibe un `executor` (el pool compartido o un client de
// transacción obtenido con pool.connect()); ambos exponen .query().
const pool = require('../db');

// ─── Lectura de clientes ────────────────────────────────────────────────

// Devuelve la fila del cliente (o undefined) sin joins. Útil para validar existencia.
async function findById(id, executor = pool) {
  const result = await executor.query('SELECT * FROM clientes WHERE id = $1', [id]);
  return result.rows[0];
}

// Cliente con sus direcciones y teléfonos (filas crudas del LEFT JOIN).
async function findDetailRowsById(id, executor = pool) {
  const result = await executor.query(
    `
      SELECT
        c.id,
        c.nombre,
        c.apellido,
        c.empresa,
        n.nit,
        d.id as direccion_id,
        d.direccion,
        t.id as telefono_id,
        t.telefono
      FROM clientes c
      LEFT JOIN nits n ON c.id_nit = n.id
      LEFT JOIN cliente_direcciones cd ON c.id = cd.id_cliente
      LEFT JOIN direcciones d ON cd.id_direccion = d.id
      LEFT JOIN cliente_telefonos ct ON c.id = ct.id_cliente
      LEFT JOIN telefonos t ON ct.id_telefono = t.id
      WHERE c.id = $1
      ORDER BY d.id, t.id
    `,
    [id]
  );
  return result.rows;
}

// Todas las filas (todos los clientes) del LEFT JOIN, ordenadas.
async function findAllDetailRows(executor = pool) {
  const result = await executor.query(`
    SELECT
      c.id,
      c.nombre,
      c.apellido,
      c.empresa,
      n.nit,
      d.id as direccion_id,
      d.direccion,
      t.id as telefono_id,
      t.telefono
    FROM clientes c
    LEFT JOIN nits n ON c.id_nit = n.id
    LEFT JOIN cliente_direcciones cd ON c.id = cd.id_cliente
    LEFT JOIN direcciones d ON cd.id_direccion = d.id
    LEFT JOIN cliente_telefonos ct ON c.id = ct.id_cliente
    LEFT JOIN telefonos t ON ct.id_telefono = t.id
    ORDER BY c.id, d.id, t.id
  `);
  return result.rows;
}

// Resumen de cuentas/pagos por cliente (para el listado general).
async function findSummary(executor = pool) {
  const result = await executor.query(`
    WITH pagos_por_pedido AS (
      SELECT
        id_pedido,
        COALESCE(SUM(monto_pagado), 0) as total_pagado
      FROM pagos_pedidos
      GROUP BY id_pedido
    ),
    pedidos_con_saldo AS (
      SELECT
        p.id,
        p.id_cliente,
        p.fecha,
        p.total,
        p.id_pedido_estado_pago,
        (p.total - COALESCE(ppp.total_pagado, 0)) as saldo_pendiente,
        CASE
          WHEN (p.total - COALESCE(ppp.total_pagado, 0)) > 0
          THEN FLOOR(EXTRACT(epoch FROM (NOW() - p.fecha)) / 86400)
          ELSE NULL
        END as dias_pendiente
      FROM pedidos p
      LEFT JOIN pagos_por_pedido ppp ON p.id = ppp.id_pedido
    )
    SELECT
      c.id,
      (SELECT MAX(dias_pendiente)
       FROM pedidos_con_saldo pcs
       WHERE pcs.id_cliente = c.id
       AND pcs.saldo_pendiente > 0) AS oldest_pending_days,
      (SELECT COALESCE(SUM(pp.monto_pagado), 0)
       FROM pagos_pedidos pp
       JOIN pedidos p2 ON pp.id_pedido = p2.id
       WHERE p2.id_cliente = c.id) AS total_cancelado,
      (SELECT FLOOR(AVG(EXTRACT(epoch FROM (NOW() - p3.fecha)) / 86400))
       FROM pedidos_con_saldo p3
       WHERE p3.id_cliente = c.id
       AND p3.id_pedido_estado_pago = 2) AS avg_days_to_pay,
      (SELECT COUNT(*)
       FROM pedidos p4
       WHERE p4.id_cliente = c.id
       AND p4.id_pedido_estado_pago = 1) AS pedidos_activos
    FROM clientes c
  `);
  return result.rows;
}

// Búsqueda por nombre/apellido/empresa/nit.
async function search(searchTerm, executor = pool) {
  const result = await executor.query(
    `
      SELECT DISTINCT
        c.id,
        c.nombre,
        c.apellido,
        c.empresa,
        n.nit
      FROM clientes c
      LEFT JOIN nits n ON c.id_nit = n.id
      WHERE
        LOWER(c.nombre) LIKE $1 OR
        LOWER(c.apellido) LIKE $1 OR
        LOWER(COALESCE(c.empresa, '')) LIKE $1 OR
        LOWER(COALESCE(n.nit, '')) LIKE $1
      ORDER BY c.nombre, c.apellido
    `,
    [searchTerm]
  );
  return result.rows;
}

// ─── Cuentas por cobrar ─────────────────────────────────────────────────

async function findCuentasPorCobrar(clienteId, executor = pool) {
  const result = await executor.query(
    `
      WITH pagos_por_pedido AS (
        SELECT
          id_pedido,
          COALESCE(SUM(monto_pagado), 0) as total_pagado
        FROM pagos_pedidos
        GROUP BY id_pedido
      ),
      pedidos_info AS (
        SELECT
          p.id,
          p.total as total_original,
          p.fecha,
          p.subtotal,
          COALESCE(pep.estado, 'Pendiente') as estado_pago,
          p.id_pedido_estado_pago,
          COALESCE(ppp.total_pagado, 0) as total_cancelado,
          (p.total - COALESCE(ppp.total_pagado, 0)) as saldo_pendiente,
          FLOOR(EXTRACT(epoch FROM (NOW() - p.fecha)) / 86400) as dias_desde_creacion
        FROM pedidos p
        LEFT JOIN pedidos_estado_pago pep ON p.id_pedido_estado_pago = pep.id
        LEFT JOIN pagos_por_pedido ppp ON p.id = ppp.id_pedido
        WHERE p.id_cliente = $1
      )
      SELECT *
      FROM pedidos_info
      WHERE id_pedido_estado_pago = 1
      ORDER BY fecha ASC
    `,
    [clienteId]
  );
  return result.rows;
}

async function findPromedioDiasPagados(clienteId, executor = pool) {
  const result = await executor.query(
    `
      SELECT
        AVG(FLOOR(EXTRACT(epoch FROM (pp.fecha_de_pago - p.fecha)) / 86400)) as promedio_dias_pagados
      FROM pedidos p
      INNER JOIN pagos_pedidos pp ON p.id = pp.id_pedido
      WHERE p.id_cliente = $1
        AND p.id_pedido_estado_pago = 2
    `,
    [clienteId]
  );
  return result.rows[0]?.promedio_dias_pagados ?? null;
}

// ─── NITs ───────────────────────────────────────────────────────────────

async function findNitId(nitFormatted, executor = pool) {
  const result = await executor.query('SELECT id FROM nits WHERE nit = $1', [nitFormatted]);
  return result.rows[0]?.id;
}

async function insertNit(nitFormatted, executor = pool) {
  const result = await executor.query('INSERT INTO nits (nit) VALUES ($1) RETURNING id', [
    nitFormatted,
  ]);
  return result.rows[0].id;
}

// ─── Direcciones / teléfonos (listados directos) ────────────────────────

async function findDireccionesByCliente(clienteId, executor = pool) {
  const result = await executor.query(
    `
      SELECT d.id, d.direccion
      FROM direcciones d
      INNER JOIN cliente_direcciones cd ON d.id = cd.id_direccion
      WHERE cd.id_cliente = $1
    `,
    [clienteId]
  );
  return result.rows;
}

async function findTelefonosByCliente(clienteId, executor = pool) {
  const result = await executor.query(
    `
      SELECT t.id, t.telefono
      FROM telefonos t
      INNER JOIN cliente_telefonos ct ON t.id = ct.id_telefono
      WHERE ct.id_cliente = $1
    `,
    [clienteId]
  );
  return result.rows;
}

// ─── Inserción / actualización (usadas dentro de transacciones) ─────────

async function insertCliente({ nombre, apellido, empresa, nitId }, executor = pool) {
  const result = await executor.query(
    'INSERT INTO clientes (nombre, apellido, empresa, id_nit) VALUES ($1, $2, $3, $4) RETURNING *',
    [nombre, apellido, empresa, nitId]
  );
  return result.rows[0];
}

async function updateCliente(id, { nombre, apellido, empresa, nitId }, executor = pool) {
  const result = await executor.query(
    'UPDATE clientes SET nombre = $1, apellido = $2, empresa = $3, id_nit = $4 WHERE id = $5 RETURNING *',
    [nombre, apellido, empresa, nitId, id]
  );
  return result.rows[0];
}

// Campos de referencia "primera dirección / primer teléfono". El esquema podría
// no tenerlos; el servicio decide cómo manejar el error (igual que el código original).
async function updateClienteRefs(id, primeraDireccionId, primerClienteTelefonoId, executor = pool) {
  await executor.query(
    'UPDATE clientes SET id_direcciones = $1, id_cliente_telefono = $2 WHERE id = $3',
    [primeraDireccionId, primerClienteTelefonoId, id]
  );
}

async function clearClienteTelefonoRef(id, executor = pool) {
  await executor.query('UPDATE clientes SET id_cliente_telefono = NULL WHERE id = $1', [id]);
}

async function insertDireccion(direccion, executor = pool) {
  const result = await executor.query('INSERT INTO direcciones (direccion) VALUES ($1) RETURNING *', [
    direccion,
  ]);
  return result.rows[0];
}

async function updateDireccion(id, direccion, executor = pool) {
  await executor.query('UPDATE direcciones SET direccion = $1 WHERE id = $2', [direccion, id]);
}

async function findDireccionByText(direccion, executor = pool) {
  const result = await executor.query(
    'SELECT * FROM direcciones WHERE LOWER(direccion) = LOWER($1)',
    [direccion]
  );
  return result.rows[0];
}

async function linkClienteDireccion(clienteId, direccionId, executor = pool) {
  await executor.query(
    'INSERT INTO cliente_direcciones (id_cliente, id_direccion) VALUES ($1, $2)',
    [clienteId, direccionId]
  );
}

async function existsClienteDireccion(clienteId, direccionId, executor = pool) {
  const result = await executor.query(
    'SELECT * FROM cliente_direcciones WHERE id_cliente = $1 AND id_direccion = $2',
    [clienteId, direccionId]
  );
  return result.rows.length > 0;
}

// Direcciones actuales del cliente (con su texto) para el diff en update.
async function findDireccionesConTextoByCliente(clienteId, executor = pool) {
  const result = await executor.query(
    'SELECT d.id, d.direccion FROM direcciones d JOIN cliente_direcciones cd ON d.id = cd.id_direccion WHERE cd.id_cliente = $1',
    [clienteId]
  );
  return result.rows;
}

async function unlinkClienteDireccion(clienteId, direccionId, executor = pool) {
  await executor.query(
    'DELETE FROM cliente_direcciones WHERE id_cliente = $1 AND id_direccion = $2',
    [clienteId, direccionId]
  );
}

async function deleteDireccion(id, executor = pool) {
  await executor.query('DELETE FROM direcciones WHERE id = $1', [id]);
}

async function insertTelefono(telefono, executor = pool) {
  const result = await executor.query('INSERT INTO telefonos (telefono) VALUES ($1) RETURNING *', [
    telefono,
  ]);
  return result.rows[0];
}

async function updateTelefono(id, telefono, executor = pool) {
  await executor.query('UPDATE telefonos SET telefono = $1 WHERE id = $2', [telefono, id]);
}

async function linkClienteTelefono(clienteId, telefonoId, executor = pool) {
  const result = await executor.query(
    'INSERT INTO cliente_telefonos (id_cliente, id_telefono) VALUES ($1, $2) RETURNING *',
    [clienteId, telefonoId]
  );
  return result.rows[0];
}

async function findClienteTelefonoId(clienteId, telefonoId, executor = pool) {
  const result = await executor.query(
    'SELECT id FROM cliente_telefonos WHERE id_cliente = $1 AND id_telefono = $2',
    [clienteId, telefonoId]
  );
  return result.rows[0]?.id;
}

async function findTelefonosConTextoByCliente(clienteId, executor = pool) {
  const result = await executor.query(
    'SELECT t.id, t.telefono FROM telefonos t JOIN cliente_telefonos ct ON t.id = ct.id_telefono WHERE ct.id_cliente = $1',
    [clienteId]
  );
  return result.rows;
}

async function unlinkClienteTelefono(clienteId, telefonoId, executor = pool) {
  await executor.query(
    'DELETE FROM cliente_telefonos WHERE id_cliente = $1 AND id_telefono = $2',
    [clienteId, telefonoId]
  );
}

async function deleteTelefono(id, executor = pool) {
  await executor.query('DELETE FROM telefonos WHERE id = $1', [id]);
}

// ─── Borrado de cliente ─────────────────────────────────────────────────

async function countPedidosByCliente(clienteId, executor = pool) {
  const result = await executor.query(
    'SELECT COUNT(*) as count FROM pedidos WHERE id_cliente = $1',
    [clienteId]
  );
  return parseInt(result.rows[0].count, 10);
}

async function findDireccionIdsByCliente(clienteId, executor = pool) {
  const result = await executor.query(
    'SELECT id_direccion FROM cliente_direcciones WHERE id_cliente = $1',
    [clienteId]
  );
  return result.rows;
}

async function findTelefonoIdsByCliente(clienteId, executor = pool) {
  const result = await executor.query(
    'SELECT id_telefono FROM cliente_telefonos WHERE id_cliente = $1',
    [clienteId]
  );
  return result.rows;
}

async function deleteAllClienteDirecciones(clienteId, executor = pool) {
  await executor.query('DELETE FROM cliente_direcciones WHERE id_cliente = $1', [clienteId]);
}

async function deleteAllClienteTelefonos(clienteId, executor = pool) {
  await executor.query('DELETE FROM cliente_telefonos WHERE id_cliente = $1', [clienteId]);
}

async function deleteCliente(id, executor = pool) {
  const result = await executor.query('DELETE FROM clientes WHERE id = $1 RETURNING *', [id]);
  return result.rows[0];
}

module.exports = {
  findById,
  findDetailRowsById,
  findAllDetailRows,
  findSummary,
  search,
  findCuentasPorCobrar,
  findPromedioDiasPagados,
  findNitId,
  insertNit,
  findDireccionesByCliente,
  findTelefonosByCliente,
  insertCliente,
  updateCliente,
  updateClienteRefs,
  clearClienteTelefonoRef,
  insertDireccion,
  updateDireccion,
  findDireccionByText,
  linkClienteDireccion,
  existsClienteDireccion,
  findDireccionesConTextoByCliente,
  unlinkClienteDireccion,
  deleteDireccion,
  insertTelefono,
  updateTelefono,
  linkClienteTelefono,
  findClienteTelefonoId,
  findTelefonosConTextoByCliente,
  unlinkClienteTelefono,
  deleteTelefono,
  countPedidosByCliente,
  findDireccionIdsByCliente,
  findTelefonoIdsByCliente,
  deleteAllClienteDirecciones,
  deleteAllClienteTelefonos,
  deleteCliente,
};
