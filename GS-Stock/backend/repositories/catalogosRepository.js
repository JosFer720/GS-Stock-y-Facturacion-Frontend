// Repositorio de Catálogos: tallas, tipos de calzado y tipos de línea de producto.
const pool = require('../db');

async function findTallas(executor = pool) {
  const result = await executor.query('SELECT id, talla_eu, talla_us FROM Tallas ORDER BY talla_eu');
  return result.rows;
}

async function findTiposCalzado(executor = pool) {
  const result = await executor.query('SELECT id, tipo FROM Tipos_De_Calzados ORDER BY tipo');
  return result.rows;
}

async function findTiposLineaActivos(executor = pool) {
  const result = await executor.query(
    `SELECT Id AS id, Nombre AS nombre, Descripcion as descripcion, Activo as activo, Fecha_Creacion as fecha_creacion
       FROM Tipos_Linea_Producto
       WHERE Activo = TRUE
       ORDER BY Nombre ASC`
  );
  return result.rows;
}

async function insertTipoLinea({ nombre, descripcion }, executor = pool) {
  const result = await executor.query(
    'INSERT INTO Tipos_Linea_Producto (Nombre, Descripcion) VALUES ($1, $2) RETURNING *',
    [nombre, descripcion]
  );
  return result.rows[0];
}

module.exports = {
  findTallas,
  findTiposCalzado,
  findTiposLineaActivos,
  insertTipoLinea,
};
