// Repositorio de Inventario: único lugar con SQL para zapatos, tallas,
// inventarios y estados. Cada función recibe un `executor` (pool o client tx).
const pool = require('../db');

// ─── Lectura ────────────────────────────────────────────────────────────

// Inventario completo con tallas agregadas y stock total por zapato.
async function findInventarioCompleto(executor = pool) {
  const result = await executor.query(`
    SELECT
      z.id,
      z.codigo,
      z.nombre,
      z.precio_par,
      z.id_tipo_de_zapato,
      tdc.tipo as tipo_zapato,
      i.cantidad as inventario_general,
      ei.estado as estado_inventario_manual,
      i.fecha_de_ingreso,
      tlp.id as id_tipo_linea_producto,
      tlp.nombre as tipo_linea_producto,
      JSON_AGG(
        JSON_BUILD_OBJECT(
          'talla_id', t.id,
          'talla_eu', t.talla_eu,
          'talla_us', t.talla_us,
          'stock', COALESCE(zt.stock, 0),
          'zapato_talla_id', zt.id
        ) ORDER BY t.talla_eu
      ) FILTER (WHERE t.id IS NOT NULL) as tallas_disponibles,
      COALESCE(SUM(zt.stock), 0) as stock_total_tallas,
      COUNT(CASE WHEN zt.stock > 0 THEN 1 END) as tallas_con_stock
    FROM Zapatos z
    LEFT JOIN Tipos_De_Calzados tdc ON z.id_tipo_de_zapato = tdc.id
    LEFT JOIN Zapatos_Tallas zt ON z.id = zt.id_zapato
    LEFT JOIN Tallas t ON zt.id_talla = t.id
    LEFT JOIN Inventarios i ON z.id = i.id_zapatos
    LEFT JOIN Estados_Inventario ei ON i.id_estado_inventario = ei.id
    LEFT JOIN Tipos_Linea_Producto tlp ON i.id_tipo_linea_producto = tlp.id
    GROUP BY z.id, z.codigo, z.nombre, z.precio_par, z.id_tipo_de_zapato,
             tdc.tipo, i.cantidad, ei.estado, i.fecha_de_ingreso,
             tlp.id, tlp.nombre
    ORDER BY z.codigo, z.nombre
  `);
  return result.rows;
}

async function findTiposLineaActivos(executor = pool) {
  const result = await executor.query(
    `SELECT id, nombre, descripcion, activo, fecha_creacion
       FROM Tipos_Linea_Producto
       WHERE activo = true
       ORDER BY nombre`
  );
  return result.rows;
}

async function findEstadoInventarioId(estado, executor = pool) {
  const result = await executor.query('SELECT id FROM Estados_Inventario WHERE estado = $1', [
    estado,
  ]);
  return result.rows[0]?.id;
}

// Zapato con su tipo de línea y estado de inventario (post-actualización).
async function findZapatoConEstado(zapatoId, executor = pool) {
  const result = await executor.query(
    `SELECT
        z.*,
        tlp.nombre as tipo_linea_producto,
        ei.estado as estado_inventario,
        i.id_estado_inventario
       FROM Zapatos z
       LEFT JOIN Inventarios i ON z.id = i.id_zapatos
       LEFT JOIN Tipos_Linea_Producto tlp ON i.id_tipo_linea_producto = tlp.id
       LEFT JOIN Estados_Inventario ei ON i.id_estado_inventario = ei.id
       WHERE z.id = $1`,
    [zapatoId]
  );
  return result.rows[0];
}

async function sumStockByZapato(zapatoId, executor = pool) {
  const result = await executor.query(
    'SELECT COALESCE(SUM(stock), 0) as stock_total FROM Zapatos_Tallas WHERE id_zapato = $1',
    [zapatoId]
  );
  return parseInt(result.rows[0].stock_total, 10);
}

async function existsZapatoTalla(zapatoId, idTalla, executor = pool) {
  const result = await executor.query(
    'SELECT id FROM Zapatos_Tallas WHERE id_zapato = $1 AND id_talla = $2',
    [zapatoId, idTalla]
  );
  return result.rows.length > 0;
}

// ─── Escritura ──────────────────────────────────────────────────────────

async function insertZapato({ codigo, nombre, idTipoDeZapato, precioPar }, executor = pool) {
  const result = await executor.query(
    `INSERT INTO Zapatos (codigo, nombre, id_tipo_de_zapato, precio_par)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
    [codigo, nombre, idTipoDeZapato, precioPar]
  );
  return result.rows[0];
}

async function insertInventario(
  { cantidad, idZapatos, idUsuarios, idEstadoInventario, idTipoLineaProducto },
  executor = pool
) {
  const result = await executor.query(
    `INSERT INTO Inventarios (cantidad, id_zapatos, id_usuarios, id_estado_inventario, id_tipo_linea_producto)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
    [cantidad, idZapatos, idUsuarios, idEstadoInventario, idTipoLineaProducto]
  );
  return result.rows[0];
}

async function insertZapatoTalla(idZapato, idTalla, stock, executor = pool) {
  await executor.query(
    'INSERT INTO Zapatos_Tallas (id_zapato, id_talla, stock) VALUES ($1, $2, $3)',
    [idZapato, idTalla, stock]
  );
}

async function updateZapatoTallaStock(stock, zapatoId, idTalla, executor = pool) {
  await executor.query(
    'UPDATE Zapatos_Tallas SET stock = $1 WHERE id_zapato = $2 AND id_talla = $3',
    [stock, zapatoId, idTalla]
  );
}

// Actualización parcial de Zapatos: sólo las columnas presentes en `fields`.
async function updateZapatoFields(zapatoId, fields, executor = pool) {
  const keys = Object.keys(fields);
  if (keys.length === 0) return;
  const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
  const values = keys.map((key) => fields[key]);
  await executor.query(
    `UPDATE Zapatos SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *`,
    [...values, zapatoId]
  );
}

// Actualización parcial de Inventarios (por id_zapatos).
async function updateInventarioFields(zapatoId, fields, executor = pool) {
  const keys = Object.keys(fields);
  if (keys.length === 0) return;
  const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
  const values = keys.map((key) => fields[key]);
  await executor.query(
    `UPDATE Inventarios SET ${setClause} WHERE id_zapatos = $${keys.length + 1}`,
    [...values, zapatoId]
  );
}

async function setEstadoInventario(estadoId, zapatoId, executor = pool) {
  await executor.query('UPDATE Inventarios SET id_estado_inventario = $1 WHERE id_zapatos = $2', [
    estadoId,
    zapatoId,
  ]);
}

module.exports = {
  findInventarioCompleto,
  findTiposLineaActivos,
  findEstadoInventarioId,
  findZapatoConEstado,
  sumStockByZapato,
  existsZapatoTalla,
  insertZapato,
  insertInventario,
  insertZapatoTalla,
  updateZapatoTallaStock,
  updateZapatoFields,
  updateInventarioFields,
  setEstadoInventario,
};
