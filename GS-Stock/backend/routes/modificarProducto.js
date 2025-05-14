// routes/modificarProducto.js
const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const auth = require('../middleware/auth');

// Configuración de la conexión a PostgreSQL usando las variables del docker-compose
const pool = new Pool({
  user: process.env.DB_USER || 'admin',
  host: process.env.DB_HOST || 'postgres',
  database: process.env.DB_NAME || 'mydb',
  password: process.env.DB_PASSWORD || 'secret',
  port: process.env.DB_PORT || 5432,
});

// Endpoint para modificar un producto existente
router.put('/productos/:id', auth, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { codigo, nombre, id_tipo_de_zapato, tallas, estado } = req.body;
    
    // Validación de campos requeridos
    if (!codigo || !nombre || !id_tipo_de_zapato || !tallas || !estado) {
      return res.status(400).json({ 
        error: 'Se requieren los campos: codigo, nombre, id_tipo_de_zapato, tallas y estado' 
      });
    }
    
    // Validar que tallas sea un array
    if (!Array.isArray(tallas) || tallas.length === 0) {
      return res.status(400).json({ 
        error: 'Se requiere un array de tallas con su stock correspondiente' 
      });
    }
    
    // Verificar que cada talla tenga id_talla y stock
    const tallaValida = tallas.every(item => 
      item.id_talla && 
      typeof item.stock === 'number' && 
      item.stock >= 0
    );
    
    if (!tallaValida) {
      return res.status(400).json({ 
        error: 'Cada talla debe incluir id_talla y stock (número no negativo)' 
      });
    }
    
    // Verificar si el producto existe
    const productoExistente = await client.query(
      'SELECT id, codigo FROM Zapatos WHERE id = $1',
      [id]
    );
    
    if (productoExistente.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    
    // Verificar si el nuevo código ya existe (solo si se está cambiando)
    if (codigo !== productoExistente.rows[0].codigo) {
      const codigoExistente = await client.query(
        'SELECT id FROM Zapatos WHERE codigo = $1 AND id != $2',
        [codigo, id]
      );
      
      if (codigoExistente.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'El nuevo código ya está en uso por otro producto' });
      }
    }
    
    // Actualizar el zapato
    await client.query(
      'UPDATE Zapatos SET codigo = $1, nombre = $2, id_tipo_de_zapato = $3 WHERE id = $4',
      [codigo, nombre, id_tipo_de_zapato, id]
    );
    
    // Eliminar las tallas actuales para reemplazarlas
    await client.query(
      'DELETE FROM Zapatos_Tallas WHERE id_zapato = $1',
      [id]
    );
    
    // Insertar las nuevas tallas con su stock
    for (const tallaItem of tallas) {
      await client.query(
        'INSERT INTO Zapatos_Tallas (id_zapato, id_talla, stock) VALUES ($1, $2, $3)',
        [id, tallaItem.id_talla, tallaItem.stock]
      );
    }
    
    // Calcular la cantidad total de stock
    const cantidadTotal = tallas.reduce((total, item) => total + item.stock, 0);
    
    // Actualizar el inventario
    const inventarioActual = await client.query(
      'SELECT id FROM Inventarios WHERE id_zapatos = $1 ORDER BY fecha_de_ingreso DESC LIMIT 1',
      [id]
    );
    
    if (inventarioActual.rows.length > 0) {
      // Actualizar inventario existente
      await client.query(
        'UPDATE Inventarios SET cantidad = $1, estado = $2, id_usuarios = $3, fecha_de_ingreso = CURRENT_TIMESTAMP WHERE id = $4',
        [cantidadTotal, estado, req.usuario?.id || 1, inventarioActual.rows[0].id]
      );
    } else {
      // Crear un nuevo registro de inventario
      await client.query(
        'INSERT INTO Inventarios (cantidad, id_zapatos, id_usuarios, estado) VALUES ($1, $2, $3, $4)',
        [cantidadTotal, id, req.usuario?.id || 1, estado]
      );
    }
    
    await client.query('COMMIT');
    
    res.status(200).json({
      mensaje: 'Producto actualizado exitosamente',
      data: {
        id: parseInt(id),
        codigo,
        nombre,
        id_tipo_de_zapato,
        cantidad: cantidadTotal,
        estado
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al modificar producto:', error);
    res.status(500).json({ 
      error: 'Error al modificar el producto',
      details: error.message
    });
  } finally {
    client.release();
  }
});

// Endpoint adicional para actualizar solo el estado del producto
router.patch('/productos/:id/estado', auth, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { estado } = req.body;
    
    // Validación de campos requeridos
    if (!estado) {
      return res.status(400).json({ 
        error: 'Se requiere el campo estado' 
      });
    }
    
    // Verificar si el producto existe
    const productoExistente = await client.query(
      'SELECT id FROM Zapatos WHERE id = $1',
      [id]
    );
    
    if (productoExistente.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    
    // Actualizar el estado en inventario
    const inventarioActual = await client.query(
      'SELECT id FROM Inventarios WHERE id_zapatos = $1 ORDER BY fecha_de_ingreso DESC LIMIT 1',
      [id]
    );
    
    if (inventarioActual.rows.length > 0) {
      // Actualizar inventario existente
      await client.query(
        'UPDATE Inventarios SET estado = $1, id_usuarios = $2, fecha_de_ingreso = CURRENT_TIMESTAMP WHERE id = $3',
        [estado, req.usuario?.id || 1, inventarioActual.rows[0].id]
      );
    } else {
      // Crear un nuevo registro de inventario con cantidad 0
      await client.query(
        'INSERT INTO Inventarios (cantidad, id_zapatos, id_usuarios, estado) VALUES (0, $1, $2, $3)',
        [id, req.usuario?.id || 1, estado]
      );
    }
    
    await client.query('COMMIT');
    
    res.status(200).json({
      mensaje: `Estado del producto actualizado a '${estado}' exitosamente`,
      id: parseInt(id),
      estado
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al actualizar estado del producto:', error);
    res.status(500).json({ 
      error: 'Error al actualizar estado del producto',
      details: error.message
    });
  } finally {
    client.release();
  }
});

// Endpoint adicional para actualizar solo el stock de una talla específica
router.patch('/productos/:id/stock', auth, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { id_talla, stock } = req.body;
    
    // Validación de campos requeridos
    if (!id_talla || stock === undefined) {
      return res.status(400).json({ 
        error: 'Se requieren los campos id_talla y stock' 
      });
    }
    
    if (stock < 0) {
      return res.status(400).json({ 
        error: 'El stock no puede ser negativo' 
      });
    }
    
    // Verificar si el producto existe
    const productoExistente = await client.query(
      'SELECT id FROM Zapatos WHERE id = $1',
      [id]
    );
    
    if (productoExistente.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    
    // Verificar si existe la relación zapato-talla
    const tallaExistente = await client.query(
      'SELECT id, stock FROM Zapatos_Tallas WHERE id_zapato = $1 AND id_talla = $2',
      [id, id_talla]
    );
    
    let stockAnterior = 0;
    
    if (tallaExistente.rows.length > 0) {
      stockAnterior = tallaExistente.rows[0].stock;
      // Actualizar el stock en Zapatos_Tallas
      await client.query(
        'UPDATE Zapatos_Tallas SET stock = $1 WHERE id_zapato = $2 AND id_talla = $3',
        [stock, id, id_talla]
      );
    } else {
      // Insertar nueva relación zapato-talla
      await client.query(
        'INSERT INTO Zapatos_Tallas (id_zapato, id_talla, stock) VALUES ($1, $2, $3)',
        [id, id_talla, stock]
      );
    }
    
    // Obtener la nueva cantidad total de stock
    const totalStockResult = await client.query(
      'SELECT SUM(stock) as total FROM Zapatos_Tallas WHERE id_zapato = $1',
      [id]
    );
    
    const totalStock = parseInt(totalStockResult.rows[0].total) || 0;
    
    // Actualizar el inventario
    const inventarioActual = await client.query(
      'SELECT id, estado FROM Inventarios WHERE id_zapatos = $1 ORDER BY fecha_de_ingreso DESC LIMIT 1',
      [id]
    );
    
    if (inventarioActual.rows.length > 0) {
      // Actualizar inventario existente
      await client.query(
        'UPDATE Inventarios SET cantidad = $1, id_usuarios = $2, fecha_de_ingreso = CURRENT_TIMESTAMP WHERE id = $3',
        [totalStock, req.usuario?.id || 1, inventarioActual.rows[0].id]
      );
    } else {
      // Crear un nuevo registro de inventario
      await client.query(
        'INSERT INTO Inventarios (cantidad, id_zapatos, id_usuarios, estado) VALUES ($1, $2, $3, $4)',
        [totalStock, id, req.usuario?.id || 1, 'Disponible']
      );
    }
    
    await client.query('COMMIT');
    
    res.status(200).json({
      mensaje: 'Stock actualizado exitosamente',
      data: {
        id: parseInt(id),
        id_talla: id_talla,
        stock_anterior: stockAnterior,
        stock_nuevo: stock,
        stock_total: totalStock
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al modificar stock:', error);
    res.status(500).json({ 
      error: 'Error al modificar el stock',
      details: error.message
    });
  } finally {
    client.release();
  }
});

module.exports = router;