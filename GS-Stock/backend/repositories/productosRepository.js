// Repositorio de Productos: SQL de Zapatos, Zapatos_Tallas e Inventarios.
// Cada función recibe un `executor` (pool compartido o client de transacción).
const pool = require('../db');

// ─── Zapatos ────────────────────────────────────────────────────────────

async function findIdByCodigo(codigo, executor = pool) {
  const result = await executor.query('SELECT id FROM Zapatos WHERE codigo = $1', [codigo]);
  return result.rows[0];
}

async function findIdByCodigoExcluding(codigo, id, executor = pool) {
  const result = await executor.query('SELECT id FROM Zapatos WHERE codigo = $1 AND id != $2', [
    codigo,
    id,
  ]);
  return result.rows[0];
}

async function findIdCodigoById(id, executor = pool) {
  const result = await executor.query('SELECT id, codigo FROM Zapatos WHERE id = $1', [id]);
  return result.rows[0];
}

async function findIdPrecioById(id, executor = pool) {
  const result = await executor.query('SELECT id, precio_par FROM Zapatos WHERE id = $1', [id]);
  return result.rows[0];
}

async function existsById(id, executor = pool) {
  const result = await executor.query('SELECT id FROM Zapatos WHERE id = $1', [id]);
  return result.rows.length > 0;
}

async function insertZapato({ codigo, nombre, idTipoDeZapato, precioPar }, executor = pool) {
  const result = await executor.query(
    'INSERT INTO Zapatos (codigo, nombre, id_tipo_de_zapato, precio_par) VALUES ($1, $2, $3, $4) RETURNING id',
    [codigo, nombre, idTipoDeZapato, precioPar]
  );
  return result.rows[0].id;
}

async function updateZapato(id, { codigo, nombre, idTipoDeZapato, precioPar }, executor = pool) {
  await executor.query(
    'UPDATE Zapatos SET codigo = $1, nombre = $2, id_tipo_de_zapato = $3, precio_par = $4 WHERE id = $5',
    [codigo, nombre, idTipoDeZapato, precioPar, id]
  );
}

async function updateZapatoPrecio(id, precioPar, executor = pool) {
  await executor.query('UPDATE Zapatos SET precio_par = $1 WHERE id = $2', [precioPar, id]);
}

async function deleteZapato(id, executor = pool) {
  await executor.query('DELETE FROM Zapatos WHERE id = $1', [id]);
}

// ─── Zapatos_Tallas ─────────────────────────────────────────────────────

async function insertZapatoTalla(idZapato, idTalla, stock, executor = pool) {
  await executor.query(
    'INSERT INTO Zapatos_Tallas (id_zapato, id_talla, stock) VALUES ($1, $2, $3)',
    [idZapato, idTalla, stock]
  );
}

async function deleteZapatoTallas(idZapato, executor = pool) {
  await executor.query('DELETE FROM Zapatos_Tallas WHERE id_zapato = $1', [idZapato]);
}

async function findZapatoTalla(idZapato, idTalla, executor = pool) {
  const result = await executor.query(
    'SELECT id, stock FROM Zapatos_Tallas WHERE id_zapato = $1 AND id_talla = $2',
    [idZapato, idTalla]
  );
  return result.rows[0];
}

async function updateZapatoTallaStock(stock, idZapato, idTalla, executor = pool) {
  await executor.query(
    'UPDATE Zapatos_Tallas SET stock = $1 WHERE id_zapato = $2 AND id_talla = $3',
    [stock, idZapato, idTalla]
  );
}

async function sumStock(idZapato, executor = pool) {
  const result = await executor.query(
    'SELECT SUM(stock) as total FROM Zapatos_Tallas WHERE id_zapato = $1',
    [idZapato]
  );
  return parseInt(result.rows[0].total, 10) || 0;
}

// ─── Inventarios ────────────────────────────────────────────────────────

async function findLatestInventario(idZapato, executor = pool) {
  const result = await executor.query(
    'SELECT id, estado FROM Inventarios WHERE id_zapatos = $1 ORDER BY fecha_de_ingreso DESC LIMIT 1',
    [idZapato]
  );
  return result.rows[0];
}

async function insertInventario({ cantidad, idZapatos, idUsuarios, estado }, executor = pool) {
  await executor.query(
    'INSERT INTO Inventarios (cantidad, id_zapatos, id_usuarios, estado) VALUES ($1, $2, $3, $4)',
    [cantidad, idZapatos, idUsuarios, estado]
  );
}

async function updateInventarioCantidadEstado(
  inventarioId,
  cantidad,
  estado,
  idUsuario,
  executor = pool
) {
  await executor.query(
    'UPDATE Inventarios SET cantidad = $1, estado = $2, id_usuarios = $3, fecha_de_ingreso = CURRENT_TIMESTAMP WHERE id = $4',
    [cantidad, estado, idUsuario, inventarioId]
  );
}

async function updateInventarioEstado(inventarioId, estado, idUsuario, executor = pool) {
  await executor.query(
    'UPDATE Inventarios SET estado = $1, id_usuarios = $2, fecha_de_ingreso = CURRENT_TIMESTAMP WHERE id = $3',
    [estado, idUsuario, inventarioId]
  );
}

async function updateInventarioCantidad(inventarioId, cantidad, idUsuario, executor = pool) {
  await executor.query(
    'UPDATE Inventarios SET cantidad = $1, id_usuarios = $2, fecha_de_ingreso = CURRENT_TIMESTAMP WHERE id = $3',
    [cantidad, idUsuario, inventarioId]
  );
}

async function deleteInventarios(idZapato, executor = pool) {
  await executor.query('DELETE FROM Inventarios WHERE id_zapatos = $1', [idZapato]);
}

// ─── Pedidos (validación de borrado) ────────────────────────────────────

async function existsInPedidos(idZapato, executor = pool) {
  const result = await executor.query(
    'SELECT id FROM Detalle_Pedidos WHERE id_zapato = $1 LIMIT 1',
    [idZapato]
  );
  return result.rows.length > 0;
}

module.exports = {
  findIdByCodigo,
  findIdByCodigoExcluding,
  findIdCodigoById,
  findIdPrecioById,
  existsById,
  insertZapato,
  updateZapato,
  updateZapatoPrecio,
  deleteZapato,
  insertZapatoTalla,
  deleteZapatoTallas,
  findZapatoTalla,
  updateZapatoTallaStock,
  sumStock,
  findLatestInventario,
  insertInventario,
  updateInventarioCantidadEstado,
  updateInventarioEstado,
  updateInventarioCantidad,
  deleteInventarios,
  existsInPedidos,
};
