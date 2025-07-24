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

// Endpoint para obtener todas las ventas 
router.get('/ventas', auth, async (req, res) => { 
  try {
    const query = `
      SELECT 
        p.Id AS pedido_id,
        c.Nombre || ' ' || c.Apellido AS cliente,
        ep.Estado AS estado_pedido,
        u.Nombre || ' ' || u.Apellido AS vendedor,
        mp.Tipo AS metodo_pago,
        p.Fecha,
        p.Subtotal,
        p.Total,
        dp.Cantidad,
        z.Nombre AS zapato
      FROM Pedidos p
      JOIN Detalle_Pedidos dp ON p.Id = dp.Id_Pedido
      JOIN Clientes c ON p.Id_Cliente = c.Id
      JOIN Estados_Pedidos ep ON p.Id_Estado_Pedido = ep.Id
      JOIN Vendedores v ON p.Id_Vendedor = v.Id
      JOIN Usuarios u ON v.Id_Usuarios = u.Id
      JOIN Metodos_De_Pago mp ON p.Id_Metodo_De_Pago = mp.Id
      JOIN Zapatos z ON dp.Id_Zapato = z.Id
      ORDER BY p.Fecha DESC
    `;
    
    const result = await pool.query(query);
    
    if (result.rows.length === 0) {
      return res.status(200).json({ 
        message: 'No hay ventas registradas', 
        data: [] 
      });
    }
    
    // Agrupar los detalles por pedido
    const ventasAgrupadas = {};
    result.rows.forEach(row => {
      if (!ventasAgrupadas[row.pedido_id]) {
        ventasAgrupadas[row.pedido_id] = {
          pedido_id: row.pedido_id,
          cliente: row.cliente,
          estado_pedido: row.estado_pedido,
          vendedor: row.vendedor,
          metodo_pago: row.metodo_pago,
          fecha: row.fecha,
          subtotal: row.subtotal,
          total: row.total,
          productos: []
        };
      }
      ventasAgrupadas[row.pedido_id].productos.push({
        zapato: row.zapato,
        cantidad: row.cantidad
      });
    });
    
    res.status(200).json({
      message: 'Ventas obtenidas correctamente',
      count: Object.keys(ventasAgrupadas).length,
      data: Object.values(ventasAgrupadas)
    });
  } catch (err) {
    console.error('Error al obtener ventas:', err);
    res.status(500).json({ 
      error: 'Error al consultar la base de datos',
      details: err.message
    });
  }
});

// Endpoint para obtener una venta específica por ID de pedido 
router.get('/ventas/:id', auth, async (req, res) => { 
  try {
    const { id } = req.params;
    
    const query = `
      SELECT 
        p.Id AS pedido_id,
        c.Nombre || ' ' || c.Apellido AS cliente,
        ep.Estado AS estado_pedido,
        u.Nombre || ' ' || u.Apellido AS vendedor,
        mp.Tipo AS metodo_pago,
        p.Fecha,
        p.Subtotal,
        p.Total,
        dp.Cantidad,
        z.Nombre AS zapato
      FROM Pedidos p
      JOIN Detalle_Pedidos dp ON p.Id = dp.Id_Pedido
      JOIN Clientes c ON p.Id_Cliente = c.Id
      JOIN Estados_Pedidos ep ON p.Id_Estado_Pedido = ep.Id
      JOIN Vendedores v ON p.Id_Vendedor = v.Id
      JOIN Usuarios u ON v.Id_Usuarios = u.Id
      JOIN Metodos_De_Pago mp ON p.Id_Metodo_De_Pago = mp.Id
      JOIN Zapatos z ON dp.Id_Zapato = z.Id
      WHERE p.Id = $1
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }
    
    const venta = {
      pedido_id: result.rows[0].pedido_id,
      cliente: result.rows[0].cliente,
      estado_pedido: result.rows[0].estado_pedido,
      vendedor: result.rows[0].vendedor,
      metodo_pago: result.rows[0].metodo_pago,
      fecha: result.rows[0].fecha,
      subtotal: result.rows[0].subtotal,
      total: result.rows[0].total,
      productos: result.rows.map(row => ({
        zapato: row.zapato,
        cantidad: row.cantidad
      }))
    };
    
    res.status(200).json({
      message: 'Venta obtenida correctamente',
      data: venta
    });
  } catch (err) {
    console.error('Error al obtener venta:', err);
    res.status(500).json({ 
      error: 'Error en el servidor',
      details: err.message
    });
  }
});

// Endpoint para buscar cliente por empresa
router.get('/clientes/buscar-empresa/:empresa', auth, async (req, res) => {
  try {
    const { empresa } = req.params;
    
    const query = `
      SELECT Id, Nombre, Apellido, Empresa 
      FROM Clientes 
      WHERE LOWER(Empresa) LIKE LOWER($1)
      ORDER BY Empresa, Nombre
    `;
    
    const result = await pool.query(query, [`%${empresa}%`]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        message: 'No se encontraron clientes para esta empresa',
        data: [] 
      });
    }
    
    res.status(200).json({
      message: 'Clientes encontrados',
      data: result.rows
    });
  } catch (err) {
    console.error('Error al buscar clientes por empresa:', err);
    res.status(500).json({ 
      error: 'Error al buscar clientes',
      details: err.message
    });
  }
});

// Endpoint para crear nueva venta
router.post('/ventas', auth, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { 
      id_cliente, 
      empresa_cliente, 
      id_vendedor,
      id_metodo_pago,
      id_estado_pedido = 1, // Por defecto "en bodega" (ID 1)
      productos, 
      subtotal,
      total
    } = req.body;

    await client.query('BEGIN');

    let clienteId = id_cliente;
    if (empresa_cliente && !id_cliente) {
      const clienteQuery = `
        SELECT Id, Nombre, Apellido 
        FROM Clientes 
        WHERE LOWER(Empresa) = LOWER($1)
        LIMIT 1
      `;
      const clienteResult = await client.query(clienteQuery, [empresa_cliente]);
      
      if (clienteResult.rows.length === 0) {
        throw new Error(`No se encontró cliente para la empresa: ${empresa_cliente}`);
      }
      
      clienteId = clienteResult.rows[0].id;
    }

    const validaciones = await Promise.all([
      client.query('SELECT Id FROM Clientes WHERE Id = $1', [clienteId]),
      client.query('SELECT Id FROM Vendedores WHERE Id = $1', [id_vendedor]),
      client.query('SELECT Id FROM Metodos_De_Pago WHERE Id = $1', [id_metodo_pago]),
      client.query('SELECT Id FROM Estados_Pedidos WHERE Id = $1', [id_estado_pedido])
    ]);

    if (validaciones[0].rows.length === 0) throw new Error('Cliente no encontrado');
    if (validaciones[1].rows.length === 0) throw new Error('Vendedor no encontrado');
    if (validaciones[2].rows.length === 0) throw new Error('Método de pago no encontrado');
    if (validaciones[3].rows.length === 0) throw new Error('Estado de pedido no encontrado');

    const pedidoQuery = `
      INSERT INTO Pedidos (Id_Cliente, Id_Vendedor, Id_Metodo_De_Pago, Id_Estado_Pedido, Subtotal, Total)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING Id
    `;
    
    const pedidoResult = await client.query(pedidoQuery, [
      clienteId, id_vendedor, id_metodo_pago, id_estado_pedido, subtotal, total
    ]);
    
    const pedidoId = pedidoResult.rows[0].id;

    for (const producto of productos) {
      const zapatoQuery = await client.query('SELECT Id FROM Zapatos WHERE Id = $1', [producto.id_zapato]);
      if (zapatoQuery.rows.length === 0) {
        throw new Error(`Zapato con ID ${producto.id_zapato} no encontrado`);
      }

      await client.query(`
        INSERT INTO Detalle_Pedidos (Id_Pedido, Id_Zapato, Cantidad)
        VALUES ($1, $2, $3)
      `, [pedidoId, producto.id_zapato, producto.cantidad]);

      let cantidadRestante = producto.cantidad;

      // Verificar stock disponible en inventarios
      const inventarios = await client.query(`
        SELECT Id, Cantidad FROM Inventarios
        WHERE Id_Zapatos = $1 AND Cantidad > 0 AND UPPER(Estado) = 'DISPONIBLE'
        ORDER BY Fecha_De_Ingreso ASC
      `, [producto.id_zapato]);

      if (inventarios.rows.length === 0) {
        throw new Error(`No hay inventario disponible para el zapato ID ${producto.id_zapato}`);
      }

      // Calcular stock total disponible
      const stockTotal = inventarios.rows.reduce((sum, inv) => sum + parseInt(inv.cantidad), 0);
      
      if (stockTotal < cantidadRestante) {
        throw new Error(`Stock insuficiente para el zapato ID ${producto.id_zapato}. Disponible: ${stockTotal}, Requerido: ${cantidadRestante}`);
      }

      // Restar del inventario usando FIFO
      for (const inv of inventarios.rows) {
        if (cantidadRestante <= 0) break;

        const restar = Math.min(cantidadRestante, inv.cantidad);

        const nuevaCantidad = inv.cantidad - restar;
        
        await client.query(`
          UPDATE Inventarios
          SET Cantidad = $1
          WHERE Id = $2
        `, [nuevaCantidad, inv.id]);

        cantidadRestante -= restar;
      }

      if (cantidadRestante > 0) {
        throw new Error(`Error al actualizar inventario para el producto ID ${producto.id_zapato}`);
      }
    }

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Venta creada exitosamente',
      pedido_id: pedidoId
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al crear venta:', err);
    res.status(400).json({
      error: 'Error al crear la venta',
      details: err.message
    });
  } finally {
    client.release();
  }
});

router.get('/vendedores', auth, async (req, res) => {
  try {
    const query = `
      SELECT v.Id, u.Nombre, u.Apellido 
      FROM Vendedores v
      JOIN Usuarios u ON v.Id_Usuarios = u.Id
      ORDER BY u.Nombre, u.Apellido
    `;
    
    const result = await pool.query(query);
    res.status(200).json({
      message: 'Vendedores obtenidos correctamente',
      data: result.rows
    });
  } catch (err) {
    console.error('Error al obtener vendedores:', err);
    res.status(500).json({ 
      error: 'Error al consultar la base de datos',
      details: err.message
    });
  }
});

router.get('/metodos-pago', auth, async (req, res) => {
  try {
    const query = 'SELECT Id, Tipo FROM Metodos_De_Pago ORDER BY Tipo';
    const result = await pool.query(query);
    res.status(200).json({
      message: 'Métodos de pago obtenidos correctamente',
      data: result.rows
    });
  } catch (err) {
    console.error('Error al obtener métodos de pago:', err);
    res.status(500).json({ 
      error: 'Error al consultar la base de datos',
      details: err.message
    });
  }
});

// Endpoint para actualizar estado de pedido
router.put('/ventas/:id/estado', auth, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    const { estado } = req.body;

    // Validar que el estado exista
    const estadoQuery = await client.query(
      'SELECT Id FROM Estados_Pedidos WHERE Estado = $1', 
      [estado]
    );
    
    if (estadoQuery.rows.length === 0) {
      return res.status(400).json({ error: 'Estado de pedido no válido' });
    }

    // Actualizar el estado
    const updateQuery = `
      UPDATE Pedidos
      SET Id_Estado_Pedido = $1
      WHERE Id = $2
      RETURNING *
    `;
    
    const result = await client.query(updateQuery, [estadoQuery.rows[0].id, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }
    
    res.status(200).json({
      message: 'Estado de pedido actualizado correctamente',
      data: result.rows[0]
    });
    
  } catch (err) {
    console.error('Error al actualizar estado de pedido:', err);
    res.status(500).json({ 
      error: 'Error al actualizar estado de pedido',
      details: err.message
    });
  } finally {
    client.release();
  }
});

// Nuevo endpoint para obtener estados de pedidos
router.get('/estados-pedidos', auth, async (req, res) => {
  try {
    const query = 'SELECT Id, Estado FROM Estados_Pedidos ORDER BY Id';
    const result = await pool.query(query);
    res.status(200).json({
      message: 'Estados de pedidos obtenidos correctamente',
      data: result.rows
    });
  } catch (err) {
    console.error('Error al obtener estados de pedidos:', err);
    res.status(500).json({ 
      error: 'Error al consultar la base de datos',
      details: err.message
    });
  }
});

router.post('/inventario/verificar-stock', auth, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { productos } = req.body;
    
    await client.query('BEGIN');
    
    for (const producto of productos) {
      // Verificar stock en inventarios con estado disponible
      const inventarioQuery = `
        SELECT SUM(Cantidad) as stock_inventario
        FROM Inventarios
        WHERE Id_Zapatos = $1 AND UPPER(Estado) = 'DISPONIBLE'
      `;
      
      const inventarioResult = await client.query(inventarioQuery, [producto.id_zapato]);
      const stockInventario = parseInt(inventarioResult.rows[0].stock_inventario) || 0;
      
      console.log(`Zapato ID ${producto.id_zapato}: Stock disponible=${stockInventario}, Requerido=${producto.cantidad}`);
      
      if (stockInventario < producto.cantidad) {
        throw new Error(`Stock insuficiente para el zapato ID ${producto.id_zapato}. Disponible: ${stockInventario}, Requerido: ${producto.cantidad}`);
      }
    }
    
    await client.query('COMMIT');
    res.status(200).json({ message: 'Stock disponible para todos los productos' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al verificar stock:', err);
    res.status(400).json({ 
      error: 'Error al verificar stock',
      details: err.message
    });
  } finally {
    client.release();
  }
});

module.exports = router;