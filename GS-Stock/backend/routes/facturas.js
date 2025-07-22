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

router.get('/facturas', auth, async (req, res) => {
  const { cliente } = req.query;

  let query = `
    SELECT f.*, p.id_cliente, c.nombre AS nombre_cliente, c.apellido AS apellido_cliente
    FROM facturas f
    JOIN pedidos p ON f.id_pedido = p.id
    JOIN clientes c ON p.id_cliente = c.id
    WHERE 1=1
  `;
  const params = [];

  // Filtro por cliente
  if (cliente) {
    const palabras = cliente.trim().toLowerCase().split(/\s+/);
    
    if (palabras.length === 1) {
      params.push(`%${palabras[0]}%`);
      query += ` AND (LOWER(c.nombre) LIKE $${params.length} OR LOWER(c.apellido) LIKE $${params.length})`;
    } else {
      query += ` AND (`;
      const condiciones = [];
      
      palabras.forEach((palabra) => {
        params.push(`%${palabra}%`);
        condiciones.push(`(LOWER(c.nombre) LIKE $${params.length} OR LOWER(c.apellido) LIKE $${params.length})`);
      });
      
      query += condiciones.join(' AND ') + ')';
    }
  }

  query += ` ORDER BY f.id DESC`;

  try {
    console.log('Query:', query);
    console.log('Params:', params);
    
    const result = await pool.query(query, params);
    console.log('Resultados encontrados:', result.rows.length);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener facturas:', error);
    res.status(500).json({ error: 'Error al obtener facturas' });
  }
});

module.exports = router;