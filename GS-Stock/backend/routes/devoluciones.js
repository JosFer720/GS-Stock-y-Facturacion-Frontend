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

router.get('/', auth, async (req, res) => {
  try {
    const query = `
      SELECT 
        d.Id as id,
        d.Fecha as fecha,
        d.Motivo as motivo,
        d.Monto as monto,
        p.Id as pedido_id,
        CONCAT(c.Nombre, ' ', c.Apellido) as cliente_nombre,
        c.Empresa as cliente_empresa,
        md.Metodo as metodo_devolucion,
        STRING_AGG(
          CONCAT(z.Codigo, ' - ', z.Nombre, ' (', t.Talla_EU, 'EU)'), 
          ', '
        ) as productos,
        SUM(dp.Cantidad) as cantidad_total
      FROM Devoluciones d
      INNER JOIN Pedidos p ON d.Id_Pedido = p.Id
      INNER JOIN Clientes c ON p.Id_Cliente = c.Id
      INNER JOIN Metodos_Devolucion md ON d.Id_Metodo_Devolucion = md.Id
      LEFT JOIN Detalle_Pedidos dp ON p.Id = dp.Id_Pedido
      LEFT JOIN Zapatos z ON dp.Id_Zapato = z.Id
      LEFT JOIN Zapatos_Tallas zt ON z.Id = zt.Id_Zapato
      LEFT JOIN Tallas t ON zt.Id_Talla = t.Id
      GROUP BY d.Id, d.Fecha, d.Motivo, d.Monto, p.Id, c.Nombre, c.Apellido, c.Empresa, md.Metodo
      ORDER BY d.Fecha DESC
    `;
    
    const result = await pool.query(query);
    
    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Error al obtener devoluciones:', error);
    res.status(500).json({ 
      error: 'Error al obtener las devoluciones',
      details: error.message
    });
  }
});

router.get('/pedidos-cliente/:clienteId', auth, async (req, res) => {
  try {
    const { clienteId } = req.params;
    
    const query = `
      SELECT 
        p.Id as id,
        p.Fecha as fecha,
        p.Total as total,
        p.Subtotal as subtotal,
        ep.Estado as estado,
        CASE WHEN d.Id IS NOT NULL THEN true ELSE false END as tiene_devolucion
      FROM Pedidos p
      INNER JOIN Estados_Pedidos ep ON p.Id_Estado_Pedido = ep.Id
      LEFT JOIN Devoluciones d ON p.Id = d.Id_Pedido
      WHERE p.Id_Cliente = $1 
        AND ep.Estado = 'Entregado'
        AND d.Id IS NULL
      ORDER BY p.Fecha DESC
    `;
    
    const result = await pool.query(query, [clienteId]);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error al obtener pedidos del cliente:', error);
    res.status(500).json({ 
      error: 'Error al obtener los pedidos del cliente',
      details: error.message
    });
  }
});

router.get('/metodos', auth, async (req, res) => {
  try {
    const query = 'SELECT Id as id, Metodo as metodo FROM Metodos_Devolucion ORDER BY Metodo';
    const result = await pool.query(query);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error al obtener métodos de devolución:', error);
    res.status(500).json({ 
      error: 'Error al obtener los métodos de devolución',
      details: error.message
    });
  }
});

router.post('/', auth, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { 
      id_pedido, 
      motivo, 
      monto_devolucion,
      observaciones_adicionales 
    } = req.body;
    
    if (!id_pedido || !motivo) {
      return res.status(400).json({ 
        error: 'Se requieren los campos: id_pedido, motivo' 
      });
    }
    
    const pedidoQuery = `
      SELECT 
        p.Id, 
        p.Total, 
        p.Id_Cliente,
        ep.Estado,
        CONCAT(c.Nombre, ' ', c.Apellido) as cliente_nombre
      FROM Pedidos p
      INNER JOIN Estados_Pedidos ep ON p.Id_Estado_Pedido = ep.Id
      INNER JOIN Clientes c ON p.Id_Cliente = c.Id
      WHERE p.Id = $1
    `;
    
    const pedidoResult = await client.query(pedidoQuery, [id_pedido]);
    
    if (pedidoResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }
    
    const pedido = pedidoResult.rows[0];
    
    if (pedido.estado !== 'Entregado') {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: 'Solo se pueden hacer devoluciones de pedidos entregados' 
      });
    }
    
    const devolucionExistente = await client.query(
      'SELECT id FROM Devoluciones WHERE id_pedido = $1',
      [id_pedido]
    );
    
    if (devolucionExistente.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: 'Este pedido ya tiene una devolución registrada' 
      });
    }
    
    // Obtener el método de devolución por defecto "Efectivo" (ID 1)
    const metodoDefaultId = 1; // Efectivo es el método por defecto
    
    const montoFinal = monto_devolucion || pedido.total;
    
    if (montoFinal > pedido.total) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: 'El monto de devolución no puede ser mayor al total del pedido' 
      });
    }
    
    const devolucionResult = await client.query(
      'INSERT INTO Devoluciones (Id_Pedido, Motivo, Id_Metodo_Devolucion, Monto, Fecha) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) RETURNING Id, Fecha',
      [id_pedido, motivo, metodoDefaultId, montoFinal]
    );
    
    const devolucionId = devolucionResult.rows[0].id;
    const fechaDevolucion = devolucionResult.rows[0].fecha;
    
    // LÓGICA DE AUMENTO DE INVENTARIO POR DEVOLUCIÓN
    // Obtener todos los productos del pedido con sus tallas
    const productosQuery = `
      SELECT 
        dp.Id_Zapato, 
        dp.Id_Talla,
        dp.Cantidad,
        z.Codigo as zapato_codigo,
        z.Nombre as zapato_nombre,
        t.Talla_EU,
        t.Talla_US
      FROM Detalle_Pedidos dp
      INNER JOIN Zapatos z ON dp.Id_Zapato = z.Id
      LEFT JOIN Tallas t ON dp.Id_Talla = t.Id
      WHERE dp.Id_Pedido = $1
    `;
    
    const productosResult = await client.query(productosQuery, [id_pedido]);
    
    if (productosResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: 'No se encontraron productos en el pedido para devolver' 
      });
    }
    
    // Aumentar el inventario para cada producto devuelto
    for (const producto of productosResult.rows) {
      // 1. Aumentar stock en Zapatos_Tallas (inventario por talla)
      if (producto.id_talla) {
        const updateTallaResult = await client.query(
          `UPDATE Zapatos_Tallas 
           SET Stock = Stock + $1 
           WHERE Id_Zapato = $2 AND Id_Talla = $3
           RETURNING Stock`,
          [producto.cantidad, producto.id_zapato, producto.id_talla]
        );
        
        console.log(`✓ Stock actualizado para ${producto.zapato_nombre} (Talla ${producto.talla_eu}EU): +${producto.cantidad} → ${updateTallaResult.rows[0]?.stock || 0}`);
      }
      
      // 2. Aumentar cantidad en Inventarios (inventario general)
      const updateInventarioResult = await client.query(
        `UPDATE Inventarios 
         SET Cantidad = Cantidad + $1 
         WHERE Id_Zapatos = $2
         RETURNING Cantidad`,
        [producto.cantidad, producto.id_zapato]
      );
      
      if (updateInventarioResult.rows.length === 0) {
        // Si no existe entrada en inventario, crearla
        await client.query(
          `INSERT INTO Inventarios (Id_Zapatos, Cantidad, Fecha_Actualizacion)
           VALUES ($1, $2, CURRENT_TIMESTAMP)`,
          [producto.id_zapato, producto.cantidad]
        );
        
        console.log(`✓ Entrada de inventario creada para ${producto.zapato_nombre}: ${producto.cantidad} unidades`);
      } else {
        console.log(`✓ Inventario actualizado para ${producto.zapato_nombre}: +${producto.cantidad} → ${updateInventarioResult.rows[0].cantidad}`);
      }
    }
    
    await client.query(
      'INSERT INTO Estados_Pedido_Historico (Id_Pedido, Id_Estado_Pedido, Id_Usuario, Fecha_Actualizacion, Observacion) VALUES ($1, (SELECT Id FROM Estados_Pedidos WHERE Estado = $2), $3, CURRENT_TIMESTAMP, $4)',
      [id_pedido, 'Entregado', req.usuario?.id || 1, `Devolución registrada: ${motivo}${observaciones_adicionales ? '. ' + observaciones_adicionales : ''}`]
    );
    
    await client.query('COMMIT');
    
    res.status(201).json({
      success: true,
      mensaje: 'Devolución registrada exitosamente',
      data: {
        id: devolucionId,
        id_pedido,
        cliente_nombre: pedido.cliente_nombre,
        motivo,
        monto_devuelto: parseFloat(montoFinal),
        metodo_devolucion: 'Efectivo',
        fecha: fechaDevolucion,
        productos_devueltos: productosResult.rows.length
      }
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al crear devolución:', error);
    res.status(500).json({ 
      error: 'Error al registrar la devolución',
      details: error.message
    });
  } finally {
    client.release();
  }
});

router.put('/:id', auth, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { motivo, id_metodo_devolucion, monto } = req.body;
    
    const devolucionExistente = await client.query(
      'SELECT * FROM Devoluciones WHERE Id = $1',
      [id]
    );
    
    if (devolucionExistente.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Devolución no encontrada' });
    }
    
    const camposActualizar = [];
    const valores = [];
    let contador = 1;
    
    if (motivo) {
      camposActualizar.push(`Motivo = $${contador}`);
      valores.push(motivo);
      contador++;
    }
    
    if (id_metodo_devolucion) {
      camposActualizar.push(`Id_Metodo_Devolucion = $${contador}`);
      valores.push(id_metodo_devolucion);
      contador++;
    }
    
    if (monto !== undefined) {
      camposActualizar.push(`Monto = $${contador}`);
      valores.push(monto);
      contador++;
    }
    
    if (camposActualizar.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No se proporcionaron campos para actualizar' });
    }
    
    valores.push(id);
    const query = `UPDATE Devoluciones SET ${camposActualizar.join(', ')} WHERE Id = $${contador} RETURNING *`;
    
    const resultado = await client.query(query, valores);
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      mensaje: 'Devolución actualizada exitosamente',
      data: resultado.rows[0]
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al actualizar devolución:', error);
    res.status(500).json({ 
      error: 'Error al actualizar la devolución',
      details: error.message
    });
  } finally {
    client.release();
  }
});

router.delete('/:id', auth, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    
    const devolucionExistente = await client.query(
      'SELECT * FROM Devoluciones WHERE Id = $1',
      [id]
    );
    
    if (devolucionExistente.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Devolución no encontrada' });
    }
    
    await client.query('DELETE FROM Devoluciones WHERE Id = $1', [id]);
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      mensaje: 'Devolución eliminada exitosamente'
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al eliminar devolución:', error);
    res.status(500).json({ 
      error: 'Error al eliminar la devolución',
      details: error.message
    });
  } finally {
    client.release();
  }
});

router.get('/reporte', auth, async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin } = req.query;
    
    let whereClause = '';
    const params = [];
    
    if (fecha_inicio && fecha_fin) {
      whereClause = 'WHERE d.Fecha BETWEEN $1 AND $2';
      params.push(fecha_inicio, fecha_fin);
    }
    
    const query = `
      SELECT 
        COUNT(*) as total_devoluciones,
        SUM(d.Monto) as monto_total_devuelto,
        AVG(d.Monto) as monto_promedio,
        md.Metodo,
        COUNT(md.Metodo) as cantidad_por_metodo
      FROM Devoluciones d
      INNER JOIN Metodos_Devolucion md ON d.Id_Metodo_Devolucion = md.Id
      ${whereClause}
      GROUP BY md.Metodo
      ORDER BY cantidad_por_metodo DESC
    `;
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      data: result.rows,
      periodo: {
        fecha_inicio: fecha_inicio || 'Sin límite',
        fecha_fin: fecha_fin || 'Sin límite'
      }
    });
    
  } catch (error) {
    console.error('Error al generar reporte de devoluciones:', error);
    res.status(500).json({ 
      error: 'Error al generar el reporte',
      details: error.message
    });
  }
});

module.exports = router;