// Repositorio de Sugerencias de facturación: datos para autollenado.
const pool = require('../db');

async function findClientesParaSugerencias(executor = pool) {
  const result = await executor.query(`
    SELECT DISTINCT
      c.id, c.nombre, c.apellido, c.empresa,
      COALESCE(
        (SELECT t.telefono FROM cliente_telefonos ct
         JOIN telefonos t ON ct.id_telefono = t.id
         WHERE ct.id_cliente = c.id LIMIT 1),
        'Sin teléfono'
      ) AS telefono_principal,
      COALESCE(
        (SELECT array_agg(d.direccion) FROM cliente_direcciones cd
         JOIN direcciones d ON cd.id_direccion = d.id
         WHERE cd.id_cliente = c.id),
        ARRAY[]::text[]
      ) AS direcciones
    FROM clientes c
    ORDER BY c.empresa, c.nombre
  `);
  return result.rows;
}

async function findMetodosPago(executor = pool) {
  const result = await executor.query('SELECT id, tipo FROM metodos_de_pago ORDER BY tipo');
  return result.rows;
}

async function findProductosDisponibles(executor = pool) {
  const result = await executor.query(`
    SELECT
      z.id, z.nombre, z.codigo, z.precio_venta,
      t.talla_eu, t.talla_us, zt.stock,
      CONCAT(z.nombre, ' - Talla EU: ', t.talla_eu, ' (Stock: ', zt.stock, ')') as descripcion_completa
    FROM zapatos z
    JOIN zapatos_tallas zt ON z.id = zt.id_zapato
    JOIN tallas t ON zt.id_talla = t.id
    WHERE zt.stock > 0
    ORDER BY z.nombre, t.talla_eu
  `);
  return result.rows;
}

async function findClientesByEmpresa(empresa, executor = pool) {
  const result = await executor.query(
    `SELECT
        c.id, c.nombre, c.apellido, c.empresa,
        COALESCE(
          (SELECT t.telefono FROM cliente_telefonos ct
           JOIN telefonos t ON ct.id_telefono = t.id
           WHERE ct.id_cliente = c.id LIMIT 1),
          'Sin teléfono'
        ) AS telefono,
        COALESCE(
          (SELECT d.direccion FROM cliente_direcciones cd
           JOIN direcciones d ON cd.id_direccion = d.id
           WHERE cd.id_cliente = c.id LIMIT 1),
          'Sin dirección'
        ) AS direccion
      FROM clientes c
      WHERE LOWER(c.empresa) LIKE LOWER($1)
      ORDER BY c.nombre`,
    [`%${empresa}%`]
  );
  return result.rows;
}

module.exports = {
  findClientesParaSugerencias,
  findMetodosPago,
  findProductosDisponibles,
  findClientesByEmpresa,
};
