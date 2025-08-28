const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const SocketService = require('../services/socketService');

const { checkRole, roles } = require('../middleware/roles');

// Configuración de la conexión a PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER || 'admin',
  host: process.env.DB_HOST || 'postgres',
  database: process.env.DB_NAME || 'mydb',
  password: process.env.DB_PASSWORD || 'secret',
  port: process.env.DB_PORT || 5432,
});

// Middleware para obtener el servicio socket
router.use((req, res, next) => {
  const io = req.app.get('socketio');
  req.socketService = new SocketService(io);
  next();
});

// **RUTA GET: Obtener inventario completo con todos los detalles**
router.get('/', checkRole([...roles.admin, ...roles.secretaria, ...roles.vendedor, ...roles.inventario]), async (req, res) => {
  try {
    const query = `
      SELECT 
        z.id,
        z.codigo,
        z.nombre,
        z.precio_par,
        z.id_tipo_de_zapato,
        tdc.tipo as tipo_zapato,
        -- Información agregada de inventario general
        i.cantidad as inventario_general,
        ei.estado as estado_inventario,
        i.fecha_de_ingreso,
        -- Tipo de línea de producto
        tlp.id as id_tipo_linea_producto,
        tlp.nombre as tipo_linea_producto,
        -- Tallas con stock detallado
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'talla_id', t.id,
            'talla_eu', t.talla_eu,
            'talla_us', t.talla_us,
            'stock', COALESCE(zt.stock, 0),
            'zapato_talla_id', zt.id
          ) ORDER BY t.talla_eu
        ) FILTER (WHERE t.id IS NOT NULL) as tallas_disponibles,
        -- Stock total sumando todas las tallas
        COALESCE(SUM(zt.stock), 0) as stock_total_tallas,
        -- Conteo de tallas disponibles (con stock > 0)
        COUNT(CASE WHEN zt.stock > 0 THEN 1 END) as tallas_con_stock
      FROM Zapatos z
      LEFT JOIN Tipos_De_Calzados tdc ON z.id_tipo_de_zapato = tdc.id
      LEFT JOIN Zapatos_Tallas zt ON z.id = zt.id_zapato
      LEFT JOIN Tallas t ON zt.id_talla = t.id
      LEFT JOIN Inventarios i ON z.id = i.id_zapatos
      LEFT JOIN Estados_Inventario ei ON i.id_estado_inventario = ei.id
      LEFT JOIN Tipos_Linea_Producto tlp ON i.id_tipo_linea_producto = tlp.id
      GROUP BY z.id, z.codigo, z.nombre, z.precio_par, z.id_tipo_de_zapato, 
               tdc.tipo, i.cantidad, ei.estado, i.fecha_de_ingreso,
               tlp.id, tlp.nombre
      ORDER BY z.codigo, z.nombre
    `;
    
    const result = await pool.query(query);
    
    const inventario = result.rows.map(row => ({
      id: row.id,
      codigo: row.codigo,
      nombre: row.nombre,
      precio_par: parseFloat(row.precio_par || 0),
      tipo_zapato: {
        id: row.id_tipo_de_zapato,
        nombre: row.tipo_zapato
      },
      tipo_linea_producto: {
        id: row.id_tipo_linea_producto,
        nombre: row.tipo_linea_producto
      },
      inventario_general: {
        cantidad: row.inventario_general || 0,
        estado: row.estado_inventario || 'Sin registrar',
        fecha_ingreso: row.fecha_de_ingreso
      },
      tallas_disponibles: row.tallas_disponibles || [],
      resumen_stock: {
        stock_total: parseInt(row.stock_total_tallas || 0),
        tallas_con_stock: parseInt(row.tallas_con_stock || 0),
        tallas_agotadas: (row.tallas_disponibles?.length || 0) - parseInt(row.tallas_con_stock || 0)
      }
    }));
    
    res.json({
      success: true,
      data: inventario,
      total_productos: inventario.length,
      message: 'Inventario obtenido correctamente'
    });
  } catch (error) {
    console.error('Error al obtener inventario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener inventario'
    });
  }
});

// **RUTA GET: Obtener tipos de línea de producto**
router.get('/tipos-linea-producto', checkRole([...roles.admin, ...roles.secretaria, ...roles.vendedor, ...roles.inventario]), async (req, res) => {
  try {
    const query = `
      SELECT id, nombre, descripcion, activo, fecha_creacion
      FROM Tipos_Linea_Producto
      WHERE activo = true
      ORDER BY nombre
    `;
    
    const result = await pool.query(query);
    
    res.json({
      success: true,
      data: result.rows,
      message: 'Tipos de línea de producto obtenidos correctamente'
    });
  } catch (error) {
    console.error('Error al obtener tipos de línea de producto:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener tipos de línea de producto'
    });
  }
});

// **RUTA POST: Agregar nuevo zapato**
router.post('/', checkRole([...roles.admin, ...roles.secretaria]), async (req, res) => {
  try {
    const zapatoData = req.body;
    const newZapato = await addZapatoToDB(zapatoData);
    req.socketService.emitNewProduct(newZapato);

    res.json({
      success: true,
      data: newZapato,
      message: 'Zapato agregado correctamente'
    });
  } catch (error) {
    console.error('Error agregando zapato:', error);
    res.status(500).json({
      success: false,
      message: 'Error al agregar zapato'
    });
  }
});

// **RUTA PUT: Actualizar zapato**
router.put('/:id', checkRole([...roles.admin, ...roles.secretaria]), async (req, res) => {
  try {
    const zapatoId = req.params.id;
    const updateData = req.body;
    
    const updatedZapato = await updateZapatoInDB(zapatoId, updateData);
    req.socketService.emitInventoryUpdate(updatedZapato);

    res.json({
      success: true,
      data: updatedZapato,
      message: 'Zapato actualizado correctamente'
    });
  } catch (error) {
    console.error('Error actualizando zapato:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar zapato'
    });
  }
});

// **RUTA DELETE: Desactivar producto (marcar como no disponible)**
router.delete('/:id', checkRole([...roles.admin, ...roles.secretaria]), async (req, res) => {
  try {
    const zapatoId = req.params.id;
    await deactivateProduct(zapatoId);
    
    req.socketService.emitProductDeactivation(zapatoId);

    res.json({
      success: true,
      message: 'Producto marcado como no disponible correctamente'
    });
  } catch (error) {
    console.error('Error desactivando producto:', error);
    res.status(500).json({
      success: false,
      message: 'Error al desactivar producto'
    });
  }
});

// **FUNCIONES AUXILIARES**

// Agregar nuevo zapato
async function addZapatoToDB(zapatoData) {
  const { codigo, nombre, id_tipo_de_zapato, precio_par, id_tipo_linea_producto, estado, tallas } = zapatoData;

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Insertar el zapato
    const zapatoQuery = `
      INSERT INTO Zapatos (codigo, nombre, id_tipo_de_zapato, precio_par)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const zapatoValues = [codigo, nombre, id_tipo_de_zapato, precio_par || 0.00];
    const zapatoResult = await client.query(zapatoQuery, zapatoValues);
    const newZapato = zapatoResult.rows[0];

    // Insertar en inventario
    const estadoInventarioId = await getEstadoInventarioId(estado || 'Disponible');
    
    const inventarioQuery = `
      INSERT INTO Inventarios (cantidad, id_zapatos, id_usuarios, id_estado_inventario, id_tipo_linea_producto)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const inventarioValues = [0, newZapato.id, 1, estadoInventarioId, id_tipo_linea_producto];
    await client.query(inventarioQuery, inventarioValues);

    // Insertar tallas si existen
    if (tallas && tallas.length > 0) {
      for (const talla of tallas) {
        const tallaQuery = `
          INSERT INTO Zapatos_Tallas (id_zapato, id_talla, stock)
          VALUES ($1, $2, $3)
        `;
        await client.query(tallaQuery, [newZapato.id, talla.id_talla, talla.stock || 0]);
      }
    }

    await client.query('COMMIT');
    return newZapato;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Actualizar zapato
async function updateZapatoInDB(zapatoId, updateData) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Actualizar datos del zapato
    const zapatoFields = [];
    const zapatoValues = [];
    let idx = 1;

    for (const key in updateData) {
      if (['codigo', 'nombre', 'id_tipo_de_zapato', 'precio_par'].includes(key)) {
        zapatoFields.push(`${key} = $${idx}`);
        zapatoValues.push(updateData[key]);
        idx++;
      }
    }

    if (zapatoFields.length > 0) {
      zapatoValues.push(zapatoId);
      const zapatoQuery = `UPDATE Zapatos SET ${zapatoFields.join(', ')} WHERE id = $${idx} RETURNING *`;
      await client.query(zapatoQuery, zapatoValues);
    }

    // Actualizar inventario (tipo de línea y estado)
    if (updateData.id_tipo_linea_producto || updateData.estado) {
      const inventarioFields = [];
      const inventarioValues = [];
      let invIdx = 1;

      if (updateData.id_tipo_linea_producto) {
        inventarioFields.push(`id_tipo_linea_producto = $${invIdx}`);
        inventarioValues.push(updateData.id_tipo_linea_producto);
        invIdx++;
      }

      if (updateData.estado) {
        const estadoId = await getEstadoInventarioId(updateData.estado);
        inventarioFields.push(`id_estado_inventario = $${invIdx}`);
        inventarioValues.push(estadoId);
        invIdx++;
      }

      if (inventarioFields.length > 0) {
        inventarioValues.push(zapatoId);
        const inventarioQuery = `UPDATE Inventarios SET ${inventarioFields.join(', ')} WHERE id_zapatos = $${invIdx}`;
        await client.query(inventarioQuery, inventarioValues);
      }
    }

    // Actualizar tallas si se proporcionan
    if (updateData.tallas && updateData.tallas.length > 0) {
      for (const talla of updateData.tallas) {
        const tallaQuery = `
          INSERT INTO Zapatos_Tallas (id_zapato, id_talla, stock)
          VALUES ($1, $2, $3)
          ON CONFLICT (id_zapato, id_talla) 
          DO UPDATE SET stock = $3
        `;
        await client.query(tallaQuery, [zapatoId, talla.id_talla, talla.stock || 0]);
      }
    }

    await client.query('COMMIT');
    
    // Obtener el zapato actualizado
    const result = await pool.query(`
      SELECT z.*, tlp.nombre as tipo_linea_producto, ei.estado as estado_inventario
      FROM Zapatos z
      LEFT JOIN Inventarios i ON z.id = i.id_zapatos
      LEFT JOIN Tipos_Linea_Producto tlp ON i.id_tipo_linea_producto = tlp.id
      LEFT JOIN Estados_Inventario ei ON i.id_estado_inventario = ei.id
      WHERE z.id = $1
    `, [zapatoId]);
    
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Desactivar producto (marcar como no disponible)
async function deactivateProduct(zapatoId) {
  const noDisponibleId = await getEstadoInventarioId('No Disponible');
  
  const query = `
    UPDATE Inventarios 
    SET id_estado_inventario = $1
    WHERE id_zapatos = $2
  `;
  
  await pool.query(query, [noDisponibleId, zapatoId]);
}

// Obtener ID del estado de inventario
async function getEstadoInventarioId(estado) {
  const res = await pool.query('SELECT id FROM Estados_Inventario WHERE estado = $1', [estado]);
  return res.rows[0]?.id;
}

module.exports = router;