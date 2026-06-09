// Repositorio de Envíos: SQL para envíos nacionales e importadora.
// Cada función recibe un `executor` (pool compartido o client de transacción).
const pool = require('../db');

// Pedido de línea nacional (vendedor tomado directo de Usuarios por Id_Vendedor).
async function findPedidoNacional(pedidoId, executor = pool) {
  const result = await executor.query(
    `SELECT
        p.*,
        c.nombre || ' ' || c.apellido AS cliente_nombre,
        COALESCE(
          (SELECT d.direccion FROM Direcciones d
           JOIN Cliente_Direcciones cd ON d.Id = cd.Id_Direccion
           WHERE cd.Id_Cliente = c.Id LIMIT 1),
          'Sin dirección'
        ) AS cliente_direccion,
        COALESCE(
          (SELECT u.nombre || ' ' || u.apellido FROM Usuarios u
           WHERE u.Id = p.Id_Vendedor LIMIT 1),
          'Sin vendedor'
        ) AS vendedor_nombre,
        p.total AS total_pedido,
        tlp.nombre AS tipo_linea_nombre
      FROM Pedidos p
      JOIN Clientes c ON p.Id_Cliente = c.Id
      JOIN Tipos_Linea_Producto tlp ON p.Id_Tipo_Linea_Producto = tlp.Id
      WHERE p.Id = $1 AND LOWER(TRIM(tlp.nombre)) LIKE '%nacional%'
      LIMIT 1`,
    [pedidoId]
  );
  return result.rows[0];
}

// Pedido de línea importadora (vendedor vía tabla Vendedores).
async function findPedidoImportadora(pedidoId, executor = pool) {
  const result = await executor.query(
    `SELECT
        p.*,
        c.nombre || ' ' || c.apellido as cliente_nombre,
        COALESCE(
          (SELECT d.direccion FROM Direcciones d
           INNER JOIN Cliente_Direcciones cd ON d.Id = cd.Id_Direccion
           WHERE cd.Id_Cliente = c.Id LIMIT 1),
          'Sin dirección'
        ) as cliente_direccion,
        COALESCE(
          (SELECT u.nombre || ' ' || u.apellido FROM Vendedores v
           INNER JOIN Usuarios u ON v.Id_Usuarios = u.Id
           WHERE v.Id = p.Id_Vendedor LIMIT 1),
          'Sin vendedor'
        ) as vendedor_nombre,
        p.total as total_pedido,
        tlp.nombre as tipo_linea_nombre
      FROM Pedidos p
      INNER JOIN Clientes c ON p.Id_Cliente = c.Id
      INNER JOIN Tipos_Linea_Producto tlp ON p.Id_Tipo_Linea_Producto = tlp.Id
      WHERE p.Id = $1 AND LOWER(TRIM(tlp.nombre)) LIKE '%importadora%'
      LIMIT 1`,
    [pedidoId]
  );
  return result.rows[0];
}

async function findProductosNacional(pedidoId, executor = pool) {
  const result = await executor.query(
    `SELECT
        dp.Cantidad, z.Codigo, z.Nombre,
        COALESCE(t.Talla_EU::text, 'N/A') AS talla_eu,
        COALESCE(t.Talla_US::text, 'N/A') AS talla_us,
        COALESCE(dp.Precio_Unitario, z.precio_par, 100.00) AS precio_unitario
      FROM Detalle_Pedidos dp
      JOIN Zapatos z ON dp.Id_Zapato = z.Id
      LEFT JOIN Zapatos_Tallas zt ON z.Id = zt.Id_Zapato AND dp.Id_Talla = zt.Id_Talla
      LEFT JOIN Tallas t ON zt.Id_Talla = t.Id
      WHERE dp.Id_Pedido = $1`,
    [pedidoId]
  );
  return result.rows;
}

async function findProductosImportadora(pedidoId, executor = pool) {
  const result = await executor.query(
    `SELECT
        dp.Cantidad, z.Codigo, z.Nombre,
        COALESCE(t.Talla_EU, 0) as talla_eu,
        COALESCE(t.Talla_US, 0) as talla_us,
        COALESCE(dp.Precio_Unitario, z.precio_par, 100.00) as precio_unitario
      FROM Detalle_Pedidos dp
      INNER JOIN Zapatos z ON dp.Id_Zapato = z.Id
      LEFT JOIN Zapatos_Tallas zt ON z.Id = zt.Id_Zapato AND dp.Id_Talla = zt.Id_Talla
      LEFT JOIN Tallas t ON zt.Id_Talla = t.Id
      WHERE dp.Id_Pedido = $1`,
    [pedidoId]
  );
  return result.rows;
}

async function insertEnvio(
  { pedidoId, fechaEnvio, fechaEntrega, transporte, numeroEnvio, observaciones },
  executor = pool
) {
  const result = await executor.query(
    `INSERT INTO Envios (
        Id_Pedidos, Fecha_Envio, Fecha_Entrega_Estimada, Transporte,
        Id_Estado_Envio, Numero_De_Envio, Numero_Envio_Display, Observaciones
      )
      VALUES ($1, $2, $3, $4, 1, $5, $6, $7)
      RETURNING *`,
    [pedidoId, fechaEnvio, fechaEntrega, transporte, numeroEnvio, numeroEnvio, observaciones]
  );
  return result.rows[0];
}

// Listado de envíos filtrado por patrón de línea (p. ej. '%nacional%').
async function findEnviosByLinea(likePattern, executor = pool) {
  const result = await executor.query(
    `SELECT
        e.*,
        p.Id_Cliente,
        c.nombre || ' ' || c.apellido as cliente_nombre,
        COALESCE(
          (SELECT u.nombre || ' ' || u.apellido FROM Vendedores v
           INNER JOIN Usuarios u ON v.Id_Usuarios = u.Id
           WHERE v.Id = p.Id_Vendedor LIMIT 1),
          'Sin vendedor'
        ) as vendedor_nombre,
        tlp.nombre as tipo_linea_nombre,
        p.total as total_pedido,
        ep.Estado as estado_pedido
      FROM Envios e
      INNER JOIN Pedidos p ON e.Id_Pedidos = p.Id
      INNER JOIN Clientes c ON p.Id_Cliente = c.Id
      LEFT JOIN Estados_Pedidos ep ON p.Id_Estado_Pedido = ep.Id
      LEFT JOIN Tipos_Linea_Producto tlp ON p.Id_Tipo_Linea_Producto = tlp.Id
      WHERE LOWER(tlp.nombre) LIKE $1
      ORDER BY e.Fecha_Envio DESC`,
    [likePattern]
  );
  return result.rows;
}

module.exports = {
  findPedidoNacional,
  findPedidoImportadora,
  findProductosNacional,
  findProductosImportadora,
  insertEnvio,
  findEnviosByLinea,
};
