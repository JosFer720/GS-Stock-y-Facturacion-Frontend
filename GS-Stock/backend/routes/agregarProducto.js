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

router.post('/productos', auth, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { codigo, nombre, id_tipo_de_zapato, precio_par, tallas, estado } = req.body;
    
    if (!codigo || !nombre || !id_tipo_de_zapato || precio_par === undefined || !tallas || !estado) {
      return res.status(400).json({ 
        error: 'Se requieren los campos: codigo, nombre, id_tipo_de_zapato, precio_par, tallas y estado' 
      });
    }
    
    if (!/^[A-Za-z0-9]+$/.test(codigo)) {
      return res.status(400).json({ 
        error: 'El código debe ser alfanumérico (solo letras y números, sin espacios ni símbolos)' 
      });
    }
    
    if (typeof precio_par !== 'number' || precio_par < 0) {
      return res.status(400).json({ 
        error: 'El precio por par debe ser un número mayor o igual a 0' 
      });
    }
    
    if (!Array.isArray(tallas) || tallas.length === 0) {
      return res.status(400).json({ 
        error: 'Se requiere un array de tallas con su stock correspondiente' 
      });
    }
    
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
    
    const codigoExistente = await client.query(
      'SELECT id FROM Zapatos WHERE codigo = $1',
      [codigo]
    );
    
    if (codigoExistente.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'El código de producto ya existe' });
    }
    
    const zapatoResult = await client.query(
      'INSERT INTO Zapatos (codigo, nombre, id_tipo_de_zapato, precio_par) VALUES ($1, $2, $3, $4) RETURNING id',
      [codigo, nombre, id_tipo_de_zapato, precio_par]
    );
    
    const zapatoId = zapatoResult.rows[0].id;
    
    for (const tallaItem of tallas) {
      await client.query(
        'INSERT INTO Zapatos_Tallas (id_zapato, id_talla, stock) VALUES ($1, $2, $3)',
        [zapatoId, tallaItem.id_talla, tallaItem.stock]
      );
    }
    
    const cantidadTotal = tallas.reduce((total, item) => total + item.stock, 0);
    
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
        precio_par: parseFloat(precio_par),
        cantidad_total: cantidadTotal,
        tallas_agregadas: tallas.length,
        tallas: tallas.map(t => ({
          id_talla: t.id_talla,
          stock: t.stock
        })),
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