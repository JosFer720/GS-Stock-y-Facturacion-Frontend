// Repositorio de Dashboard: consultas de solo lectura para métricas.
const pool = require('../db');

async function getIngresos(executor = pool) {
  const result = await executor.query(`
    WITH last_30_days AS (
      SELECT COALESCE(SUM(Total), 0) as total FROM Pedidos
      WHERE Fecha >= NOW() - INTERVAL '30 days'
    ),
    previous_30_days AS (
      SELECT COALESCE(SUM(Total), 0) as total FROM Pedidos
      WHERE Fecha >= NOW() - INTERVAL '60 days' AND Fecha < NOW() - INTERVAL '30 days'
    )
    SELECT
      l.total as total_actual,
      p.total as total_anterior,
      CASE WHEN p.total > 0 THEN ROUND(((l.total - p.total) / p.total * 100)::numeric, 2) ELSE 0 END as porcentaje_cambio
    FROM last_30_days l, previous_30_days p
  `);
  return result.rows[0];
}

async function countPedidosPendientes(executor = pool) {
  const result = await executor.query(`
    SELECT COUNT(*) as total FROM Pedidos p
    INNER JOIN Estados_Pedidos ep ON p.Id_Estado_Pedido = ep.Id
    WHERE ep.Estado = 'Pendiente'
  `);
  return result.rows[0].total;
}

// Clientes "nuevos" del mes (no habían pedido antes).
async function countNuevosClientes(executor = pool) {
  const result = await executor.query(`
    SELECT COUNT(DISTINCT p.Id_Cliente) as total FROM Pedidos p
    WHERE DATE_TRUNC('month', p.Fecha) = DATE_TRUNC('month', CURRENT_DATE)
    AND p.Id_Cliente NOT IN (
      SELECT DISTINCT Id_Cliente FROM Pedidos
      WHERE DATE_TRUNC('month', Fecha) < DATE_TRUNC('month', CURRENT_DATE)
    )
  `);
  return result.rows[0].total;
}

// Variante usada en /resumen: clientes distintos del mes (sin excluir recurrentes).
async function countClientesDelMes(executor = pool) {
  const result = await executor.query(`
    SELECT COUNT(DISTINCT p.Id_Cliente) as total FROM Pedidos p
    WHERE DATE_TRUNC('month', p.Fecha) = DATE_TRUNC('month', CURRENT_DATE)
  `);
  return result.rows[0].total;
}

async function getVentasMensuales(executor = pool) {
  const result = await executor.query(`
    WITH meses AS (
      SELECT TO_CHAR(fecha_mes, 'Mon') as mes, fecha_mes
      FROM generate_series(
        DATE_TRUNC('month', CURRENT_DATE - INTERVAL '11 months'),
        DATE_TRUNC('month', CURRENT_DATE),
        '1 month'::interval
      ) AS fecha_mes
    )
    SELECT
      m.mes,
      COALESCE(SUM(CASE WHEN tlp.Nombre = 'Linea Nacional' THEN p.Total ELSE 0 END), 0) as linea_nacional,
      COALESCE(SUM(CASE WHEN tlp.Nombre = 'Linea Importadora' THEN p.Total ELSE 0 END), 0) as linea_importadora
    FROM meses m
    LEFT JOIN Pedidos p ON DATE_TRUNC('month', p.Fecha) = m.fecha_mes
    LEFT JOIN Tipos_Linea_Producto tlp ON p.Id_Tipo_Linea_Producto = tlp.Id
    GROUP BY m.mes, m.fecha_mes
    ORDER BY m.fecha_mes
  `);
  return result.rows;
}

async function getProductosMasVendidos(executor = pool) {
  const result = await executor.query(`
    SELECT z.Nombre as producto, SUM(dp.Cantidad) as cantidad_vendida
    FROM Detalle_Pedidos dp
    INNER JOIN Zapatos z ON dp.Id_Zapato = z.Id
    INNER JOIN Pedidos p ON dp.Id_Pedido = p.Id
    WHERE p.Fecha >= NOW() - INTERVAL '90 days'
    GROUP BY z.Id, z.Nombre
    ORDER BY cantidad_vendida DESC
    LIMIT 5
  `);
  return result.rows;
}

async function getActividadReciente(executor = pool) {
  const result = await executor.query(`
    SELECT
      p.Id as pedido_id, p.Fecha,
      CONCAT(c.Nombre, ' ', c.Apellido) as cliente,
      ep.Estado as estado, p.Total,
      STRING_AGG(z.Nombre, ', ') as productos
    FROM Pedidos p
    INNER JOIN Clientes c ON p.Id_Cliente = c.Id
    INNER JOIN Estados_Pedidos ep ON p.Id_Estado_Pedido = ep.Id
    LEFT JOIN Detalle_Pedidos dp ON p.Id = dp.Id_Pedido
    LEFT JOIN Zapatos z ON dp.Id_Zapato = z.Id
    GROUP BY p.Id, p.Fecha, c.Nombre, c.Apellido, ep.Estado, p.Total
    ORDER BY p.Fecha DESC
    LIMIT 5
  `);
  return result.rows;
}

// Variante simplificada usada en /resumen.
async function getActividadResumen(executor = pool) {
  const result = await executor.query(`
    SELECT
      p.Id as pedido_id, p.Fecha,
      CONCAT(c.Nombre, ' ', c.Apellido) as cliente,
      ep.Estado as estado
    FROM Pedidos p
    INNER JOIN Clientes c ON p.Id_Cliente = c.Id
    INNER JOIN Estados_Pedidos ep ON p.Id_Estado_Pedido = ep.Id
    ORDER BY p.Fecha DESC
    LIMIT 5
  `);
  return result.rows;
}

async function getStockBajoConTalla(executor = pool) {
  const result = await executor.query(`
    SELECT z.Nombre as producto, zt.Stock as stock, t.Talla_EU
    FROM Zapatos_Tallas zt
    INNER JOIN Zapatos z ON zt.Id_Zapato = z.Id
    INNER JOIN Tallas t ON zt.Id_Talla = t.Id
    WHERE zt.Stock < 30
    ORDER BY zt.Stock ASC
    LIMIT 3
  `);
  return result.rows;
}

// Variante usada en /resumen (sin talla).
async function getStockBajoResumen(executor = pool) {
  const result = await executor.query(`
    SELECT z.Nombre as producto, zt.Stock as stock
    FROM Zapatos_Tallas zt
    INNER JOIN Zapatos z ON zt.Id_Zapato = z.Id
    WHERE zt.Stock < 30
    LIMIT 3
  `);
  return result.rows;
}

async function countPagosPendientes7d(executor = pool) {
  const result = await executor.query(`
    SELECT COUNT(*) as total FROM Pedidos p
    INNER JOIN pedidos_estado_pago pep ON p.Id_Pedido_Estado_Pago = pep.Id
    WHERE pep.Estado = 'pendiente' AND p.Fecha >= NOW() - INTERVAL '7 days'
  `);
  return parseInt(result.rows[0].total, 10);
}

async function countPedidosPendientes2d(executor = pool) {
  const result = await executor.query(`
    SELECT COUNT(*) as total FROM Pedidos p
    INNER JOIN Estados_Pedidos ep ON p.Id_Estado_Pedido = ep.Id
    WHERE ep.Estado = 'Pendiente' AND p.Fecha < NOW() - INTERVAL '2 days'
  `);
  return parseInt(result.rows[0].total, 10);
}

module.exports = {
  getIngresos,
  countPedidosPendientes,
  countNuevosClientes,
  countClientesDelMes,
  getVentasMensuales,
  getProductosMasVendidos,
  getActividadReciente,
  getActividadResumen,
  getStockBajoConTalla,
  getStockBajoResumen,
  countPagosPendientes7d,
  countPedidosPendientes2d,
};
