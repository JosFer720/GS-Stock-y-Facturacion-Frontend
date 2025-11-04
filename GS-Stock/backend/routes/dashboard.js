const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const auth = require('../middleware/auth');

const pool = new Pool({
  user: process.env.DB_USER || 'admin',
  host: process.env.DB_HOST || 'postgres',
  database: process.env.DB_NAME || 'mydb',
  password: process.env.DB_PASSWORD || 'secret',
  port: process.env.DB_PORT || 5432,
});

// Get total revenue (last 30 days with percentage change)
router.get('/ingresos', auth, async (req, res) => {
  try {
    const query = `
      WITH last_30_days AS (
        SELECT COALESCE(SUM(Total), 0) as total
        FROM Pedidos
        WHERE Fecha >= NOW() - INTERVAL '30 days'
      ),
      previous_30_days AS (
        SELECT COALESCE(SUM(Total), 0) as total
        FROM Pedidos
        WHERE Fecha >= NOW() - INTERVAL '60 days'
        AND Fecha < NOW() - INTERVAL '30 days'
      )
      SELECT 
        l.total as total_actual,
        p.total as total_anterior,
        CASE 
          WHEN p.total > 0 THEN ROUND(((l.total - p.total) / p.total * 100)::numeric, 2)
          ELSE 0
        END as porcentaje_cambio
      FROM last_30_days l, previous_30_days p
    `;
    
    const result = await pool.query(query);
    
    res.json({
      success: true,
      data: {
        total: parseFloat(result.rows[0].total_actual),
        porcentaje_cambio: parseFloat(result.rows[0].porcentaje_cambio),
        periodo: 'Últimos 30 días'
      }
    });
  } catch (error) {
    console.error('Error al obtener ingresos:', error);
    res.status(500).json({ 
      error: 'Error al obtener los ingresos',
      details: error.message
    });
  }
});

// Get pending orders count
router.get('/pedidos-pendientes', auth, async (req, res) => {
  try {
    const query = `
      SELECT COUNT(*) as total
      FROM Pedidos p
      INNER JOIN Estados_Pedidos ep ON p.Id_Estado_Pedido = ep.Id
      WHERE ep.Estado = 'Pendiente'
    `;
    
    const result = await pool.query(query);
    
    res.json({
      success: true,
      data: {
        total: parseInt(result.rows[0].total),
        mensaje: 'Acción Requerida'
      }
    });
  } catch (error) {
    console.error('Error al obtener pedidos pendientes:', error);
    res.status(500).json({ 
      error: 'Error al obtener los pedidos pendientes',
      details: error.message
    });
  }
});

// Get new clients this month
router.get('/nuevos-clientes', auth, async (req, res) => {
  try {
    const query = `
      SELECT COUNT(DISTINCT p.Id_Cliente) as total
      FROM Pedidos p
      WHERE DATE_TRUNC('month', p.Fecha) = DATE_TRUNC('month', CURRENT_DATE)
      AND p.Id_Cliente NOT IN (
        SELECT DISTINCT Id_Cliente
        FROM Pedidos
        WHERE DATE_TRUNC('month', Fecha) < DATE_TRUNC('month', CURRENT_DATE)
      )
    `;
    
    const result = await pool.query(query);
    
    res.json({
      success: true,
      data: {
        total: parseInt(result.rows[0].total),
        periodo: 'Este mes'
      }
    });
  } catch (error) {
    console.error('Error al obtener nuevos clientes:', error);
    res.status(500).json({ 
      error: 'Error al obtener los nuevos clientes',
      details: error.message
    });
  }
});

// Get monthly sales graph data (last 12 months)
router.get('/ventas-mensuales', auth, async (req, res) => {
  try {
    const query = `
      WITH meses AS (
        SELECT 
          TO_CHAR(fecha_mes, 'Mon') as mes,
          fecha_mes
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
    `;
    
    const result = await pool.query(query);
    
    res.json({
      success: true,
      data: result.rows.map(row => ({
        mes: row.mes,
        linea_nacional: parseFloat(row.linea_nacional),
        linea_importadora: parseFloat(row.linea_importadora)
      }))
    });
  } catch (error) {
    console.error('Error al obtener ventas mensuales:', error);
    res.status(500).json({ 
      error: 'Error al obtener las ventas mensuales',
      details: error.message
    });
  }
});

// Get top 5 best-selling products
router.get('/productos-mas-vendidos', auth, async (req, res) => {
  try {
    const query = `
      SELECT 
        z.Nombre as producto,
        SUM(dp.Cantidad) as cantidad_vendida
      FROM Detalle_Pedidos dp
      INNER JOIN Zapatos z ON dp.Id_Zapato = z.Id
      INNER JOIN Pedidos p ON dp.Id_Pedido = p.Id
      WHERE p.Fecha >= NOW() - INTERVAL '90 days'
      GROUP BY z.Id, z.Nombre
      ORDER BY cantidad_vendida DESC
      LIMIT 5
    `;
    
    const result = await pool.query(query);
    
    res.json({
      success: true,
      data: result.rows.map(row => ({
        producto: row.producto,
        cantidad: parseInt(row.cantidad_vendida)
      }))
    });
  } catch (error) {
    console.error('Error al obtener productos más vendidos:', error);
    res.status(500).json({ 
      error: 'Error al obtener los productos más vendidos',
      details: error.message
    });
  }
});

// Get recent activity
router.get('/actividad-reciente', auth, async (req, res) => {
  try {
    const query = `
      SELECT 
        p.Id as pedido_id,
        p.Fecha,
        CONCAT(c.Nombre, ' ', c.Apellido) as cliente,
        ep.Estado as estado,
        p.Total,
        STRING_AGG(z.Nombre, ', ') as productos
      FROM Pedidos p
      INNER JOIN Clientes c ON p.Id_Cliente = c.Id
      INNER JOIN Estados_Pedidos ep ON p.Id_Estado_Pedido = ep.Id
      LEFT JOIN Detalle_Pedidos dp ON p.Id = dp.Id_Pedido
      LEFT JOIN Zapatos z ON dp.Id_Zapato = z.Id
      GROUP BY p.Id, p.Fecha, c.Nombre, c.Apellido, ep.Estado, p.Total
      ORDER BY p.Fecha DESC
      LIMIT 5
    `;
    
    const result = await pool.query(query);
    
    res.json({
      success: true,
      data: result.rows.map(row => {
        const tiempoTranscurrido = Math.floor((Date.now() - new Date(row.fecha)) / 60000);
        let mensajeTiempo;
        
        if (tiempoTranscurrido < 1) {
          mensajeTiempo = 'Hace menos de 1 min';
        } else if (tiempoTranscurrido < 60) {
          mensajeTiempo = `Hace ${tiempoTranscurrido} min`;
        } else if (tiempoTranscurrido < 1440) {
          mensajeTiempo = `Hace ${Math.floor(tiempoTranscurrido / 60)} horas`;
        } else {
          mensajeTiempo = `Hace ${Math.floor(tiempoTranscurrido / 1440)} días`;
        }
        
        return {
          pedido_id: row.pedido_id,
          tiempo: mensajeTiempo,
          cliente: row.cliente,
          estado: row.estado,
          productos: row.productos,
          total: parseFloat(row.total)
        };
      })
    });
  } catch (error) {
    console.error('Error al obtener actividad reciente:', error);
    res.status(500).json({ 
      error: 'Error al obtener la actividad reciente',
      details: error.message
    });
  }
});

// Get system alerts
router.get('/alertas', auth, async (req, res) => {
  try {
    const alertas = [];
    
    // Check for low stock
    const stockQuery = `
      SELECT 
        z.Nombre as producto,
        zt.Stock as stock,
        t.Talla_EU
      FROM Zapatos_Tallas zt
      INNER JOIN Zapatos z ON zt.Id_Zapato = z.Id
      INNER JOIN Tallas t ON zt.Id_Talla = t.Id
      WHERE zt.Stock < 30
      ORDER BY zt.Stock ASC
      LIMIT 3
    `;
    
    const stockResult = await pool.query(stockQuery);
    
    stockResult.rows.forEach(row => {
      alertas.push({
        tipo: 'stock_bajo',
        mensaje: `Stock bajo: ${row.producto} (Talla ${row.talla_eu}EU) - ${row.stock} unidades`,
        prioridad: row.stock < 10 ? 'alta' : 'media'
      });
    });
    
    // Check for pending payments
    const pagosQuery = `
      SELECT COUNT(*) as total
      FROM Pedidos p
      INNER JOIN pedidos_estado_pago pep ON p.Id_Pedido_Estado_Pago = pep.Id
      WHERE pep.Estado = 'pendiente'
      AND p.Fecha >= NOW() - INTERVAL '7 days'
    `;
    
    const pagosResult = await pool.query(pagosQuery);
    const pagosPendientes = parseInt(pagosResult.rows[0].total);
    
    if (pagosPendientes > 0) {
      alertas.push({
        tipo: 'pagos_pendientes',
        mensaje: `Pendiente: ${pagosPendientes} pago${pagosPendientes > 1 ? 's' : ''} retrasado${pagosPendientes > 1 ? 's' : ''}`,
        prioridad: 'alta'
      });
    }
    
    // Check for pending orders
    const pedidosQuery = `
      SELECT COUNT(*) as total
      FROM Pedidos p
      INNER JOIN Estados_Pedidos ep ON p.Id_Estado_Pedido = ep.Id
      WHERE ep.Estado = 'Pendiente'
      AND p.Fecha < NOW() - INTERVAL '2 days'
    `;
    
    const pedidosResult = await pool.query(pedidosQuery);
    const pedidosPendientes = parseInt(pedidosResult.rows[0].total);
    
    if (pedidosPendientes > 0) {
      alertas.push({
        tipo: 'pedidos_pendientes',
        mensaje: `${pedidosPendientes} pedido${pedidosPendientes > 1 ? 's' : ''} pendiente${pedidosPendientes > 1 ? 's' : ''} de hace más de 2 días`,
        prioridad: 'media'
      });
    }
    
    if (alertas.length === 0) {
      alertas.push({
        tipo: 'sin_alertas',
        mensaje: 'No hay alertas en este momento',
        prioridad: 'baja'
      });
    }
    
    res.json({
      success: true,
      data: alertas
    });
  } catch (error) {
    console.error('Error al obtener alertas:', error);
    res.status(500).json({ 
      error: 'Error al obtener las alertas',
      details: error.message
    });
  }
});

// Get complete dashboard summary
router.get('/resumen', auth, async (req, res) => {
  try {
    const [ingresos, pedidosPendientes, nuevosClientes, ventasMensuales, productosVendidos, actividad, alertas] = await Promise.all([
      pool.query(`
        WITH last_30_days AS (
          SELECT COALESCE(SUM(Total), 0) as total
          FROM Pedidos
          WHERE Fecha >= NOW() - INTERVAL '30 days'
        ),
        previous_30_days AS (
          SELECT COALESCE(SUM(Total), 0) as total
          FROM Pedidos
          WHERE Fecha >= NOW() - INTERVAL '60 days'
          AND Fecha < NOW() - INTERVAL '30 days'
        )
        SELECT 
          l.total as total_actual,
          CASE 
            WHEN p.total > 0 THEN ROUND(((l.total - p.total) / p.total * 100)::numeric, 2)
            ELSE 0
          END as porcentaje_cambio
        FROM last_30_days l, previous_30_days p
      `),
      pool.query(`
        SELECT COUNT(*) as total
        FROM Pedidos p
        INNER JOIN Estados_Pedidos ep ON p.Id_Estado_Pedido = ep.Id
        WHERE ep.Estado = 'Pendiente'
      `),
      pool.query(`
        SELECT COUNT(DISTINCT p.Id_Cliente) as total
        FROM Pedidos p
        WHERE DATE_TRUNC('month', p.Fecha) = DATE_TRUNC('month', CURRENT_DATE)
      `),
      pool.query(`
        WITH meses AS (
          SELECT 
            TO_CHAR(fecha_mes, 'Mon') as mes,
            fecha_mes
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
      `),
      pool.query(`
        SELECT 
          z.Nombre as producto,
          SUM(dp.Cantidad) as cantidad_vendida
        FROM Detalle_Pedidos dp
        INNER JOIN Zapatos z ON dp.Id_Zapato = z.Id
        INNER JOIN Pedidos p ON dp.Id_Pedido = p.Id
        WHERE p.Fecha >= NOW() - INTERVAL '90 days'
        GROUP BY z.Id, z.Nombre
        ORDER BY cantidad_vendida DESC
        LIMIT 5
      `),
      pool.query(`
        SELECT 
          p.Id as pedido_id,
          p.Fecha,
          CONCAT(c.Nombre, ' ', c.Apellido) as cliente,
          ep.Estado as estado
        FROM Pedidos p
        INNER JOIN Clientes c ON p.Id_Cliente = c.Id
        INNER JOIN Estados_Pedidos ep ON p.Id_Estado_Pedido = ep.Id
        ORDER BY p.Fecha DESC
        LIMIT 5
      `),
      pool.query(`
        SELECT 
          z.Nombre as producto,
          zt.Stock as stock
        FROM Zapatos_Tallas zt
        INNER JOIN Zapatos z ON zt.Id_Zapato = z.Id
        WHERE zt.Stock < 30
        LIMIT 3
      `)
    ]);
    
    res.json({
      success: true,
      data: {
        ingresos: {
          total: parseFloat(ingresos.rows[0].total_actual),
          porcentaje_cambio: parseFloat(ingresos.rows[0].porcentaje_cambio)
        },
        pedidos_pendientes: parseInt(pedidosPendientes.rows[0].total),
        nuevos_clientes: parseInt(nuevosClientes.rows[0].total),
        ventas_mensuales: ventasMensuales.rows,
        productos_mas_vendidos: productosVendidos.rows,
        actividad_reciente: actividad.rows,
        alertas: alertas.rows
      }
    });
  } catch (error) {
    console.error('Error al obtener resumen del dashboard:', error);
    res.status(500).json({ 
      error: 'Error al obtener el resumen del dashboard',
      details: error.message
    });
  }
});

module.exports = router;