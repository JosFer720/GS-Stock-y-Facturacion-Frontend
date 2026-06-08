// Repositorio de Facturas: consultas de facturas, detalle y productos.
const pool = require('../db');

// Facturas con filtros opcionales por fecha y cliente.
async function findFacturas({ fecha, cliente }, executor = pool) {
  let query = `
    SELECT
      f.id, f.id_pedido, f.fecha_emision, f.subtotal, f.impuestos, f.total, f.estado,
      c.nombre as nombre_cliente, c.apellido as apellido_cliente, c.empresa,
      p.fecha as fecha_pedido,
      u.nombre || ' ' || u.apellido as vendedor_nombre
    FROM Facturas f
    INNER JOIN Pedidos p ON f.id_pedido = p.id
    INNER JOIN Clientes c ON p.id_cliente = c.id
    LEFT JOIN Vendedores v ON p.id_vendedor = v.id
    LEFT JOIN Usuarios u ON v.id_usuarios = u.id
    WHERE 1=1
  `;
  const params = [];
  let paramCount = 1;

  if (fecha) {
    query += ` AND DATE(f.fecha_emision) = $${paramCount}`;
    params.push(fecha);
    paramCount++;
  }
  if (cliente) {
    query += ` AND (LOWER(c.nombre) LIKE LOWER($${paramCount}) OR LOWER(c.apellido) LIKE LOWER($${paramCount}) OR LOWER(c.empresa) LIKE LOWER($${paramCount}))`;
    params.push(`%${cliente}%`);
    paramCount++;
  }

  query += ' ORDER BY f.fecha_emision DESC';

  const result = await executor.query(query, params);
  return result.rows;
}

async function findFacturaById(id, executor = pool) {
  const result = await executor.query(
    `SELECT
        f.*,
        c.nombre as nombre_cliente, c.apellido as apellido_cliente, c.empresa,
        p.fecha as fecha_pedido,
        u.nombre || ' ' || u.apellido as vendedor_nombre,
        mp.tipo as metodo_pago
      FROM Facturas f
      INNER JOIN Pedidos p ON f.id_pedido = p.id
      INNER JOIN Clientes c ON p.id_cliente = c.id
      LEFT JOIN Vendedores v ON p.id_vendedor = v.id
      LEFT JOIN Usuarios u ON v.id_usuarios = u.id
      LEFT JOIN Metodos_De_Pago mp ON p.id_metodo_de_pago = mp.id
      WHERE f.id = $1`,
    [id]
  );
  return result.rows[0];
}

async function findProductosByFactura(id, executor = pool) {
  const result = await executor.query(
    `SELECT
        dp.cantidad, z.codigo, z.nombre as zapato_nombre,
        tc.tipo as tipo_calzado, t.talla_eu, t.talla_us
      FROM Detalle_Pedidos dp
      INNER JOIN Zapatos z ON dp.id_zapato = z.id
      LEFT JOIN Tipos_De_Calzados tc ON z.id_tipo_de_zapato = tc.id
      LEFT JOIN Zapatos_Tallas zt ON z.id = zt.id_zapato
      LEFT JOIN Tallas t ON zt.id_talla = t.id
      INNER JOIN Pedidos p ON dp.id_pedido = p.id
      INNER JOIN Facturas f ON p.id = f.id_pedido
      WHERE f.id = $1`,
    [id]
  );
  return result.rows;
}

module.exports = {
  findFacturas,
  findFacturaById,
  findProductosByFactura,
};
