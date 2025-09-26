const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const auth = require('../../middleware/auth');

// Configuración de la conexión a PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER || 'admin',
  host: process.env.DB_HOST || 'postgres',
  database: process.env.DB_NAME || 'mydb',
  password: process.env.DB_PASSWORD || 'secret',
  port: process.env.DB_PORT || 5432,
});

// Endpoint 1: Comparación de líneas de producto (Id_Tipos_Linea_Producto) - CORRECTED
router.get('/comparison/product-lines', auth, async (req, res) => {
  try {
    const { year, month } = req.query;
    
    let whereClause = '';
    const queryParams = [];
    
    if (year) {
      whereClause = `WHERE EXTRACT(YEAR FROM p.Fecha) = $1`;
      queryParams.push(year);
      
      if (month) {
        whereClause += ` AND EXTRACT(MONTH FROM p.Fecha) = $2`;
        queryParams.push(month);
      }
    }

    const query = `
      SELECT 
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
      ORDER BY año DESC, mes DESC, tipo_linea_producto
    `;

    const result = await pool.query(query, queryParams);
    
    res.json({
      success: true,
      data: result.rows,
      message: 'Comparación de líneas de producto obtenida exitosamente'
    });
  } catch (error) {
    console.error('Error en comparación de líneas de producto:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// Endpoint 2: Productos más vendidos (por cantidad) - CORRECTED
router.get('/analytics/best-selling-products', auth, async (req, res) => {
  try {
    const { limit = 10, year, month, id_tipo_linea_producto } = req.query;
    
    let whereClause = 'WHERE 1=1';
    const queryParams = [parseInt(limit)];
    let paramCount = 1;

    if (year) {
      paramCount++;
      whereClause += ` AND EXTRACT(YEAR FROM p.Fecha) = $${paramCount}`;
      queryParams.push(year);
    }

    if (month) {
      paramCount++;
      whereClause += ` AND EXTRACT(MONTH FROM p.Fecha) = $${paramCount}`;
      queryParams.push(month);
    }

    if (id_tipo_linea_producto) {
      paramCount++;
      whereClause += ` AND p.Id_Tipo_Linea_Producto = $${paramCount}`;
      queryParams.push(id_tipo_linea_producto);
    }

    const query = `
      SELECT 
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
      GROUP BY 
        z.Id, z.Codigo, z.Nombre, z.Precio_Par, tdc.Tipo, tlp.Nombre, t.Talla_EU, t.Talla_US
      ORDER BY total_vendido DESC
      LIMIT $1
    `;

    const result = await pool.query(query, queryParams);
    
    res.json({
      success: true,
      data: result.rows,
      message: 'Productos más vendidos obtenidos exitosamente'
    });
  } catch (error) {
    console.error('Error obteniendo productos más vendidos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// Endpoint adicional: Ventas mensuales por línea de producto - CORRECTED
router.get('/comparison/monthly-sales', auth, async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    
    const query = `
      SELECT 
        tlp.Id as id_linea_producto,
        tlp.Nombre as linea_producto,
        TO_CHAR(p.Fecha, 'YYYY-MM') as mes,
        TO_CHAR(p.Fecha, 'Month YYYY') as mes_display,
        COALESCE(SUM(p.Total), 0) as ventas_totales,
        COUNT(p.Id) as cantidad_pedidos,
        ROUND(COALESCE(AVG(p.Total), 0), 2) as promedio_pedido,
        COALESCE(SUM(p.Subtotal), 0) as subtotal_total
      FROM Pedidos p
      JOIN Tipos_Linea_Producto tlp ON p.Id_Tipo_Linea_Producto = tlp.Id
      WHERE EXTRACT(YEAR FROM p.Fecha) = $1
      GROUP BY tlp.Id, tlp.Nombre, TO_CHAR(p.Fecha, 'YYYY-MM'), TO_CHAR(p.Fecha, 'Month YYYY')
      ORDER BY mes, linea_producto
    `;

    const result = await pool.query(query, [year]);
    
    res.json({
      success: true,
      data: result.rows,
      message: 'Ventas mensuales por línea de producto obtenidas exitosamente'
    });
  } catch (error) {
    console.error('Error en comparación mensual de ventas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// Endpoint adicional: Productos más vendidos por línea de producto - CORRECTED
router.get('/analytics/best-selling-by-line', auth, async (req, res) => {
  try {
    const query = `
      SELECT 
        tlp.Id as id_linea_producto,
        tlp.Nombre as linea_producto,
        z.Id as id_zapato,
        z.Codigo as codigo_zapato,
        z.Nombre as nombre_zapato,
        tdc.Tipo as tipo_calzado,
        SUM(dp.Cantidad) as total_vendido,
        SUM(dp.Cantidad * COALESCE(dp.Precio_Unitario, z.Precio_Par)) as ingresos_totales,
        COUNT(DISTINCT dp.Id_Pedido) as numero_pedidos
      FROM Detalle_Pedidos dp
      JOIN Zapatos z ON dp.Id_Zapato = z.Id
      JOIN Tipos_De_Calzados tdc ON z.Id_Tipo_De_Zapato = tdc.Id
      JOIN Pedidos p ON dp.Id_Pedido = p.Id
      JOIN Tipos_Linea_Producto tlp ON p.Id_Tipo_Linea_Producto = tlp.Id
      GROUP BY tlp.Id, tlp.Nombre, z.Id, z.Codigo, z.Nombre, tdc.Tipo
      ORDER BY linea_producto, total_vendido DESC
    `;

    const result = await pool.query(query);
    
    // Group by product line for better organization
    const groupedData = result.rows.reduce((acc, row) => {
      if (!acc[row.linea_producto]) {
        acc[row.linea_producto] = [];
      }
      acc[row.linea_producto].push(row);
      return acc;
    }, {});
    
    res.json({
      success: true,
      data: groupedData,
      message: 'Productos más vendidos por línea obtenidos exitosamente'
    });
  } catch (error) {
    console.error('Error obteniendo productos por línea:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// Endpoint adicional: Resumen general para dashboard - CORRECTED
router.get('/dashboard/summary', auth, async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    
    const query = `
      SELECT 
        -- Total de pedidos
        (SELECT COUNT(*) FROM Pedidos WHERE EXTRACT(YEAR FROM Fecha) = $1) as total_pedidos,
        
        -- Total de ventas
        (SELECT COALESCE(SUM(Total), 0) FROM Pedidos WHERE EXTRACT(YEAR FROM Fecha) = $1) as total_ventas,
        
        -- Pedidos por línea de producto
        (SELECT COUNT(*) FROM Pedidos p 
         JOIN Tipos_Linea_Producto tlp ON p.Id_Tipo_Linea_Producto = tlp.Id 
         WHERE EXTRACT(YEAR FROM p.Fecha) = $1 AND tlp.Nombre = 'Linea Nacional') as pedidos_nacional,
         
        (SELECT COUNT(*) FROM Pedidos p 
         JOIN Tipos_Linea_Producto tlp ON p.Id_Tipo_Linea_Producto = tlp.Id 
         WHERE EXTRACT(YEAR FROM p.Fecha) = $1 AND tlp.Nombre = 'Linea Importadora') as pedidos_importadora,
         
        -- Ventas por línea de producto
        (SELECT COALESCE(SUM(Total), 0) FROM Pedidos p 
         JOIN Tipos_Linea_Producto tlp ON p.Id_Tipo_Linea_Producto = tlp.Id 
         WHERE EXTRACT(YEAR FROM p.Fecha) = $1 AND tlp.Nombre = 'Linea Nacional') as ventas_nacional,
         
        (SELECT COALESCE(SUM(Total), 0) FROM Pedidos p 
         JOIN Tipos_Linea_Producto tlp ON p.Id_Tipo_Linea_Producto = tlp.Id 
         WHERE EXTRACT(YEAR FROM p.Fecha) = $1 AND tlp.Nombre = 'Linea Importadora') as ventas_importadora
    `;

    const result = await pool.query(query, [year]);
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Resumen del dashboard obtenido exitosamente'
    });
  } catch (error) {
    console.error('Error obteniendo resumen del dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// Endpoint adicional: Estadísticas de rendimiento - CORRECTED
router.get('/analytics/performance-stats', auth, async (req, res) => {
  try {
    const { year = new Date().getFullYear(), month } = req.query;
    
    let dateFilter = `EXTRACT(YEAR FROM p.Fecha) = $1`;
    const params = [year];
    
    if (month) {
      dateFilter += ` AND EXTRACT(MONTH FROM p.Fecha) = $2`;
      params.push(month);
    }
    
    const query = `
      WITH sales_stats AS (
        SELECT 
          COUNT(*) as total_orders,
          COALESCE(SUM(Total), 0) as total_sales,
          COALESCE(AVG(Total), 0) as avg_order_value,
          COUNT(DISTINCT Id_Cliente) as unique_customers
        FROM Pedidos p
        WHERE ${dateFilter}
      ),
      product_line_stats AS (
        SELECT 
          tlp.Nombre as line_name,
          COUNT(p.Id) as orders_count,
          COALESCE(SUM(p.Total), 0) as line_sales
        FROM Pedidos p
        JOIN Tipos_Linea_Producto tlp ON p.Id_Tipo_Linea_Producto = tlp.Id
        WHERE ${dateFilter}
        GROUP BY tlp.Nombre
      ),
      top_customer AS (
        SELECT 
          c.Nombre || ' ' || c.Apellido as customer_name,
          COUNT(p.Id) as orders_count,
          COALESCE(SUM(p.Total), 0) as total_spent
        FROM Pedidos p
        JOIN Clientes c ON p.Id_Cliente = c.Id
        WHERE ${dateFilter}
        GROUP BY c.Id, c.Nombre, c.Apellido
        ORDER BY total_spent DESC
        LIMIT 1
      )
      SELECT 
        ss.total_orders,
        ss.total_sales,
        ss.avg_order_value,
        ss.unique_customers,
        json_agg(
          json_build_object(
            'line_name', pls.line_name,
            'orders_count', pls.orders_count,
            'line_sales', pls.line_sales
          )
        ) as product_lines,
        tc.customer_name as top_customer_name,
        tc.orders_count as top_customer_orders,
        tc.total_spent as top_customer_spent
      FROM sales_stats ss
      CROSS JOIN product_line_stats pls
      CROSS JOIN top_customer tc
      GROUP BY ss.total_orders, ss.total_sales, ss.avg_order_value, ss.unique_customers,
               tc.customer_name, tc.orders_count, tc.total_spent
    `;

    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      data: result.rows[0] || {},
      message: 'Estadísticas de rendimiento obtenidas exitosamente'
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas de rendimiento:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

module.exports = router;