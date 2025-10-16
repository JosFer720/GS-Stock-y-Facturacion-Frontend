const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const auth = require('../../middleware/auth'); 
const rateLimiter = require('../../middleware/rateLimiter');

const pool = new Pool({
  user: process.env.DB_USER || 'admin',
  host: process.env.DB_HOST || 'postgres',
  database: process.env.DB_NAME || 'mydb',
  password: process.env.DB_PASSWORD || 'secret',
  port: process.env.DB_PORT || 5432,
});

// ENDPOINT: Obtener todos los métodos de devolución
router.get('/metodos', auth, apiLimiter, async (req, res) => {
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

// ENDPOINT: Obtener pedidos "Despachado" de un cliente con productos detallados
router.get('/pedidos-cliente/:clienteId', auth, apiLimiter, async (req, res) => {
  try {
    const { clienteId } = req.params;
    
    // Query para obtener pedidos despachados con sus productos
    const query = `
      SELECT 
        p.id as pedido_id,
        p.fecha as pedido_fecha,
        p.total as pedido_total,
        ep.estado as pedido_estado,
        dp.id as detalle_id,
        dp.cantidad,
        dp.precio_unitario,
        z.id as zapato_id,
        z.codigo,
        z.nombre as zapato_nombre,
        t.id as talla_id,
        t.talla_eu,
        t.talla_us
      FROM Pedidos p
      INNER JOIN Estados_Pedidos ep ON p.id_estado_pedido = ep.id
      INNER JOIN Detalle_Pedidos dp ON p.id = dp.id_pedido
      INNER JOIN Zapatos z ON dp.id_zapato = z.id
      LEFT JOIN Tallas t ON dp.id_talla = t.id
      WHERE p.id_cliente = $1 
        AND ep.estado = 'Despachado'
        AND NOT EXISTS (
          SELECT 1 FROM Devoluciones d 
          WHERE d.id_pedido = p.id
        )
      ORDER BY p.fecha DESC, z.codigo
    `;
    
    const result = await pool.query(query, [clienteId]);
    
    // Agrupar productos por pedido
    const pedidosMap = new Map();
    
    result.rows.forEach(row => {
      if (!pedidosMap.has(row.pedido_id)) {
        pedidosMap.set(row.pedido_id, {
          id: row.pedido_id,
          fecha: row.pedido_fecha,
          total: row.pedido_total,
          estado: row.pedido_estado,
          productos: []
        });
      }
      
      const pedido = pedidosMap.get(row.pedido_id);
      pedido.productos.push({
        detalle_id: row.detalle_id,
        zapato_id: row.zapato_id,
        codigo: row.codigo,
        nombre: row.zapato_nombre,
        talla_id: row.talla_id,
        talla_eu: row.talla_eu,
        talla_us: row.talla_us,
        cantidad: row.cantidad,
        precio_unitario: row.precio_unitario
      });
    });
    
    const pedidos = Array.from(pedidosMap.values());
    
    res.json({
      success: true,
      data: pedidos
    });
  } catch (error) {
    console.error('Error al obtener pedidos del cliente:', error);
    res.status(500).json({ 
      error: 'Error al obtener los pedidos del cliente',
      details: error.message
    });
  }
});

// ENDPOINT: Registrar nueva devolución con productos específicos
router.post('/', auth, apiLimiter, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { 
      id_pedido, 
      productos, // Array de {detalle_id, zapato_id, talla_id, cantidad}
      motivo, 
      id_metodo_devolucion,
      observaciones_adicionales 
    } = req.body;
    
    // Validaciones básicas
    if (!id_pedido || !productos || productos.length === 0 || !motivo || !id_metodo_devolucion) {
      return res.status(400).json({ 
        error: 'Se requieren los campos: id_pedido, productos (array), motivo, id_metodo_devolucion' 
      });
    }
    
    // Verificar que el pedido existe y está en estado "Despachado"
    const pedidoQuery = `
      SELECT 
        p.id, 
        p.total, 
        p.id_cliente,
        ep.estado,
        CONCAT(c.nombre, ' ', c.apellido) as cliente_nombre
      FROM Pedidos p
      INNER JOIN Estados_Pedidos ep ON p.id_estado_pedido = ep.id
      INNER JOIN Clientes c ON p.id_cliente = c.id
      WHERE p.id = $1
    `;
    
    const pedidoResult = await client.query(pedidoQuery, [id_pedido]);
    
    if (pedidoResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }
    
    const pedido = pedidoResult.rows[0];
    
    if (pedido.estado !== 'Despachado') {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: 'Solo se pueden hacer devoluciones de pedidos despachados' 
      });
    }
    
    // Verificar que no exista ya una devolución para este pedido
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
    
    // Validar método de devolución
    const metodoResult = await client.query(
      'SELECT id, metodo FROM Metodos_Devolucion WHERE id = $1',
      [id_metodo_devolucion]
    );
    
    if (metodoResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Método de devolución no válido' });
    }
    
    // Calcular monto total de devolución basado en productos seleccionados
    let montoTotalDevolucion = 0;
    const productosValidados = [];
    
    for (const prod of productos) {
      // Verificar que el producto existe en el detalle del pedido
      const detalleQuery = `
        SELECT dp.id, dp.cantidad, dp.precio_unitario, dp.id_zapato, dp.id_talla,
               z.codigo, z.nombre
        FROM Detalle_Pedidos dp
        INNER JOIN Zapatos z ON dp.id_zapato = z.id
        WHERE dp.id = $1 AND dp.id_pedido = $2
      `;
      
      const detalleResult = await client.query(detalleQuery, [prod.detalle_id, id_pedido]);
      
      if (detalleResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          error: `Producto con detalle_id ${prod.detalle_id} no encontrado en el pedido` 
        });
      }
      
      const detalle = detalleResult.rows[0];
      
      // Verificar que la cantidad a devolver no exceda la cantidad original
      if (prod.cantidad > detalle.cantidad) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          error: `La cantidad a devolver (${prod.cantidad}) excede la cantidad original (${detalle.cantidad}) para ${detalle.nombre}` 
        });
      }
      
      const montoProducto = prod.cantidad * parseFloat(detalle.precio_unitario);
      montoTotalDevolucion += montoProducto;
      
      productosValidados.push({
        detalle_id: prod.detalle_id,
        zapato_id: detalle.id_zapato,
        talla_id: detalle.id_talla,
        cantidad: prod.cantidad,
        codigo: detalle.codigo,
        nombre: detalle.nombre,
        precio_unitario: detalle.precio_unitario,
        monto: montoProducto
      });
    }
    
    // Insertar la devolución
    const devolucionResult = await client.query(
      `INSERT INTO Devoluciones (id_pedido, motivo, id_metodo_devolucion, monto, fecha) 
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) 
       RETURNING id, fecha`,
      [id_pedido, motivo, id_metodo_devolucion, montoTotalDevolucion]
    );
    
    const devolucionId = devolucionResult.rows[0].id;
    const fechaDevolucion = devolucionResult.rows[0].fecha;
    
    // Actualizar stock de los productos devueltos
    for (const prod of productosValidados) {
      // Actualizar Zapatos_Tallas (stock por talla)
      await client.query(
        `UPDATE Zapatos_Tallas 
         SET stock = stock + $1 
         WHERE id_zapato = $2 AND id_talla = $3`,
        [prod.cantidad, prod.zapato_id, prod.talla_id]
      );
      
      // Actualizar Inventarios (cantidad general)
      await client.query(
        `UPDATE Inventarios 
         SET cantidad = cantidad + $1 
         WHERE id_zapatos = $2`,
        [prod.cantidad, prod.zapato_id]
      );
    }
    
    // Registrar en historial de estados
    const observacionCompleta = `Devolución registrada: ${motivo}${observaciones_adicionales ? '. ' + observaciones_adicionales : ''}. Productos devueltos: ${productosValidados.length}`;
    
    await client.query(
      `INSERT INTO Estados_Pedido_Historico (id_pedido, id_estado_pedido, id_usuario, fecha_actualizacion, observacion) 
       VALUES ($1, (SELECT id FROM Estados_Pedidos WHERE estado = 'Despachado'), $2, CURRENT_TIMESTAMP, $3)`,
      [id_pedido, req.user?.id || 1, observacionCompleta]
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
        monto_devuelto: parseFloat(montoTotalDevolucion),
        metodo_devolucion: metodoResult.rows[0].metodo,
        fecha: fechaDevolucion,
        productos_devueltos: productosValidados.map(p => ({
          codigo: p.codigo,
          nombre: p.nombre,
          cantidad: p.cantidad,
          monto: p.monto
        }))
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

// ENDPOINT: Obtener historial de devoluciones con detalle de productos
router.get('/', auth, apiLimiter, async (req, res) => {
  try {
    const query = `
      SELECT 
        d.id as devolucion_id,
        d.fecha as fecha,
        d.motivo as motivo,
        d.monto as monto_total,
        p.id as pedido_id,
        CONCAT(c.nombre, ' ', c.apellido) as cliente_nombre,
        c.empresa as cliente_empresa,
        STRING_AGG(DISTINCT t.telefono, ', ') as cliente_telefono,
        md.metodo as metodo_devolucion,
        z.codigo,
        z.nombre as zapato_nombre,
        t2.talla_eu,
        dp.cantidad as unidades,
        dp.precio_unitario
      FROM Devoluciones d
      INNER JOIN Pedidos p ON d.id_pedido = p.id
      INNER JOIN Clientes c ON p.id_cliente = c.id
      LEFT JOIN Cliente_Telefonos ct ON c.id = ct.id_cliente
      LEFT JOIN Telefonos t ON ct.id_telefono = t.id
      INNER JOIN Metodos_Devolucion md ON d.id_metodo_devolucion = md.id
      INNER JOIN Detalle_Pedidos dp ON p.id = dp.id_pedido
      INNER JOIN Zapatos z ON dp.id_zapato = z.id
      LEFT JOIN Tallas t2 ON dp.id_talla = t2.id
      GROUP BY d.id, d.fecha, d.motivo, d.monto, p.id, c.nombre, c.apellido, 
               c.empresa, md.metodo, z.codigo, z.nombre, t2.talla_eu, 
               dp.cantidad, dp.precio_unitario
      ORDER BY d.fecha DESC
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

// ENDPOINT: Actualizar una devolución
router.put('/:id', auth, apiLimiter, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { motivo, id_metodo_devolucion, monto } = req.body;
    
    const devolucionExistente = await client.query(
      'SELECT * FROM Devoluciones WHERE id = $1',
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
      camposActualizar.push(`motivo = $${contador}`);
      valores.push(motivo);
      contador++;
    }
    
    if (id_metodo_devolucion) {
      camposActualizar.push(`id_metodo_devolucion = $${contador}`);
      valores.push(id_metodo_devolucion);
      contador++;
    }
    
    if (monto !== undefined) {
      camposActualizar.push(`monto = $${contador}`);
      valores.push(monto);
      contador++;
    }
    
    if (camposActualizar.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No se proporcionaron campos para actualizar' });
    }
    
    valores.push(id);
    const query = `UPDATE Devoluciones SET ${camposActualizar.join(', ')} WHERE id = $${contador} RETURNING *`;
    
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

// ENDPOINT: Eliminar una devolución
router.delete('/:id', auth, apiLimiter, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    
    const devolucionExistente = await client.query(
      'SELECT * FROM Devoluciones WHERE id = $1',
      [id]
    );
    
    if (devolucionExistente.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Devolución no encontrada' });
    }
    
    await client.query('DELETE FROM Devoluciones WHERE id = $1', [id]);
    
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

module.exports = router;