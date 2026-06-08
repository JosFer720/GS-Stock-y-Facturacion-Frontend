// routes/eliminarProducto.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// Endpoint para eliminar un producto
router.delete('/productos/:id', auth, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    
    // Verificar si el producto existe
    const productoExistente = await client.query(
      'SELECT id FROM Zapatos WHERE id = $1',
      [id]
    );
    
    if (productoExistente.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    
    // Verificar si el producto está siendo usado en pedidos
    const enPedidos = await client.query(
      'SELECT id FROM Detalle_Pedidos WHERE id_zapato = $1 LIMIT 1',
      [id]
    );
    
    if (enPedidos.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: 'No se puede eliminar el producto porque está asociado a pedidos' 
      });
    }
    
    // Eliminar registros de Zapatos_Tallas
    await client.query(
      'DELETE FROM Zapatos_Tallas WHERE id_zapato = $1',
      [id]
    );
    
    // Eliminar registros de Inventarios
    await client.query(
      'DELETE FROM Inventarios WHERE id_zapatos = $1',
      [id]
    );
    
    // Eliminar el zapato
    await client.query(
      'DELETE FROM Zapatos WHERE id = $1',
      [id]
    );
    
    await client.query('COMMIT');
    
    res.status(200).json({ 
      mensaje: 'Producto eliminado exitosamente',
      id: parseInt(id)
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al eliminar producto:', error);
    res.status(500).json({ 
      error: 'Error al eliminar el producto',
      details: error.message
    });
  } finally {
    client.release();
  }
});

module.exports = router;