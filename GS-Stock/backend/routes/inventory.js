const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const SocketService = require('../services/socketService');

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

// Ruta para actualizar inventario
router.put('/update/:id', async (req, res) => {
  try {
    const productId = req.params.id;
    const updateData = req.body;

    // Obtener stock anterior
    const previousStock = await getProductStock(productId);

    // Actualizar producto en DB
    const updatedProduct = await updateProductInDB(productId, updateData);

    // Emitir evento de actualización de inventario
    req.socketService.emitInventoryUpdate(updatedProduct);

    if (updateData.stock !== undefined && updateData.stock !== previousStock) {
      req.socketService.emitStockUpdate(productId, updateData.stock, previousStock);

      // Emitir alerta si stock está bajo
      if (updateData.stock <= (updatedProduct.minimum_stock || 5)) {
        req.socketService.emitLowStockAlert(updatedProduct);
      }
    }

    res.json({
      success: true,
      data: updatedProduct,
      message: 'Inventario actualizado correctamente'
    });
  } catch (error) {
    console.error('Error actualizando inventario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar inventario'
    });
  }
});

// Ruta para agregar nuevo producto
router.post('/add', async (req, res) => {
  try {
    const productData = req.body;

    // Insertar nuevo producto en DB
    const newProduct = await addProductToDB(productData);

    // Emitir evento de nuevo producto
    req.socketService.emitNewProduct(newProduct);

    res.json({
      success: true,
      data: newProduct,
      message: 'Producto agregado correctamente'
    });
  } catch (error) {
    console.error('Error agregando producto:', error);
    res.status(500).json({
      success: false,
      message: 'Error al agregar producto'
    });
  }
});

// Función para obtener stock actual de un producto
async function getProductStock(productId) {
  const res = await pool.query('SELECT stock FROM productos WHERE id = $1', [productId]);
  return res.rows[0]?.stock || 0;
}

// Función para actualizar producto en base de datos
async function updateProductInDB(productId, updateData) {
  const fields = [];
  const values = [];
  let idx = 1;

  for (const key in updateData) {
    fields.push(`${key} = $${idx}`);
    values.push(updateData[key]);
    idx++;
  }

  values.push(productId);

  const query = `UPDATE productos SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;

  const res = await pool.query(query, values);
  return res.rows[0];
}

// Función para agregar un producto nuevo a la base de datos
async function addProductToDB(productData) {
  const { nombre, descripcion, stock, precio, minimum_stock } = productData;

  const query = `
    INSERT INTO productos (nombre, descripcion, stock, precio, minimum_stock)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;

  const values = [nombre, descripcion, stock, precio, minimum_stock || 5];

  const res = await pool.query(query, values);
  return res.rows[0];
}

module.exports = router;
