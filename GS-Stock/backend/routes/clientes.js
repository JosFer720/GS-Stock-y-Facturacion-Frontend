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

// Endpoint para obtener todos los clientes con sus direcciones y teléfonos (protegido)
router.get('/clientes', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        c.id,
        c.nombre,
        c.apellido,
        c.empresa,
        d.direccion,
        t.telefono
      FROM clientes c
      LEFT JOIN cliente_direcciones cd ON c.id = cd.id_cliente
      LEFT JOIN direcciones d ON cd.id_direccion = d.id
      LEFT JOIN cliente_telefonos ct ON c.id = ct.id_cliente
      LEFT JOIN telefonos t ON ct.id_telefono = t.id
      ORDER BY c.id
    `);
    
    if (result.rows.length === 0) {
      return res.status(200).json({ message: 'No hay clientes registrados', data: [] });
    }
    
    // Agrupar los datos para evitar duplicados por múltiples direcciones/teléfonos
    const clientesMap = new Map();
    
    result.rows.forEach(row => {
      const clienteId = row.id;
      
      if (!clientesMap.has(clienteId)) {
        clientesMap.set(clienteId, {
          id: row.id,
          nombre: row.nombre,
          apellido: row.apellido,
          empresa: row.empresa,
          direcciones: [],
          telefonos: []
        });
      }
      
      const cliente = clientesMap.get(clienteId);
      
      if (row.direccion && !cliente.direcciones.includes(row.direccion)) {
        cliente.direcciones.push(row.direccion);
      }
      
      if (row.telefono && !cliente.telefonos.includes(row.telefono)) {
        cliente.telefonos.push(row.telefono);
      }
    });
    
    const clientes = Array.from(clientesMap.values());
    
    res.status(200).json({
      message: 'Clientes obtenidos correctamente',
      count: clientes.length,
      data: clientes
    });
  } catch (err) {
    console.error('Error al obtener clientes:', err);
    res.status(500).json({ 
      error: 'Error al consultar la base de datos',
      details: err.message
    });
  }
});

// Endpoint para obtener un cliente específico por ID (protegido)
router.get('/clientes/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
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
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    
    // Agrupar los datos del cliente
    const clienteData = {
      id: result.rows[0].id,
      nombre: result.rows[0].nombre,
      apellido: result.rows[0].apellido,
      empresa: result.rows[0].empresa,
      direcciones: [],
      telefonos: []
    };
    
    result.rows.forEach(row => {
      if (row.direccion && !clienteData.direcciones.find(d => d.id === row.direccion_id)) {
        clienteData.direcciones.push({
          id: row.direccion_id,
          direccion: row.direccion
        });
      }
      
      if (row.telefono && !clienteData.telefonos.find(t => t.id === row.telefono_id)) {
        clienteData.telefonos.push({
          id: row.telefono_id,
          telefono: row.telefono
        });
      }
    });
    
    res.status(200).json({
      message: 'Cliente obtenido correctamente',
      data: clienteData
    });
  } catch (err) {
    console.error('Error al obtener cliente:', err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Crear un nuevo cliente con direcciones y teléfonos (protegido)
router.post('/clientes', auth, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { nombre, apellido, empresa, direcciones, telefonos } = req.body;
    
    // Validación básica
    if (!nombre || !apellido) {
      return res.status(400).json({ 
        error: 'Los campos nombre y apellido son obligatorios' 
      });
    }
    
    if (!direcciones || !Array.isArray(direcciones) || direcciones.length === 0) {
      return res.status(400).json({ 
        error: 'Debe proporcionar al menos una dirección' 
      });
    }
    
    if (!telefonos || !Array.isArray(telefonos) || telefonos.length === 0) {
      return res.status(400).json({ 
        error: 'Debe proporcionar al menos un teléfono' 
      });
    }
    
    await client.query('BEGIN');
    
    // Crear el cliente
    const clienteResult = await client.query(
      'INSERT INTO clientes (nombre, apellido, empresa) VALUES ($1, $2, $3) RETURNING *',
      [nombre, apellido, empresa || null]
    );
    
    const clienteId = clienteResult.rows[0].id;
    
    // Insertar direcciones
    const direccionesInsertadas = [];
    for (const direccion of direcciones) {
      if (direccion.trim()) {
        // Insertar dirección
        const direccionResult = await client.query(
          'INSERT INTO direcciones (direccion) VALUES ($1) RETURNING *',
          [direccion.trim()]
        );
        
        // Relacionar cliente con dirección
        await client.query(
          'INSERT INTO cliente_direcciones (id_cliente, id_direccion) VALUES ($1, $2)',
          [clienteId, direccionResult.rows[0].id]
        );
        
        direccionesInsertadas.push(direccionResult.rows[0]);
      }
    }
    
    // Insertar teléfonos
    const telefonosInsertados = [];
    for (const telefono of telefonos) {
      if (telefono.trim()) {
        // Insertar teléfono
        const telefonoResult = await client.query(
          'INSERT INTO telefonos (telefono) VALUES ($1) RETURNING *',
          [telefono.trim()]
        );
        
        // Relacionar cliente con teléfono
        const clienteTelefonoResult = await client.query(
          'INSERT INTO cliente_telefonos (id_cliente, id_telefono) VALUES ($1, $2) RETURNING *',
          [clienteId, telefonoResult.rows[0].id]
        );
        
        telefonosInsertados.push(telefonoResult.rows[0]);
        
        // Actualizar la referencia en la tabla clientes (según la modificación en 06-modify-clients.sql)
        if (telefonosInsertados.length === 1) { // Solo para el primer teléfono
          await client.query(
            'UPDATE clientes SET id_cliente_telefono = $1 WHERE id = $2',
            [clienteTelefonoResult.rows[0].id, clienteId]
          );
        }
      }
    }
    
    await client.query('COMMIT');
    
    res.status(201).json({
      message: 'Cliente creado correctamente',
      data: {
        cliente: clienteResult.rows[0],
        direcciones: direccionesInsertadas,
        telefonos: telefonosInsertados
      }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al crear cliente:', err);
    res.status(500).json({ 
      error: 'Error en el servidor',
      details: err.message 
    });
  } finally {
    client.release();
  }
});

// Actualizar un cliente existente (protegido)
router.put('/clientes/:id', auth, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    const { nombre, apellido, empresa, direcciones, telefonos } = req.body;
    
    // Validación básica
    if (!nombre || !apellido) {
      return res.status(400).json({ 
        error: 'Los campos nombre y apellido son obligatorios' 
      });
    }
    
    // Validar que el cliente existe
    const checkResult = await client.query(
      'SELECT * FROM clientes WHERE id = $1',
      [id]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    
    await client.query('BEGIN');
    
    // Actualizar datos del cliente
    const clienteResult = await client.query(
      'UPDATE clientes SET nombre = $1, apellido = $2, empresa = $3 WHERE id = $4 RETURNING *',
      [nombre, apellido, empresa || null, id]
    );
    
    // Si se proporcionan direcciones, actualizarlas
    if (direcciones && Array.isArray(direcciones)) {
      // Eliminar direcciones existentes
      await client.query(
        'DELETE FROM cliente_direcciones WHERE id_cliente = $1',
        [id]
      );
      
      // Insertar nuevas direcciones
      for (const direccion of direcciones) {
        if (direccion.trim()) {
          const direccionResult = await client.query(
            'INSERT INTO direcciones (direccion) VALUES ($1) RETURNING *',
            [direccion.trim()]
          );
          
          await client.query(
            'INSERT INTO cliente_direcciones (id_cliente, id_direccion) VALUES ($1, $2)',
            [id, direccionResult.rows[0].id]
          );
        }
      }
    }
    
    // Si se proporcionan teléfonos, actualizarlos
    if (telefonos && Array.isArray(telefonos)) {
      // Eliminar teléfonos existentes
      await client.query(
        'DELETE FROM cliente_telefonos WHERE id_cliente = $1',
        [id]
      );
      
      // Limpiar referencia en tabla clientes
      await client.query(
        'UPDATE clientes SET id_cliente_telefono = NULL WHERE id = $1',
        [id]
      );
      
      // Insertar nuevos teléfonos
      let primerTelefonoRelacionId = null;
      for (const telefono of telefonos) {
        if (telefono.trim()) {
          const telefonoResult = await client.query(
            'INSERT INTO telefonos (telefono) VALUES ($1) RETURNING *',
            [telefono.trim()]
          );
          
          const clienteTelefonoResult = await client.query(
            'INSERT INTO cliente_telefonos (id_cliente, id_telefono) VALUES ($1, $2) RETURNING *',
            [id, telefonoResult.rows[0].id]
          );
          
          // Guardar el ID de la primera relación para actualizar la referencia
          if (!primerTelefonoRelacionId) {
            primerTelefonoRelacionId = clienteTelefonoResult.rows[0].id;
          }
        }
      }
      
      // Actualizar referencia con el primer teléfono
      if (primerTelefonoRelacionId) {
        await client.query(
          'UPDATE clientes SET id_cliente_telefono = $1 WHERE id = $2',
          [primerTelefonoRelacionId, id]
        );
      }
    }
    
    await client.query('COMMIT');
    
    res.status(200).json({
      message: 'Cliente actualizado correctamente',
      data: clienteResult.rows[0]
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al actualizar cliente:', err);
    res.status(500).json({ 
      error: 'Error en el servidor',
      details: err.message 
    });
  } finally {
    client.release();
  }
});

// Eliminar un cliente (protegido)
router.delete('/clientes/:id', auth, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    
    // Validar que el cliente existe
    const checkResult = await client.query(
      'SELECT * FROM clientes WHERE id = $1',
      [id]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    
    await client.query('BEGIN');
    
    // Eliminar relaciones cliente-direcciones
    await client.query('DELETE FROM cliente_direcciones WHERE id_cliente = $1', [id]);
    
    // Eliminar relaciones cliente-teléfonos
    await client.query('DELETE FROM cliente_telefonos WHERE id_cliente = $1', [id]);
    
    // Eliminar el cliente
    await client.query('DELETE FROM clientes WHERE id = $1', [id]);
    
    await client.query('COMMIT');
    
    res.status(200).json({
      message: 'Cliente eliminado correctamente'
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al eliminar cliente:', err);
    
    // Manejar errores de clave foránea
    if (err.code === '23503') {
      res.status(400).json({ 
        error: 'No se puede eliminar el cliente porque tiene registros relacionados (pedidos, cuentas por cobrar, etc.)'
      });
    } else {
      res.status(500).json({ error: 'Error en el servidor' });
    }
  } finally {
    client.release();
  }
});

// Endpoint para buscar clientes por nombre o empresa (protegido)
router.get('/clientes/buscar/:termino', auth, async (req, res) => {
  try {
    const { termino } = req.params;
    
    const result = await pool.query(`
      SELECT DISTINCT
        c.id,
        c.nombre,
        c.apellido,
        c.empresa
      FROM clientes c
      WHERE 
        LOWER(c.nombre) LIKE LOWER($1) OR 
        LOWER(c.apellido) LIKE LOWER($1) OR 
        LOWER(c.empresa) LIKE LOWER($1)
      ORDER BY c.nombre, c.apellido
    `, [`%${termino}%`]);
    
    res.status(200).json({
      message: `Clientes encontrados para "${termino}"`,
      count: result.rows.length,
      data: result.rows
    });
  } catch (err) {
    console.error('Error al buscar clientes:', err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Endpoint para obtener solo direcciones de un cliente (protegido)
router.get('/clientes/:id/direcciones', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT d.id, d.direccion
      FROM direcciones d
      INNER JOIN cliente_direcciones cd ON d.id = cd.id_direccion
      WHERE cd.id_cliente = $1
    `, [id]);
    
    res.status(200).json({
      message: 'Direcciones del cliente obtenidas correctamente',
      data: result.rows
    });
  } catch (err) {
    console.error('Error al obtener direcciones del cliente:', err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Endpoint para obtener solo teléfonos de un cliente (protegido)
router.get('/clientes/:id/telefonos', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT t.id, t.telefono
      FROM telefonos t
      INNER JOIN cliente_telefonos ct ON t.id = ct.id_telefono
      WHERE ct.id_cliente = $1
    `, [id]);
    
    res.status(200).json({
      message: 'Teléfonos del cliente obtenidos correctamente',
      data: result.rows
    });
  } catch (err) {
    console.error('Error al obtener teléfonos del cliente:', err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

module.exports = router;