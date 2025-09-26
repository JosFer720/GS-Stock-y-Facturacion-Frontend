const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const auth = require('../middleware/auth'); 

// Configuración de la conexión a postgres
const pool = new Pool({
  user: process.env.DB_USER || 'admin',
  host: process.env.DB_HOST || 'postgres',
  database: process.env.DB_NAME || 'mydb',
  password: process.env.DB_PASSWORD || 'secret',
  port: process.env.DB_PORT || 5432,
});

// ENDPOINT: Obtener métodos de pago
router.get('/metodos-pago', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM Metodos_De_Pago ORDER BY tipo');
    res.json({
      success: true,
      data: result.rows,
      message: 'Métodos de pago obtenidos correctamente'
    });
  } catch (error) {
    console.error('Error al obtener métodos de pago:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error al obtener métodos de pago' 
    });
  }
});

// ENDPOINT: Obtener tipos de línea de producto
router.get('/tipos-linea-producto', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM Tipos_Linea_Producto ORDER BY nombre');
    res.json({
      success: true,
      data: result.rows,
      message: 'Tipos de línea de producto obtenidos correctamente'
    });
  } catch (error) {
    console.error('Error al obtener tipos de línea:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error al obtener tipos de línea de producto' 
    });
  }
});

router.post('/pedidos', auth, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { 
      id_cliente, 
      id_tipo_linea_producto,
      productos
    } = req.body;

    // Obtener vendedor automáticamente según usuario logueado
    const vendedorResult = await client.query(`
      SELECT u.id as vendedor_id, u.nombre, u.apellido, r.rol 
      FROM Usuarios u
      JOIN Roles r ON u.id_roles = r.id
      WHERE u.id = $1 AND r.rol IN ('Vendedor','Administrador')
    `, [req.user.id]);

    if (vendedorResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        error: 'El usuario actual no tiene permisos de vendedor o administrador'
      });
    }

    const id_vendedor = vendedorResult.rows[0].vendedor_id;

    // Validaciones básicas
    if (!id_cliente || !id_tipo_linea_producto || !productos || productos.length === 0) {
      return res.status(400).json({ 
        error: 'Faltan campos requeridos: id_cliente, id_tipo_linea_producto, productos' 
      });
    }

    await client.query('BEGIN');

    const stockValidation = [];
    for (const producto of productos) {
      const stockResult = await client.query(`
        SELECT zt.stock, z.nombre, t.talla_eu 
        FROM Zapatos_Tallas zt
        JOIN Zapatos z ON zt.id_zapato = z.id
        JOIN Tallas t ON zt.id_talla = t.id
        WHERE zt.id_zapato = $1 AND zt.id_talla = $2
      `, [producto.id_zapato, producto.id_talla]);

      if (stockResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          error: `No se encontró la talla especificada para el zapato ID ${producto.id_zapato}` 
        });
      }

      const stockDisponible = stockResult.rows[0].stock;
      const nombreZapato = stockResult.rows[0].nombre;
      const talla = stockResult.rows[0].talla_eu;

      if (stockDisponible < producto.cantidad) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          error: `Stock insuficiente para ${nombreZapato} talla EU ${talla}. Disponible: ${stockDisponible}, Solicitado: ${producto.cantidad}`,
          codigo_error: 'STOCK_INSUFICIENTE',
          detalles: {
            zapato: nombreZapato,
            talla_eu: talla,
            stock_disponible: stockDisponible,
            cantidad_solicitada: producto.cantidad
          }
        });
      }

      stockValidation.push({
        id_zapato: producto.id_zapato,
        id_talla: producto.id_talla,
        stock_actual: stockDisponible,
        cantidad_solicitada: producto.cantidad,
        stock_restante: stockDisponible - producto.cantidad
      });
    }

    // Calcular subtotal y total
    let subtotal = 0;
    for (const producto of productos) {
      subtotal += producto.cantidad * producto.precio_unitario;
    }

    // Obtener descuento del tipo de cliente
    const { rows } = await client.query(`
      SELECT COALESCE(tc.descuento, 0.0) AS descuento
      FROM clientes c
      LEFT JOIN tipos_de_cliente tc ON tc.id = c.id_tipo_cliente
      WHERE c.id = $1
    `, [id_cliente]);

    const descuento = Number(rows?.[0]?.descuento ?? 0.0);
    const montoDescuento = subtotal * descuento;
    const total = subtotal - montoDescuento;

    // CORREGIDO: Crear el pedido con id_pedido_estado_pago = 1 por defecto
    const pedidoResult = await client.query(`
      INSERT INTO Pedidos (
        id_cliente, 
        id_vendedor, 
        id_tipo_linea_producto, 
        subtotal, 
        total, 
        id_estado_pedido, 
        id_pedido_estado_pago
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [id_cliente, id_vendedor, id_tipo_linea_producto, subtotal, total, 1, 1]);

    const pedidoId = pedidoResult.rows[0].id;

    const tipoLinea = await obtenerTipoLineaProducto(id_tipo_linea_producto);
    let envioCreado = null;

    // Insertar detalles del pedido y actualizar stock
    const detallesInsertados = [];
    for (let i = 0; i < productos.length; i++) {
      const producto = productos[i];
      const validacion = stockValidation[i];

      // Insertar detalle del pedido
      const precioUnitarioNum = Number(producto.precio_unitario);
      const precioForDb = Number.isFinite(precioUnitarioNum) ? precioUnitarioNum : null;

      const detalleResult = await client.query(`
        INSERT INTO Detalle_Pedidos (cantidad, id_zapato, id_pedido, id_talla, precio_unitario)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [producto.cantidad, producto.id_zapato, pedidoId, producto.id_talla, precioForDb]);

      // Descontar del inventario (stock por talla)
      await client.query(`
        UPDATE Zapatos_Tallas 
        SET stock = stock - $1 
        WHERE id_zapato = $2 AND id_talla = $3
      `, [producto.cantidad, producto.id_zapato, producto.id_talla]);

      // Actualizar inventario general
      await client.query(`
        UPDATE Inventarios 
        SET cantidad = cantidad - $1,
            fecha_de_ingreso = CURRENT_TIMESTAMP,
            id_usuarios = $2
        WHERE id_zapatos = $3
      `, [producto.cantidad, req.user?.id || 1, producto.id_zapato]);

      detallesInsertados.push({
        detalle: detalleResult.rows[0],
        stock_actualizado: validacion.stock_restante
      });
    }

    // Crear registro en histórico de estados
    await client.query(`
      INSERT INTO Estados_Pedido_Historico (id_pedido, id_estado_pedido, id_usuario, observacion)
      VALUES ($1, 1, $2, 'Pedido creado')
    `, [pedidoId, req.user?.id || 1]);

    await client.query('COMMIT');

    res.status(201).json({
      mensaje: 'Pedido creado exitosamente',
      data: {
        pedido: pedidoResult.rows[0],
        envio: envioCreado,
        vendedor: {
          id: id_vendedor,
          nombre: vendedorResult.rows[0].nombre + ' ' + vendedorResult.rows[0].apellido
        },
        detalles: detallesInsertados,
        resumen: {
          subtotal: parseFloat(subtotal),
          descuento_aplicado: parseFloat(montoDescuento),
          total: parseFloat(total),
          productos_vendidos: productos.length,
          tipo_linea: tipoLinea.nombre
        }
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al crear pedido:', error);
    res.status(500).json({ 
      error: 'Error al procesar el pedido',
      details: error.message 
    });
  } finally {
    client.release();
  }
});

router.get('/pedidos', auth, async (req, res) => {
  try {
    const userRole = req.user?.rol;
    const userId = req.user?.id;

    const limitParam = Math.min(Number(req.query.limit) || 10, 100);
    const pageParam = Math.max(Number(req.query.page) || 1, 1);
    const offsetParam = (pageParam - 1) * limitParam;

    // Query actualizada para incluir el estado de pago
    let query = `
      SELECT 
        p.*,
        c.nombre || ' ' || c.apellido as cliente_nombre,
        c.empresa,
        u.nombre || ' ' || u.apellido as vendedor_nombre,
        ep.estado as estado_pedido,
        tlp.nombre as tipo_linea_producto,
        pep.estado as estado_pago
      FROM Pedidos p
      LEFT JOIN Clientes c ON p.id_cliente = c.id
      LEFT JOIN Usuarios u ON p.id_vendedor = u.id
      LEFT JOIN Estados_Pedidos ep ON p.id_estado_pedido = ep.id
      LEFT JOIN Tipos_Linea_Producto tlp ON p.id_tipo_linea_producto = tlp.id
      LEFT JOIN pedidos_estado_pago pep ON p.id_pedido_estado_pago = pep.id
    `;

    let params = [];
    let countParams = [];
    let whereClause = '';

    if (userRole === 'Vendedor' && userId) {
      whereClause = ` WHERE p.id_vendedor = $1 `;
      params.push(userId);
      countParams.push(userId);
    }

    const countQuery = `SELECT COUNT(*) AS total FROM Pedidos p ${whereClause}`;
    const countResult = await pool.query(countQuery, countParams);
    const total = Number(countResult.rows[0].total || 0);

    if (whereClause) {
      query += whereClause + ` ORDER BY p.fecha DESC LIMIT $2 OFFSET $3 `;
      params.push(limitParam, offsetParam);
    } else {
      query += ` ORDER BY p.fecha DESC LIMIT $1 OFFSET $2 `;
      params = [limitParam, offsetParam];
    }

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      total,
      page: pageParam,
      perPage: limitParam,
      totalPages: Math.ceil(total / limitParam),
      message: 'Pedidos obtenidos correctamente'
    });
  } catch (error) {
    console.error('Error al obtener pedidos:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error al obtener pedidos' 
    });
  }
});

// ENDPOINT: Obtener información del vendedor actual
router.get('/vendedor-actual', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        u.id,
        u.nombre,
        u.apellido,
        r.rol,
        cu.usuario
      FROM Usuarios u
      JOIN Roles r ON u.id_roles = r.id
      LEFT JOIN Cuentas_Usuarios cu ON u.id = cu.id_usuarios
      WHERE u.id = $1
    `, [req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Usuario no encontrado' 
      });
    }

    const usuario = result.rows[0];

    res.json({
      success: true,
      data: {
        id: usuario.id,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        nombre_completo: `${usuario.nombre} ${usuario.apellido}`,
        rol: usuario.rol,
        es_vendedor: usuario.rol === 'Vendedor',
        es_administrador: usuario.rol === 'Administrador',
        usuario: usuario.usuario
      },
      message: 'Información del usuario obtenida correctamente'
    });

  } catch (error) {
    console.error('Error al obtener información del usuario:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error al obtener información del usuario' 
    });
  }
});

// Obtener vendedores 
router.get('/vendedores', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        u.id,
        u.nombre || ' ' || u.apellido as nombre_completo,
        r.rol
      FROM Usuarios u
      JOIN Roles r ON u.id_roles = r.id
      WHERE r.rol = 'Vendedor'
      ORDER BY nombre_completo
    `);
    
    res.json({
      success: true,
      data: result.rows,
      message: 'Vendedores obtenidos correctamente'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Error al obtener vendedores' 
    });
  }
});

// Obtener tipos de cliente
router.get('/tipos-cliente', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM Tipos_De_Cliente ORDER BY tipo');
    res.json({
      success: true,
      data: result.rows,
      message: 'Tipos de cliente obtenidos correctamente'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Error al obtener tipos de cliente' 
    });
  }
});

const formatClientResponse = (clientData) => {
  const clientMap = new Map();
  
  clientData.forEach(row => {
    if (!clientMap.has(row.id)) {
      clientMap.set(row.id, {
        id: row.id,
        nombre: row.nombre,
        apellido: row.apellido,
        empresa: row.empresa,
        direcciones: [],
        telefonos: []
      });
    }
    
    const client = clientMap.get(row.id);
    
    if (row.direccion_id && !client.direcciones.some(d => d.id === row.direccion_id)) {
      client.direcciones.push({
        id: row.direccion_id,
        direccion: row.direccion
      });
    }
    
    if (row.telefono_id && !client.telefonos.some(t => t.id === row.telefono_id)) {
      client.telefonos.push({
        id: row.telefono_id,
        telefono: row.telefono
      });
    }
  });
  
  return Array.from(clientMap.values());
};

async function getFullClientData(clientId) {
  const result = await pool.query(`
    SELECT 
      c.id,
      c.nombre,
      c.apellido,
      c.empresa,
      d.id as direccion_id,
      d.direccion,
      t.id as telefono_id,
      t.telefono
    FROM clientes c
    LEFT JOIN cliente_direcciones cd ON c.id = cd.id_cliente
    LEFT JOIN direcciones d ON cd.id_direccion = d.id
    LEFT JOIN cliente_telefonos ct ON c.id = ct.id_cliente
    LEFT JOIN telefonos t ON ct.id_telefono = t.id
    WHERE c.id = $1
  `, [clientId]);
  
  if (result.rows.length === 0) return null;
  
  const clienteData = {
    id: result.rows[0].id,
    nombre: result.rows[0].nombre,
    apellido: result.rows[0].apellido,
    empresa: result.rows[0].empresa,
    direcciones: [],
    telefonos: []
  };
  
  result.rows.forEach(row => {
    if (row.direccion_id && !clienteData.direcciones.some(d => d.id === row.direccion_id)) {
      clienteData.direcciones.push({
        id: row.direccion_id,
        direccion: row.direccion
      });
    }
    
    if (row.telefono_id && !clienteData.telefonos.some(t => t.id === row.telefono_id)) {
      clienteData.telefonos.push({
        id: row.telefono_id,
        telefono: row.telefono
      });
    }
  });
  
  return clienteData;
}

// Endpoint para obtener todos los clientes con sus direcciones y teléfonos 
router.get('/clientes', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        c.id,
        c.nombre,
        c.apellido,
        c.empresa,
        d.id as direccion_id,
        d.direccion,
        t.id as telefono_id,
        t.telefono
      FROM clientes c
      LEFT JOIN cliente_direcciones cd ON c.id = cd.id_cliente
      LEFT JOIN direcciones d ON cd.id_direccion = d.id
      LEFT JOIN cliente_telefonos ct ON c.id = ct.id_cliente
      LEFT JOIN telefonos t ON ct.id_telefono = t.id
      ORDER BY c.id
    `);
    
    const clients = formatClientResponse(result.rows);
    
    res.status(200).json({
      message: 'Clientes obtenidos correctamente',
      count: clients.length,
      data: clients
    });
  } catch (err) {
    console.error('Error al obtener clientes:', err);
    res.status(500).json({ 
      error: 'Error al consultar la base de datos',
      details: err.message
    });
  }
});

// Obtener estados de pedidos
router.get('/estados-pedidos', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM Estados_Pedidos ORDER BY id');
    res.json({
      success: true,
      data: result.rows,
      message: 'Estados de pedidos obtenidos correctamente'
    });
  } catch (error) {
    console.error('Error al obtener estados de pedidos:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error al obtener estados de pedidos',
      error: error.message
    });
  }
});

// Obtener productos de un pedido (detalles)
router.get('/pedidos/:id/productos', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT dp.id AS detalle_id, dp.id_zapato, dp.id_talla, dp.cantidad, dp.precio_unitario,
        z.codigo, z.nombre, z.precio_par,
        t.talla_eu, t.talla_us,
        tlp.nombre as tipo_linea_producto
       FROM Detalle_Pedidos dp
       JOIN Zapatos z ON dp.id_zapato = z.id
       LEFT JOIN Inventarios i ON z.id = i.id_zapatos
       LEFT JOIN Tipos_Linea_Producto tlp ON i.id_tipo_linea_producto = tlp.id
       LEFT JOIN Tallas t ON dp.id_talla = t.id
       WHERE dp.id_pedido = $1
       ORDER BY z.id, t.talla_eu`
    , [id]);

    const rows = result.rows || [];
    const productsMap = new Map();

    for (const row of rows) {
      const zapatoId = row.id_zapato;

      if (!productsMap.has(zapatoId)) {
        productsMap.set(zapatoId, {
          id: zapatoId,
          codigo: row.codigo,
          nombre: row.nombre,
          precio_par: row.precio_par || row.precio_unitario || 0,
          tipo_linea: row.tipo_linea_producto || null,
          tallas: [],
          subtotal: 0
        });
      }

      const prod = productsMap.get(zapatoId);

      const tallaObj = {
        id: row.id_talla,
        talla_eu: row.talla_eu,
        talla_us: row.talla_us,
        cantidad: row.cantidad
      };

      prod.tallas.push(tallaObj);
      prod.subtotal += (Number(row.precio_unitario || prod.precio_par || 0) * Number(row.cantidad || 0));
    }

    const productos = Array.from(productsMap.values());

    return res.json({ success: true, productos });
  } catch (error) {
    console.error('Error al obtener productos del pedido:', error);
    return res.status(500).json({ success: false, error: 'Error al obtener productos del pedido' });
  }
});

// Actualizar estado de un pedido
router.put('/pedidos/:id/estado', auth, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    const { estado } = req.body;
    
    if (!estado) {
      return res.status(400).json({ 
        error: 'El estado es requerido' 
      });
    }
    
    await client.query('BEGIN');
    
    // Obtener el ID del estado por nombre
    const estadoResult = await client.query(
      'SELECT id FROM Estados_Pedidos WHERE estado = $1',
      [estado]
    );
    
    if (estadoResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: 'Estado no válido' 
      });
    }
    
    const estadoId = estadoResult.rows[0].id;
    
    // Actualizar el pedido
    const updateResult = await client.query(
      'UPDATE Pedidos SET id_estado_pedido = $1 WHERE id = $2 RETURNING *',
      [estadoId, id]
    );
    
    if (updateResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ 
        error: 'Pedido no encontrado' 
      });
    }
    
    // Insertar en el histórico
    await client.query(`
      INSERT INTO Estados_Pedido_Historico (id_pedido, id_estado_pedido, id_usuario, observacion)
      VALUES ($1, $2, $3, $4)
    `, [id, estadoId, req.user?.id || 1, `Estado cambiado a ${estado}`]);
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: 'Estado actualizado correctamente',
      data: {
        pedido_id: id,
        nuevo_estado: estado,
        pedido: updateResult.rows[0]
      }
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al actualizar estado:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error al actualizar estado del pedido',
      details: error.message 
    });
  } finally {
    client.release();
  }
});

function generarNumeroEnvio(tipo = 'NAL') {
  const fecha = new Date();
  const year = fecha.getFullYear().toString().slice(-2);
  const month = (fecha.getMonth() + 1).toString().padStart(2, '0');
  const day = fecha.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  
  return `${tipo}${year}${month}${day}${random}`;
}

// Función auxiliar para obtener tipo de línea
async function obtenerTipoLineaProducto(id) {
  const result = await pool.query(
    'SELECT nombre FROM Tipos_Linea_Producto WHERE id = $1',
    [id]
  );
  
  if (result.rows.length === 0) {
    throw new Error('Tipo de línea de producto no encontrado');
  }
  
  return result.rows[0];
}

// Funciones para crear envíos
async function crearEnvioNacional(pedidoId, client) {
  try {
    const result = await client.query(`
      INSERT INTO envios (id_pedidos, transporte, id_estado_envio)
      VALUES ($1, 'Transporte Nacional', 1)
      RETURNING *
    `, [pedidoId]);
    
    return result.rows[0];
  } catch (error) {
    console.log('Shipping creation failed, continuing without shipping');
    return null; 
  }
}

async function crearEnvioImportadora(pedidoId, client) {
  try {
    const result = await client.query(`
      INSERT INTO envios (id_pedidos, transporte, id_estado_envio)
      VALUES ($1, 'Importación Internacional', 1)
      RETURNING *
    `, [pedidoId]);
    
    return result.rows[0];
  } catch (error) {
    console.log('Shipping creation failed, continuing without shipping');
    return null; 
  }
}

module.exports = router;