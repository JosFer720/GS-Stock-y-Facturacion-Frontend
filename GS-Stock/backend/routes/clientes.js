const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const auth = require('../middleware/auth'); // Middleware de autenticación

// Configuración de la conexión a postgres
const pool = new Pool({
  user: process.env.DB_USER || 'admin',
  host: process.env.DB_HOST || 'postgres',
  database: process.env.DB_NAME || 'mydb',
  password: process.env.DB_PASSWORD || 'secret',
  port: process.env.DB_PORT || 5432,
});



const formatClientResponse = (clientData) => {
  const clientMap = new Map();
  
  clientData.forEach(row => {
    if (!clientMap.has(row.id)) {
      clientMap.set(row.id, {
        id: row.id,
        nombre: row.nombre,
        apellido: row.apellido,
        empresa: row.empresa,
        direcciones: [],
        telefonos: []
      });
    }
    
    const client = clientMap.get(row.id);
    
    if (row.direccion_id && !client.direcciones.some(d => d.id === row.direccion_id)) {
      client.direcciones.push({
        id: row.direccion_id,
        direccion: row.direccion
      });
    }
    
    if (row.telefono_id && !client.telefonos.some(t => t.id === row.telefono_id)) {
      client.telefonos.push({
        id: row.telefono_id,
        telefono: row.telefono
      });
    }
  });
  
  return Array.from(clientMap.values());
};


async function getFullClientData(clientId) {
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
  `, [clientId]);
  
  if (result.rows.length === 0) return null;
  
  const clienteData = {
    id: result.rows[0].id,
    nombre: result.rows[0].nombre,
    apellido: result.rows[0].apellido,
    empresa: result.rows[0].empresa,
    direcciones: [],
    telefonos: []
  };
  
  result.rows.forEach(row => {
    if (row.direccion_id && !clienteData.direcciones.some(d => d.id === row.direccion_id)) {
      clienteData.direcciones.push({
        id: row.direccion_id,
        direccion: row.direccion
      });
    }
    
    if (row.telefono_id && !clienteData.telefonos.some(t => t.id === row.telefono_id)) {
      clienteData.telefonos.push({
        id: row.telefono_id,
        telefono: row.telefono
      });
    }
  });
  
  return clienteData;
}

// Endpoint para obtener todos los clientes con sus direcciones y teléfonos 
router.get('/clientes', auth, async (req, res) => {
  try {
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
      ORDER BY c.id
    `);
    
    const clients = formatClientResponse(result.rows);
    
    res.status(200).json({
      message: 'Clientes obtenidos correctamente',
      count: clients.length,
      data: clients
    });
  } catch (err) {
    console.error('Error al obtener clientes:', err);
    res.status(500).json({ 
      error: 'Error al consultar la base de datos',
      details: err.message
    });
  }
});

// Endpoint para obtener un cliente específico por ID 
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

// Crear un nuevo cliente con direcciones y teléfonos 
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
        
        // Actualizar la referencia en la tabla clientes 
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

// Actualizar un cliente existente 
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
    
    // Manejar direcciones
    const currentDirecciones = await client.query(
      'SELECT d.id, d.direccion FROM direcciones d JOIN cliente_direcciones cd ON d.id = cd.id_direccion WHERE cd.id_cliente = $1',
      [id]
    );
    
    // Actualizar direcciones existentes o agregar nuevas
    for (const direccion of direcciones) {
      if (direccion.id) {
        // Actualizar dirección existente
        await client.query(
          'UPDATE direcciones SET direccion = $1 WHERE id = $2',
          [direccion.direccion.trim(), direccion.id]
        );
      } else if (direccion.direccion?.trim()) {
        // Insertar nueva dirección
        const direccionResult = await client.query(
          'INSERT INTO direcciones (direccion) VALUES ($1) RETURNING *',
          [direccion.direccion.trim()]
        );
        
        await client.query(
          'INSERT INTO cliente_direcciones (id_cliente, id_direccion) VALUES ($1, $2)',
          [id, direccionResult.rows[0].id]
        );
      }
    }
    
    // Eliminar direcciones que ya no están en la lista
    const direccionesActualesIds = direcciones.filter(d => d.id).map(d => d.id);
    for (const dir of currentDirecciones.rows) {
      if (!direccionesActualesIds.includes(dir.id)) {
        await client.query('DELETE FROM cliente_direcciones WHERE id_cliente = $1 AND id_direccion = $2', [id, dir.id]);
        await client.query('DELETE FROM direcciones WHERE id = $1', [dir.id]);
      }
    }
    
    // Manejar teléfonos (similar a direcciones)
    const currentTelefonos = await client.query(
      'SELECT t.id, t.telefono FROM telefonos t JOIN cliente_telefonos ct ON t.id = ct.id_telefono WHERE ct.id_cliente = $1',
      [id]
    );
    
    for (const telefono of telefonos) {
      if (telefono.id) {
        await client.query(
          'UPDATE telefonos SET telefono = $1 WHERE id = $2',
          [telefono.telefono.trim(), telefono.id]
        );
      } else if (telefono.telefono?.trim()) {
        const telefonoResult = await client.query(
          'INSERT INTO telefonos (telefono) VALUES ($1) RETURNING *',
          [telefono.telefono.trim()]
        );
        
        await client.query(
          'INSERT INTO cliente_telefonos (id_cliente, id_telefono) VALUES ($1, $2)',
          [id, telefonoResult.rows[0].id]
        );
      }
    }
    
    const telefonosActualesIds = telefonos.filter(t => t.id).map(t => t.id);
    for (const tel of currentTelefonos.rows) {
      if (!telefonosActualesIds.includes(tel.id)) {
        await client.query('DELETE FROM cliente_telefonos WHERE id_cliente = $1 AND id_telefono = $2', [id, tel.id]);
        await client.query('DELETE FROM telefonos WHERE id = $1', [tel.id]);
      }
    }
    
    await client.query('COMMIT');
    
    // Obtener el cliente actualizado
    const updatedClient = await getFullClientData(id);
    
    res.status(200).json({
      message: 'Cliente actualizado correctamente',
      data: updatedClient
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

// Eliminar un cliente (versión corregida)
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

    // Verificar si el cliente tiene pedidos asociados
    const pedidosResult = await client.query(
      'SELECT COUNT(*) as count FROM pedidos WHERE id_cliente = $1',
      [id]
    );

    if (parseInt(pedidosResult.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'No se puede eliminar el cliente porque tiene pedidos asociados',
        details: `El cliente tiene ${pedidosResult.rows[0].count} pedidos registrados`
      });
    }
    
    await client.query('BEGIN');
    
    
    await client.query(
      'UPDATE clientes SET id_cliente_telefono = NULL WHERE id = $1',
      [id]
    );
    
    
    const direccionesResult = await client.query(
      'SELECT id_direccion FROM cliente_direcciones WHERE id_cliente = $1',
      [id]
    );
    
   
    const telefonosResult = await client.query(
      'SELECT id_telefono FROM cliente_telefonos WHERE id_cliente = $1',
      [id]
    );
    
    
    await client.query(
      'DELETE FROM cliente_direcciones WHERE id_cliente = $1',
      [id]
    );
    
    
    await client.query(
      'DELETE FROM cliente_telefonos WHERE id_cliente = $1',
      [id]
    );
    
   
    for (const direccion of direccionesResult.rows) {
      await client.query(
        'DELETE FROM direcciones WHERE id = $1',
        [direccion.id_direccion]
      );
    }
    
 
    for (const telefono of telefonosResult.rows) {
      await client.query(
        'DELETE FROM telefonos WHERE id = $1',
        [telefono.id_telefono]
      );
    }
    
   
    const deleteResult = await client.query(
      'DELETE FROM clientes WHERE id = $1 RETURNING *',
      [id]
    );
    
    await client.query('COMMIT');
    
    res.status(200).json({
      message: 'Cliente eliminado correctamente',
      data: {
        clienteEliminado: deleteResult.rows[0],
        direccionesEliminadas: direccionesResult.rows.length,
        telefonosEliminados: telefonosResult.rows.length
      }
    });
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al eliminar cliente:', err);
    
    // Manejo de errores específicos
    if (err.code === '23503') { 
      res.status(400).json({ 
        error: 'No se puede eliminar el cliente porque está referenciado en otras tablas',
        details: 'El cliente tiene registros asociados que impiden su eliminación'
      });
    } else {
      res.status(500).json({ 
        error: 'Error en el servidor',
        details: err.message 
      });
    }
  } finally {
    client.release();
  }
});


// Endpoint para buscar clientes por nombre o empresa 
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

// Endpoint para obtener solo direcciones de un cliente 
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

// Endpoint para obtener solo teléfonos de un cliente 
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