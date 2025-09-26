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

// Test database connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Database connection error:', err);
});

// Función para validar NIT guatemalteco
const validateGuatemalanNIT = (nit) => {
  if (!nit) return { valid: true, message: '' }; // NIT opcional
  
  // Limpiar el NIT (quitar espacios y convertir a mayúsculas)
  const nitClean = nit.replace(/[\s-]/g, '').toUpperCase();
  
  // Verificar si es "CF" (Consumidor Final)
  if (nitClean === 'CF') {
    return { 
      valid: true, 
      message: 'Consumidor Final válido' 
    };
  }
  
  // Verificar longitud para NITs regulares (debe ser 8 o 9 dígitos)
  if (!/^[0-9]{8,9}$/.test(nitClean)) {
    return { 
      valid: false, 
      message: 'El NIT debe tener 8-9 dígitos o ser "CF" para Consumidor Final' 
    };
  }
  
  // Para NITs de 8 dígitos, agregar un 0 al inicio
  const nitPadded = nitClean.length === 8 ? '0' + nitClean : nitClean;
  
  // Extraer dígitos y dígito verificador
  const nitDigits = nitPadded.substring(0, 8);
  const checkDigit = parseInt(nitPadded.substring(8, 9));
  
  // Calcular dígito verificador
  let sum = 0;
  let multiplier = 2;
  
  for (let i = 7; i >= 0; i--) {
    sum += parseInt(nitDigits[i]) * multiplier;
    multiplier++;
  }
  
  let calculatedDigit = 11 - (sum % 11);
  
  // Casos especiales
  if (calculatedDigit === 11) {
    calculatedDigit = 0;
  } else if (calculatedDigit === 10) {
    return { 
      valid: false, 
      message: 'NIT inválido - dígito verificador incorrecto' 
    };
  }
  
  if (calculatedDigit !== checkDigit) {
    return { 
      valid: false, 
      message: 'Dígito verificador incorrecto' 
    };
  }
  
  return { 
    valid: true, 
    message: 'NIT válido' 
  };
};

// Función para formatear NIT guatemalteco
const formatGuatemalanNIT = (nit) => {
  if (!nit) return '';
  
  // Limpiar el NIT y convertir a mayúsculas
  const nitClean = nit.replace(/[\s-]/g, '').toUpperCase();
  
  // Si es CF, devolverlo tal como está
  if (nitClean === 'CF') {
    return 'CF';
  }
  
  // Formatear NITs regulares
  if (nitClean.length === 8) {
    return `${nitClean.substring(0, 7)}-${nitClean.substring(7)}`;
  } else if (nitClean.length === 9) {
    return `${nitClean.substring(0, 8)}-${nitClean.substring(8)}`;
  }
  
  return nitClean;
};

// Función para obtener o crear NIT
const getOrCreateNIT = async (client, nitValue) => {
  if (!nitValue || nitValue.trim() === '') {
    return null;
  }
  
  const nitFormatted = formatGuatemalanNIT(nitValue.trim());
  
  try {
    // Verificar si el NIT ya existe
    const existingNIT = await client.query(
      'SELECT id FROM nits WHERE nit = $1',
      [nitFormatted]
    );
    
    if (existingNIT.rows.length > 0) {
      return existingNIT.rows[0].id;
    }
    
    // Crear nuevo NIT
    const newNIT = await client.query(
      'INSERT INTO nits (nit) VALUES ($1) RETURNING id',
      [nitFormatted]
    );
    
    return newNIT.rows[0].id;
  } catch (err) {
    console.error('Error managing NIT:', err);
    throw err;
  }
};

const formatClientResponse = (clientData) => {
  const clientMap = new Map();
  
  clientData.forEach(row => {
    if (!clientMap.has(row.id)) {
      clientMap.set(row.id, {
        id: row.id,
        nombre: row.nombre,
        apellido: row.apellido,
        empresa: row.empresa,
        nit: row.nit || null,
        direcciones: [],
        telefonos: []
      });
    }
    
    const client = clientMap.get(row.id);
    
    if (row.direccion_id && row.direccion && !client.direcciones.some(d => d.id === row.direccion_id)) {
      client.direcciones.push({
        id: row.direccion_id,
        direccion: row.direccion
      });
    }
    
    if (row.telefono_id && row.telefono && !client.telefonos.some(t => t.id === row.telefono_id)) {
      client.telefonos.push({
        id: row.telefono_id,
        telefono: row.telefono
      });
    }
  });
  
  return Array.from(clientMap.values());
};

async function getFullClientData(clientId) {
  try {
    const result = await pool.query(`
      SELECT 
        c.id,
        c.nombre,
        c.apellido,
        c.empresa,
        n.nit,
        d.id as direccion_id,
        d.direccion,
        t.id as telefono_id,
        t.telefono
      FROM clientes c
      LEFT JOIN nits n ON c.id_nit = n.id
      LEFT JOIN cliente_direcciones cd ON c.id = cd.id_cliente
      LEFT JOIN direcciones d ON cd.id_direccion = d.id
      LEFT JOIN cliente_telefonos ct ON c.id = ct.id_cliente
      LEFT JOIN telefonos t ON ct.id_telefono = t.id
      WHERE c.id = $1
      ORDER BY d.id, t.id
    `, [clientId]);
    
    if (result.rows.length === 0) return null;
    
    const clienteData = {
      id: result.rows[0].id,
      nombre: result.rows[0].nombre,
      apellido: result.rows[0].apellido,
      empresa: result.rows[0].empresa,
      nit: result.rows[0].nit,
      direcciones: [],
      telefonos: []
    };
    
    result.rows.forEach(row => {
      if (row.direccion_id && row.direccion && !clienteData.direcciones.some(d => d.id === row.direccion_id)) {
        clienteData.direcciones.push({
          id: row.direccion_id,
          direccion: row.direccion
        });
      }
      
      if (row.telefono_id && row.telefono && !clienteData.telefonos.some(t => t.id === row.telefono_id)) {
        clienteData.telefonos.push({
          id: row.telefono_id,
          telefono: row.telefono
        });
      }
    });
    
    return clienteData;
  } catch (err) {
    console.error('Error getting full client data:', err);
    throw err;
  }
}

// Obtener cuentas por cobrar de un cliente específico
router.get('/:id/cuentas-por-cobrar', auth, async (req, res) => {
  let client;
  
  try {
    const { id } = req.params;
    
    // Validar que el ID sea un número
    if (isNaN(id) || parseInt(id) <= 0) {
      return res.status(400).json({ error: 'ID de cliente inválido' });
    }
    
    client = await pool.connect();
    
    // Verificar que el cliente existe
    const clientCheck = await client.query('SELECT id FROM clientes WHERE id = $1', [id]);
    if (clientCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    console.log(`Checking pending accounts receivable for client ${id}`);
    
    // Query corregida para obtener el saldo pendiente real
    const query = `
      WITH ultimo_pago_por_pedido AS (
        SELECT 
          id_pedido,
          total_pedido as saldo_actual,
          ROW_NUMBER() OVER (PARTITION BY id_pedido ORDER BY fecha_de_pago DESC, id DESC) as rn
        FROM pagos_pedidos
      ),
      saldos_pedidos AS (
        SELECT 
          p.id,
          p.total as total_original,
          p.fecha,
          p.subtotal,
          COALESCE(pep.estado, 'Pendiente') as estado_pago,
          p.id_pedido_estado_pago,
          COALESCE(upp.saldo_actual, p.total) as saldo_pendiente
        FROM pedidos p
        LEFT JOIN pedidos_estado_pago pep ON p.id_pedido_estado_pago = pep.id
        LEFT JOIN ultimo_pago_por_pedido upp ON p.id = upp.id_pedido AND upp.rn = 1
        WHERE p.id_cliente = $1 
          AND (p.id_pedido_estado_pago = 1 OR p.id_pedido_estado_pago IS NULL)
      )
      SELECT *
      FROM saldos_pedidos
      WHERE saldo_pendiente > 0
      ORDER BY fecha DESC
    `;
    
    console.log('Executing corrected query for pending payments with real balance');
    console.log('Query:', query);
    
    const result = await client.query(query, [id]);
    
    console.log(`Found ${result.rows.length} pending pedidos for client ${id}`);
    
    // Si no hay resultados, verificar si el cliente tiene pedidos en general
    if (result.rows.length === 0) {
      const allPedidos = await client.query(
        'SELECT COUNT(*) as total FROM pedidos WHERE id_cliente = $1', 
        [id]
      );
      
      const totalPedidos = parseInt(allPedidos.rows[0].total);
      
      if (totalPedidos > 0) {
        console.log(`Client ${id} has ${totalPedidos} total pedidos but none are pending payment`);
        return res.status(200).json({
          message: 'El cliente no tiene pedidos pendientes de pago',
          count: 0,
          data: [],
          info: `El cliente tiene ${totalPedidos} pedidos en total, pero todos están pagados`
        });
      } else {
        console.log(`Client ${id} has no pedidos at all`);
        return res.status(200).json({
          message: 'El cliente no tiene pedidos registrados',
          count: 0,
          data: []
        });
      }
    }
    
    // Agregar información adicional a cada pedido
    const enhancedData = result.rows.map(pedido => ({
      ...pedido,
      total: pedido.total_original, // Mantener el total original para compatibilidad
      dias_pendiente: pedido.fecha ? Math.floor((new Date() - new Date(pedido.fecha)) / (1000 * 60 * 60 * 24)) : 0,
      estado_descripcion: pedido.id_pedido_estado_pago === 1 ? 'Pendiente de Pago' : 
                         pedido.id_pedido_estado_pago === null ? 'Sin Estado Definido' : 'Otro Estado'
    }));
    
    res.status(200).json({
      message: 'Cuentas por cobrar obtenidas correctamente',
      count: enhancedData.length,
      data: enhancedData,
      resumen: {
        total_pendiente: enhancedData.reduce((sum, pedido) => sum + parseFloat(pedido.saldo_pendiente || 0), 0),
        pedidos_count: enhancedData.length
      }
    });
    
  } catch (err) {
    console.error('Error al obtener cuentas por cobrar:', err);
    console.error('Error stack:', err.stack);
    
    res.status(500).json({ 
      error: 'Error en el servidor',
      details: err.message,
      errorCode: err.code
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// Endpoint para buscar clientes por nombre, empresa o NIT 
router.get('/buscar/:termino', auth, async (req, res) => {
  try {
    const { termino } = req.params;
    
    if (!termino || termino.trim() === '') {
      return res.status(400).json({ 
        error: 'El término de búsqueda no puede estar vacío' 
      });
    }
    
    const searchTerm = `%${termino.trim().toLowerCase()}%`;
    
    const result = await pool.query(`
      SELECT DISTINCT
        c.id,
        c.nombre,
        c.apellido,
        c.empresa,
        n.nit
      FROM clientes c
      LEFT JOIN nits n ON c.id_nit = n.id
      WHERE 
        LOWER(c.nombre) LIKE $1 OR 
        LOWER(c.apellido) LIKE $1 OR 
        LOWER(COALESCE(c.empresa, '')) LIKE $1 OR
        LOWER(COALESCE(n.nit, '')) LIKE $1
      ORDER BY c.nombre, c.apellido
    `, [searchTerm]);
    
    res.status(200).json({
      message: `Clientes encontrados para "${termino}"`,
      count: result.rows.length,
      data: result.rows
    });
  } catch (err) {
    console.error('Error al buscar clientes:', err);
    res.status(500).json({ 
      error: 'Error en el servidor',
      details: err.message 
    });
  }
});

// Endpoint para obtener todos los clientes con sus direcciones, teléfonos y NITs
router.get('/', auth, async (req, res) => {
  let client;
  
  try {
    client = await pool.connect();
    
    // First, let's check if the tables exist
    const tablesCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('clientes', 'nits', 'direcciones', 'telefonos', 'cliente_direcciones', 'cliente_telefonos')
      ORDER BY table_name;
    `);
    
    console.log('Available tables:', tablesCheck.rows.map(r => r.table_name));
    
    // Check clientes table structure
    const clientesStructure = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'clientes' 
      ORDER BY ordinal_position;
    `);
    
    console.log('Clientes table structure:', clientesStructure.rows);
    
    const result = await client.query(`
      SELECT 
        c.id,
        c.nombre,
        c.apellido,
        c.empresa,
        n.nit,
        d.id as direccion_id,
        d.direccion,
        t.id as telefono_id,
        t.telefono
      FROM clientes c
      LEFT JOIN nits n ON c.id_nit = n.id
      LEFT JOIN cliente_direcciones cd ON c.id = cd.id_cliente
      LEFT JOIN direcciones d ON cd.id_direccion = d.id
      LEFT JOIN cliente_telefonos ct ON c.id = ct.id_cliente
      LEFT JOIN telefonos t ON ct.id_telefono = t.id
      ORDER BY c.id, d.id, t.id
    `);
    
    console.log(`Found ${result.rows.length} rows`);
    
    if (result.rows.length === 0) {
      // If no data, return empty array
      return res.status(200).json({
        message: 'No hay clientes registrados',
        count: 0,
        data: []
      });
    }
    
    const clients = formatClientResponse(result.rows);
    
    res.status(200).json({
      message: 'Clientes obtenidos correctamente',
      count: clients.length,
      data: clients
    });
    
  } catch (err) {
    console.error('Error al obtener clientes:', err);
    console.error('Error stack:', err.stack);
    
    res.status(500).json({ 
      error: 'Error al consultar la base de datos',
      details: err.message,
      code: err.code || 'UNKNOWN_ERROR'
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// Endpoint para obtener un cliente específico por ID - CORREGIDO
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validar que el ID sea un número
    if (isNaN(id) || parseInt(id) <= 0) {
      return res.status(400).json({ error: 'ID de cliente inválido' });
    }
    
    const result = await pool.query(`
      SELECT 
        c.id,
        c.nombre,
        c.apellido,
        c.empresa,
        n.nit,
        d.id as direccion_id,
        d.direccion,
        t.id as telefono_id,
        t.telefono
      FROM clientes c
      LEFT JOIN nits n ON c.id_nit = n.id
      LEFT JOIN cliente_direcciones cd ON c.id = cd.id_cliente
      LEFT JOIN direcciones d ON cd.id_direccion = d.id
      LEFT JOIN cliente_telefonos ct ON c.id = ct.id_cliente
      LEFT JOIN telefonos t ON ct.id_telefono = t.id
      WHERE c.id = $1
      ORDER BY d.id, t.id
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
      nit: result.rows[0].nit,
      direcciones: [],
      telefonos: []
    };
    
    result.rows.forEach(row => {
      if (row.direccion_id && row.direccion && !clienteData.direcciones.find(d => d.id === row.direccion_id)) {
        clienteData.direcciones.push({
          id: row.direccion_id,
          direccion: row.direccion
        });
      }
      
      if (row.telefono_id && row.telefono && !clienteData.telefonos.find(t => t.id === row.telefono_id)) {
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
    res.status(500).json({ 
      error: 'Error en el servidor',
      details: err.message 
    });
  }
});

// Endpoint para validar NIT
router.post('/validar-nit', auth, async (req, res) => {
  try {
    const { nit } = req.body;
    
    if (!nit) {
      return res.status(400).json({ error: 'NIT requerido para validación' });
    }
    
    const isValid = validateGuatemalanNIT(nit);
    const formattedNIT = formatGuatemalanNIT(nit);
    
    res.status(200).json({
      valid: isValid,
      formatted: formattedNIT,
      message: isValid ? 'NIT válido' : 'NIT inválido'
    });
  } catch (err) {
    console.error('Error al validar NIT:', err);
    res.status(500).json({ 
      error: 'Error en el servidor',
      details: err.message 
    });
  }
});

// Crear un nuevo cliente con direcciones, teléfonos y NIT
router.post('/', auth, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { nombre, apellido, empresa, nit, direcciones, telefonos } = req.body;
    
    // Validaciones básicas
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
    
    // Validar NIT si se proporciona
    if (nit && nit.trim() !== '') {
      if (!validateGuatemalanNIT(nit)) {
        return res.status(400).json({ 
          error: 'El NIT proporcionado no es válido según el formato guatemalteco' 
        });
      }
    }
    
    await client.query('BEGIN');
    
    // Manejar NIT
    let nitId = null;
    if (nit && nit.trim() !== '') {
      nitId = await getOrCreateNIT(client, nit);
    }
    
    // Crear el cliente
    const clienteResult = await client.query(
      'INSERT INTO clientes (nombre, apellido, empresa, id_nit) VALUES ($1, $2, $3, $4) RETURNING *',
      [nombre.trim(), apellido.trim(), empresa?.trim() || null, nitId]
    );
    
    const clienteId = clienteResult.rows[0].id;
    
    // Insertar direcciones
    const direccionesInsertadas = [];
    let primeraDireccionId = null;
    
    for (const direccion of direcciones) {
      if (direccion && direccion.trim()) {
        const direccionTrimmed = direccion.trim();
        
        // Crear nueva dirección
        const direccionResult = await client.query(
          'INSERT INTO direcciones (direccion) VALUES ($1) RETURNING *',
          [direccionTrimmed]
        );
        
        const direccionId = direccionResult.rows[0].id;
        
        // Relacionar cliente con dirección
        await client.query(
          'INSERT INTO cliente_direcciones (id_cliente, id_direccion) VALUES ($1, $2)',
          [clienteId, direccionId]
        );
        
        direccionesInsertadas.push(direccionResult.rows[0]);
        
        // Guardar el ID de la primera dirección
        if (primeraDireccionId === null) {
          primeraDireccionId = direccionId;
        }
      }
    }
    
    // Insertar teléfonos
    const telefonosInsertados = [];
    let primerClienteTelefonoId = null;
    
    for (const telefono of telefonos) {
      if (telefono && telefono.trim()) {
        const telefonoTrimmed = telefono.trim();
        
        // Crear nuevo teléfono
        const telefonoResult = await client.query(
          'INSERT INTO telefonos (telefono) VALUES ($1) RETURNING *',
          [telefonoTrimmed]
        );
        
        const telefonoId = telefonoResult.rows[0].id;
        
        // Relacionar cliente con teléfono
        const clienteTelefonoResult = await client.query(
          'INSERT INTO cliente_telefonos (id_cliente, id_telefono) VALUES ($1, $2) RETURNING *',
          [clienteId, telefonoId]
        );
        
        telefonosInsertados.push(telefonoResult.rows[0]);
        
        // Guardar el ID del primer cliente_telefono
        if (primerClienteTelefonoId === null) {
          primerClienteTelefonoId = clienteTelefonoResult.rows[0].id;
        }
      }
    }
    
    // Actualizar el cliente con las referencias (si existen estos campos)
    try {
      await client.query(
        'UPDATE clientes SET id_direcciones = $1, id_cliente_telefono = $2 WHERE id = $3',
        [primeraDireccionId, primerClienteTelefonoId, clienteId]
      );
    } catch (updateErr) {
      // Si los campos no existen, continuar sin error
      console.log('Warning: Could not update reference fields, they might not exist in the schema');
    }
    
    await client.query('COMMIT');
    
    // Obtener el cliente completo creado
    const clienteCompleto = await getFullClientData(clienteId);
    
    res.status(201).json({
      message: 'Cliente creado correctamente',
      data: clienteCompleto
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

// Actualizar un cliente existente con NIT
router.put('/:id', auth, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    const { nombre, apellido, empresa, nit, direcciones, telefonos } = req.body;
    
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
    
    // Validar NIT si se proporciona
    if (nit && nit.trim() !== '') {
      if (!validateGuatemalanNIT(nit)) {
        return res.status(400).json({ 
          error: 'El NIT proporcionado no es válido según el formato guatemalteco' 
        });
      }
    }
    
    await client.query('BEGIN');
    
    // Manejar NIT
    let nitId = null;
    if (nit && nit.trim() !== '') {
      nitId = await getOrCreateNIT(client, nit);
    }
    
    // Actualizar datos del cliente
    const clienteResult = await client.query(
      'UPDATE clientes SET nombre = $1, apellido = $2, empresa = $3, id_nit = $4 WHERE id = $5 RETURNING *',
      [nombre, apellido, empresa || null, nitId, id]
    );
    
    // Manejar direcciones
    const currentDirecciones = await client.query(
      'SELECT d.id, d.direccion FROM direcciones d JOIN cliente_direcciones cd ON d.id = cd.id_direccion WHERE cd.id_cliente = $1',
      [id]
    );
    
    let primeraDireccionId = null;
    
    // Actualizar las direcciones existentes o agregar nuevas
    for (const direccion of direcciones) {
      if (direccion.id) {
        // Actualizar dirección existente
        await client.query(
          'UPDATE direcciones SET direccion = $1 WHERE id = $2',
          [direccion.direccion.trim(), direccion.id]
        );
        
        // Marcar como primera dirección si es la primera en el array
        if (primeraDireccionId === null) {
          primeraDireccionId = direccion.id;
        }
      } else if (direccion.direccion?.trim()) {
        const direccionTrimmed = direccion.direccion.trim();
        
        // Verificar si la dirección ya existe
        const existingDireccionResult = await client.query(
          'SELECT * FROM direcciones WHERE LOWER(direccion) = LOWER($1)',
          [direccionTrimmed]
        );
        
        let direccionId;
        
        if (existingDireccionResult.rows.length > 0) {
          // Usar la dirección existente
          direccionId = existingDireccionResult.rows[0].id;
        } else {
          // Insertar nueva dirección
          const direccionResult = await client.query(
            'INSERT INTO direcciones (direccion) VALUES ($1) RETURNING *',
            [direccionTrimmed]
          );
          direccionId = direccionResult.rows[0].id;
        }
        
        // Verificar si la relación ya existe
        const existingRelationResult = await client.query(
          'SELECT * FROM cliente_direcciones WHERE id_cliente = $1 AND id_direccion = $2',
          [id, direccionId]
        );
        
        if (existingRelationResult.rows.length === 0) {
          await client.query(
            'INSERT INTO cliente_direcciones (id_cliente, id_direccion) VALUES ($1, $2)',
            [id, direccionId]
          );
        }
        
        // Marcar como primera dirección si es la primera en el array
        if (primeraDireccionId === null) {
          primeraDireccionId = direccionId;
        }
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
    
    let primerClienteTelefonoId = null;
    
    for (const telefono of telefonos) {
      if (telefono.id) {
        await client.query(
          'UPDATE telefonos SET telefono = $1 WHERE id = $2',
          [telefono.telefono.trim(), telefono.id]
        );
        
        // Obtener el cliente_telefono ID para este teléfono
        if (primerClienteTelefonoId === null) {
          const ctResult = await client.query(
            'SELECT id FROM cliente_telefonos WHERE id_cliente = $1 AND id_telefono = $2',
            [id, telefono.id]
          );
          if (ctResult.rows.length > 0) {
            primerClienteTelefonoId = ctResult.rows[0].id;
          }
        }
      } else if (telefono.telefono?.trim()) {
        const telefonoResult = await client.query(
          'INSERT INTO telefonos (telefono) VALUES ($1) RETURNING *',
          [telefono.telefono.trim()]
        );
        
        const clienteTelefonoResult = await client.query(
          'INSERT INTO cliente_telefonos (id_cliente, id_telefono) VALUES ($1, $2) RETURNING *',
          [id, telefonoResult.rows[0].id]
        );
        
        // Marcar como primer cliente_telefono si es el primero en el array
        if (primerClienteTelefonoId === null) {
          primerClienteTelefonoId = clienteTelefonoResult.rows[0].id;
        }
      }
    }
    
    const telefonosActualesIds = telefonos.filter(t => t.id).map(t => t.id);
    for (const tel of currentTelefonos.rows) {
      if (!telefonosActualesIds.includes(tel.id)) {
        await client.query('DELETE FROM cliente_telefonos WHERE id_cliente = $1 AND id_telefono = $2', [id, tel.id]);
        await client.query('DELETE FROM telefonos WHERE id = $1', [tel.id]);
      }
    }
    
    // Actualizar las referencias principales en la tabla clientes
    await client.query(
      'UPDATE clientes SET id_direcciones = $1, id_cliente_telefono = $2 WHERE id = $3',
      [primeraDireccionId, primerClienteTelefonoId, id]
    );
    
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
router.delete('/:id', auth, async (req, res) => {
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

// Endpoint para obtener solo direcciones de un cliente 
router.get('/:id/direcciones', auth, async (req, res) => {
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
router.get('/:id/telefonos', auth, async (req, res) => {
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