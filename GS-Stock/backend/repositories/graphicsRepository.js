// Repositorio de Graphics: consultas analíticas de solo lectura, algunas con
// filtros dinámicos (año/mes/período). Toda la construcción de SQL vive aquí.
const pool = require('../db');

async function testConnection(executor = pool) {
  const result = await executor.query('SELECT NOW()');
  return result.rows[0].now;
}

async function getDashboardSummary(year, executor = pool) {
  const result = await executor.query(
    `SELECT
        (SELECT COUNT(*) FROM Pedidos WHERE EXTRACT(YEAR FROM Fecha) = $1) as total_pedidos,
        (SELECT COALESCE(SUM(Total), 0) FROM Pedidos WHERE EXTRACT(YEAR FROM Fecha) = $1) as total_ventas,
        (SELECT COUNT(*) FROM Pedidos p
         JOIN Tipos_Linea_Producto tlp ON p.Id_Tipo_Linea_Producto = tlp.Id
         WHERE EXTRACT(YEAR FROM p.Fecha) = $1 AND tlp.Nombre = 'Linea Nacional') as pedidos_nacional,
        (SELECT COUNT(*) FROM Pedidos p
         JOIN Tipos_Linea_Producto tlp ON p.Id_Tipo_Linea_Producto = tlp.Id
         WHERE EXTRACT(YEAR FROM p.Fecha) = $1 AND tlp.Nombre = 'Linea Importadora') as pedidos_importadora,
        (SELECT COALESCE(SUM(Total), 0) FROM Pedidos p
         JOIN Tipos_Linea_Producto tlp ON p.Id_Tipo_Linea_Producto = tlp.Id
         WHERE EXTRACT(YEAR FROM p.Fecha) = $1 AND tlp.Nombre = 'Linea Nacional') as ventas_nacional,
        (SELECT COALESCE(SUM(Total), 0) FROM Pedidos p
         JOIN Tipos_Linea_Producto tlp ON p.Id_Tipo_Linea_Producto = tlp.Id
         WHERE EXTRACT(YEAR FROM p.Fecha) = $1 AND tlp.Nombre = 'Linea Importadora') as ventas_importadora`,
    [year]
  );
  return result.rows[0];
}

async function getProductLinesComparison({ year, month }, executor = pool) {
  let whereClause = '';
  const params = [];
  if (year) {
    whereClause = 'WHERE EXTRACT(YEAR FROM p.Fecha) = $1';
    params.push(year);
    if (month) {
      whereClause += ' AND EXTRACT(MONTH FROM p.Fecha) = $2';
      params.push(month);
    }
  }

  const result = await executor.query(
    `SELECT
        tlp.Id as id_linea_producto,
        tlp.Nombre as tipo_linea_producto,
        tlp.Descripcion as descripcion_linea,
        EXTRACT(YEAR FROM p.Fecha) as año,
        EXTRACT(MONTH FROM p.Fecha) as mes,
        TO_CHAR(p.Fecha, 'Month') as nombre_mes,
        COUNT(p.Id) as total_pedidos,
        COALESCE(SUM(p.Total), 0) as venta_total,
        COALESCE(AVG(p.Total), 0) as promedio_venta,
        COALESCE(SUM(p.Subtotal), 0) as subtotal_total
      FROM Pedidos p
      JOIN Tipos_Linea_Producto tlp ON p.Id_Tipo_Linea_Producto = tlp.Id
      ${whereClause}
      GROUP BY tlp.Id, tlp.Nombre, tlp.Descripcion, EXTRACT(YEAR FROM p.Fecha), EXTRACT(MONTH FROM p.Fecha), TO_CHAR(p.Fecha, 'Month')
      ORDER BY año DESC, mes DESC, tipo_linea_producto`,
    params
  );
  return result.rows;
}

async function getBestSellingProducts(
  { limit = 10, year, month, id_tipo_linea_producto },
  executor = pool
) {
  let whereClause = 'WHERE 1=1';
  const params = [parseInt(limit, 10)];
  let paramCount = 1;

  if (year) {
    paramCount++;
    whereClause += ` AND EXTRACT(YEAR FROM p.Fecha) = $${paramCount}`;
    params.push(year);
  }
  if (month) {
    paramCount++;
    whereClause += ` AND EXTRACT(MONTH FROM p.Fecha) = $${paramCount}`;
    params.push(month);
  }
  if (id_tipo_linea_producto) {
    paramCount++;
    whereClause += ` AND p.Id_Tipo_Linea_Producto = $${paramCount}`;
    params.push(id_tipo_linea_producto);
  }

  const result = await executor.query(
    `SELECT
        z.Id as id_zapato,
        z.Codigo as codigo_zapato,
        z.Nombre as nombre_zapato,
        z.Precio_Par as precio_par,
        tdc.Tipo as tipo_calzado,
        tlp.Nombre as linea_producto,
        SUM(dp.Cantidad) as total_vendido,
        SUM(dp.Cantidad * COALESCE(dp.Precio_Unitario, z.Precio_Par)) as ingresos_totales,
        COUNT(DISTINCT dp.Id_Pedido) as numero_pedidos,
        AVG(COALESCE(dp.Precio_Unitario, z.Precio_Par)) as precio_promedio,
        COALESCE(t.Talla_EU, 0) as talla_eu,
        COALESCE(t.Talla_US, 0) as talla_us
      FROM Detalle_Pedidos dp
      JOIN Zapatos z ON dp.Id_Zapato = z.Id
      JOIN Tipos_De_Calzados tdc ON z.Id_Tipo_De_Zapato = tdc.Id
      JOIN Pedidos p ON dp.Id_Pedido = p.Id
      JOIN Tipos_Linea_Producto tlp ON p.Id_Tipo_Linea_Producto = tlp.Id
      LEFT JOIN Tallas t ON dp.Id_Talla = t.Id
      ${whereClause}
      GROUP BY z.Id, z.Codigo, z.Nombre, z.Precio_Par, tdc.Tipo, tlp.Nombre, t.Talla_EU, t.Talla_US
      ORDER BY total_vendido DESC
      LIMIT $1`,
    params
  );
  return result.rows;
}

async function getVendedorPerformance(
  { vendedor_id, period = 'month', year, month },
  executor = pool
) {
  let whereClause = 'WHERE 1=1';
  let dateGrouping = '';
  let orderClause = '';
  const params = [];
  let paramCount = 0;

  if (vendedor_id) {
    paramCount++;
    whereClause += ` AND v.Id = $${paramCount}`;
    params.push(vendedor_id);
  }

  if (period === 'week') {
    paramCount++;
    whereClause += ` AND EXTRACT(YEAR FROM p.Fecha) = $${paramCount}`;
    params.push(year);
    if (month) {
      paramCount++;
      whereClause += ` AND EXTRACT(MONTH FROM p.Fecha) = $${paramCount}`;
      params.push(month);
    }
    dateGrouping = `
        EXTRACT(WEEK FROM p.Fecha) as periodo_numero,
        'Semana ' || EXTRACT(WEEK FROM p.Fecha) as periodo_display,
        TO_CHAR(p.Fecha, 'YYYY-"W"WW') as periodo_key`;
    orderClause = 'ORDER BY EXTRACT(YEAR FROM p.Fecha), EXTRACT(WEEK FROM p.Fecha), vendedor_nombre';
  } else {
    paramCount++;
    whereClause += ` AND EXTRACT(YEAR FROM p.Fecha) = $${paramCount}`;
    params.push(year);
    dateGrouping = `
        EXTRACT(MONTH FROM p.Fecha) as periodo_numero,
        TO_CHAR(p.Fecha, 'Month') as periodo_display,
        TO_CHAR(p.Fecha, 'YYYY-MM') as periodo_key`;
    orderClause = 'ORDER BY EXTRACT(YEAR FROM p.Fecha), EXTRACT(MONTH FROM p.Fecha), vendedor_nombre';
  }

  const result = await executor.query(
    `SELECT
        v.Id as vendedor_id,
        u.Nombre || ' ' || u.Apellido as vendedor_nombre,
        ${dateGrouping},
        COUNT(p.Id) as total_pedidos,
        COALESCE(SUM(p.Total), 0) as ventas_totales,
        COALESCE(AVG(p.Total), 0) as promedio_venta,
        COUNT(DISTINCT p.Id_Cliente) as clientes_unicos
      FROM Pedidos p
      JOIN Vendedores v ON p.Id_Vendedor = v.Id
      JOIN Usuarios u ON v.Id_Usuarios = u.Id
      ${whereClause}
      GROUP BY
        v.Id, u.Nombre, u.Apellido,
        EXTRACT(YEAR FROM p.Fecha),
        EXTRACT(${period === 'week' ? 'WEEK' : 'MONTH'} FROM p.Fecha),
        periodo_numero, periodo_display, periodo_key
      ${orderClause}`,
    params
  );
  return result.rows;
}

async function getSalesPerformance({ period = 'month', year, month }, executor = pool) {
  let whereClause = 'WHERE EXTRACT(YEAR FROM p.Fecha) = $1';
  let dateGrouping = '';
  let orderClause = '';
  const params = [year];

  if (period === 'week') {
    if (month) {
      whereClause += ' AND EXTRACT(MONTH FROM p.Fecha) = $2';
      params.push(month);
    }
    dateGrouping = `
        EXTRACT(WEEK FROM p.Fecha) as periodo_numero,
        'Semana ' || EXTRACT(WEEK FROM p.Fecha) as periodo_display,
        TO_CHAR(p.Fecha, 'YYYY-"W"WW') as periodo_key,
        DATE_TRUNC('week', p.Fecha) as fecha_inicio_periodo`;
    orderClause = 'ORDER BY EXTRACT(YEAR FROM p.Fecha), EXTRACT(WEEK FROM p.Fecha)';
  } else {
    dateGrouping = `
        EXTRACT(MONTH FROM p.Fecha) as periodo_numero,
        TO_CHAR(p.Fecha, 'Month') as periodo_display,
        TO_CHAR(p.Fecha, 'YYYY-MM') as periodo_key,
        DATE_TRUNC('month', p.Fecha) as fecha_inicio_periodo`;
    orderClause = 'ORDER BY EXTRACT(YEAR FROM p.Fecha), EXTRACT(MONTH FROM p.Fecha)';
  }

  const result = await executor.query(
    `SELECT
        ${dateGrouping},
        COUNT(p.Id) as total_pedidos,
        COALESCE(SUM(p.Total), 0) as ventas_totales,
        COALESCE(AVG(p.Total), 0) as promedio_pedido,
        COUNT(DISTINCT p.Id_Cliente) as clientes_unicos,
        COUNT(DISTINCT p.Id_Vendedor) as vendedores_activos,
        COALESCE(SUM(CASE WHEN tlp.Nombre = 'Linea Nacional' THEN p.Total ELSE 0 END), 0) as ventas_nacional,
        COALESCE(SUM(CASE WHEN tlp.Nombre = 'Linea Importadora' THEN p.Total ELSE 0 END), 0) as ventas_importadora,
        COUNT(CASE WHEN tlp.Nombre = 'Linea Nacional' THEN p.Id ELSE NULL END) as pedidos_nacional,
        COUNT(CASE WHEN tlp.Nombre = 'Linea Importadora' THEN p.Id ELSE NULL END) as pedidos_importadora
      FROM Pedidos p
      JOIN Tipos_Linea_Producto tlp ON p.Id_Tipo_Linea_Producto = tlp.Id
      ${whereClause}
      GROUP BY
        EXTRACT(YEAR FROM p.Fecha),
        EXTRACT(${period === 'week' ? 'WEEK' : 'MONTH'} FROM p.Fecha),
        periodo_numero, periodo_display, periodo_key, fecha_inicio_periodo
      ${orderClause}`,
    params
  );
  return result.rows;
}

async function getVendedoresList(executor = pool) {
  const result = await executor.query(
    `SELECT DISTINCT
        v.Id as vendedor_id,
        u.Nombre || ' ' || u.Apellido as vendedor_nombre,
        u.Nombre as nombre,
        u.Apellido as apellido,
        COUNT(p.Id) as total_pedidos
      FROM Vendedores v
      JOIN Usuarios u ON v.Id_Usuarios = u.Id
      LEFT JOIN Pedidos p ON v.Id = p.Id_Vendedor
      GROUP BY v.Id, u.Nombre, u.Apellido
      HAVING COUNT(p.Id) > 0
      ORDER BY vendedor_nombre`
  );
  return result.rows;
}

module.exports = {
  testConnection,
  getDashboardSummary,
  getProductLinesComparison,
  getBestSellingProducts,
  getVendedorPerformance,
  getSalesPerformance,
  getVendedoresList,
};
