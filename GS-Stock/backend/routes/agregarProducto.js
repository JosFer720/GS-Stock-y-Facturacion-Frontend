// routes/agregarProducto.js
const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const auth = require('../middleware/auth'); // Middleware de autenticación

// Configuración de la conexión a PostgreSQL usando las variables del docker-compose
const pool = new Pool({
  user: process.env.DB_USER || 'admin',
  host: process.env.DB_HOST || 'postgres',
  database: process.env.DB_NAME || 'mydb',
  password: process.env.DB_PASSWORD || 'secret',
  port: process.env.DB_PORT || 5432,
});

// Endpoint para agregar un nuevo producto
router.post('/productos', auth, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
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
    
    // Verificar si el código ya existe
    const codigoExistente = await client.query(
      'SELECT id FROM Zapatos WHERE codigo = $1',
      [codigo]
    );
    
    if (codigoExistente.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'El código de producto ya existe' });
    }
    
    // Insertar el zapato
    const zapatoResult = await client.query(
      'INSERT INTO Zapatos (codigo, nombre, id_tipo_de_zapato) VALUES ($1, $2, $3) RETURNING id',
      [codigo, nombre, id_tipo_de_zapato]
    );
    
    const zapatoId = zapatoResult.rows[0].id;
    
    // Insertar las tallas con su stock
    for (const tallaItem of tallas) {
      await client.query(
        'INSERT INTO Zapatos_Tallas (id_zapato, id_talla, stock) VALUES ($1, $2, $3)',
        [zapatoId, tallaItem.id_talla, tallaItem.stock]
      );
    }
    
    // Calcular la cantidad total de stock
    const cantidadTotal = tallas.reduce((total, item) => total + item.stock, 0);
    
    // Registrar en inventario
    await client.query(
      'INSERT INTO Inventarios (cantidad, id_zapatos, id_usuarios, estado) VALUES ($1, $2, $3, $4)',
      [cantidadTotal, zapatoId, req.usuario?.id || 1, estado]
    );
    
    await client.query('COMMIT');
    
    res.status(201).json({
      mensaje: 'Producto agregado exitosamente',
      data: {
        id: zapatoId,
        codigo,
        nombre,
        id_tipo_de_zapato,
        cantidad: cantidadTotal,
        estado
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al agregar producto:', error);
    res.status(500).json({ 
      error: 'Error al agregar el producto',
      details: error.message
    });
  } finally {
    client.release();
  }
});

module.exports = router;