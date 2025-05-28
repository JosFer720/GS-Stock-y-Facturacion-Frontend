const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const auth = require('../middleware/auth');
const SocketService = require('../services/socketService');

// Configuración de la conexión a PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER || 'admin',
  host: process.env.DB_HOST || 'postgres',
  database: process.env.DB_NAME || 'mydb',
  password: process.env.DB_PASSWORD || 'secret',
  port: process.env.DB_PORT || 5432,
});

// Middleware para obtener el servicio de socket
router.use((req, res, next) => {
  const io = req.app.get('socketio');
  req.socketService = new SocketService(io);
  next();
});

// Actualizar inventario
router.put('/update/:id', async (req, res) => {
  try {
    const productId = req.params.id;
    const updateData = req.body;
    
    // Obtener stock anterior (esto depende de tu implementación de base de datos)
    const previousStock = await getProductStock(productId); // Implementa esta función
    
    // Actualizar en base de datos
    const updatedProduct = await updateProductInDB(productId, updateData); // Implementa esta función
    
    // GSS-77: Emitir evento de actualización de inventario
    req.socketService.emitInventoryUpdate(updatedProduct);
    
    // Si cambió el stock, emitir evento específico
    if (updateData.stock !== undefined && updateData.stock !== previousStock) {
      req.socketService.emitStockUpdate(productId, updateData.stock, previousStock);
      
      // Verificar si el stock está bajo
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

// Agregar nuevo producto
router.post('/add', async (req, res) => {
  try {
    const productData = req.body;
    
    // Agregar a base de datos
    const newProduct = await addProductToDB(productData); // Implementa esta función
    
    // GSS-77: Emitir evento de nuevo producto
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

module.exports = router;
