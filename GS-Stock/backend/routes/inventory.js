const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const SocketService = require('../services/socketService');

const { checkRole, roles } = require('../middleware/roles');

// Configuración de la conexión a PostgreSQL con variables de entorno
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
        -- Información agregada de inventario general si existe
        i.cantidad as inventario_general,
        i.estado as estado_inventario,
        i.fecha_de_ingreso,
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
      GROUP BY z.id, z.codigo, z.nombre, z.precio_par, z.id_tipo_de_zapato, 
               tdc.tipo, i.cantidad, i.estado, i.fecha_de_ingreso
      ORDER BY z.codigo, z.nombre
    `;
    
    const result = await pool.query(query);
    
    // Procesar los resultados para mejor estructura
    const inventario = result.rows.map(row => ({
      id: row.id,
      codigo: row.codigo,
      nombre: row.nombre,
      precio_par: parseFloat(row.precio_par || 0),
      tipo_zapato: {
        id: row.id_tipo_de_zapato,
        nombre: row.tipo_zapato
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

// Ruta para actualizar inventario
router.put('/update/:id', async (req, res) => {
  try {
    const zapataId = req.params.id;
    const updateData = req.body;

    // Si se está actualizando stock de una talla específica
    if (updateData.talla_id && updateData.stock !== undefined) {
      const stockAnterior = await getZapatoTallaStock(zapataId, updateData.talla_id);
      
      // Actualizar stock de talla específica
      const updatedZapatoTalla = await updateZapatoTallaStock(zapataId, updateData.talla_id, updateData.stock);
      
      req.socketService.emitInventoryUpdate(updatedZapatoTalla);
      req.socketService.emitStockUpdate(zapataId, updateData.stock, stockAnterior);

      // Verificar stock bajo
      if (updateData.stock <= 5) {
        const zapato = await getZapatoById(zapataId);
        req.socketService.emitLowStockAlert({
          ...zapato,
          talla_id: updateData.talla_id,
          stock: updateData.stock
        });
      }

      res.json({
        success: true,
        data: updatedZapatoTalla,
        message: 'Stock de talla actualizado correctamente'
      });
    } else {
      // Actualizar datos generales del zapato
      const updatedZapato = await updateZapatoInDB(zapataId, updateData);
      req.socketService.emitInventoryUpdate(updatedZapato);

      res.json({
        success: true,
        data: updatedZapato,
        message: 'Zapato actualizado correctamente'
      });
    }
  } catch (error) {
    console.error('Error actualizando inventario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar inventario'
    });
  }
});

// Ruta para agregar nuevo zapato
router.post('/add', async (req, res) => {
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

// **FUNCIONES AUXILIARES**

// Obtener stock de una talla específica
async function getZapatoTallaStock(zapatoId, tallaId) {
  const res = await pool.query(
    'SELECT stock FROM Zapatos_Tallas WHERE id_zapato = $1 AND id_talla = $2', 
    [zapatoId, tallaId]
  );
  return res.rows[0]?.stock || 0;
}

// Actualizar stock de talla específica
async function updateZapatoTallaStock(zapatoId, tallaId, stock) {
  const query = `
    INSERT INTO Zapatos_Tallas (id_zapato, id_talla, stock) 
    VALUES ($1, $2, $3)
    ON CONFLICT (id_zapato, id_talla) 
    DO UPDATE SET stock = $3
    RETURNING *
  `;
  
  const res = await pool.query(query, [zapatoId, tallaId, stock]);
  return res.rows[0];
}

// Obtener zapato por ID
async function getZapatoById(zapatoId) {
  const res = await pool.query('SELECT * FROM Zapatos WHERE id = $1', [zapatoId]);
  return res.rows[0];
}

// Actualizar datos generales del zapato
async function updateZapatoInDB(zapatoId, updateData) {
  const fields = [];
  const values = [];
  let idx = 1;

  for (const key in updateData) {
    if (key !== 'talla_id' && key !== 'stock') { // Excluir campos de tallas
      fields.push(`${key} = $${idx}`);
      values.push(updateData[key]);
      idx++;
    }
  }

  values.push(zapatoId);
  const query = `UPDATE Zapatos SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
  
  const res = await pool.query(query, values);
  return res.rows[0];
}

// Agregar nuevo zapato
async function addZapatoToDB(zapatoData) {
  const { codigo, nombre, id_tipo_de_zapato, precio_par } = zapatoData;

  const query = `
    INSERT INTO Zapatos (codigo, nombre, id_tipo_de_zapato, precio_par)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;

  const values = [codigo, nombre, id_tipo_de_zapado, precio_par || 0.00];
  const res = await pool.query(query, values);
  return res.rows[0];
}

module.exports = router;