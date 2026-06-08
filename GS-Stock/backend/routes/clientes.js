const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

const validateGuatemalanNIT = (nit) => {
  if (!nit) return { valid: true, message: '' };
  
  const nitClean = nit.replace(/[\s-]/g, '').toUpperCase();
  
  if (nitClean === 'CF') {
    return { 
      valid: true, 
      message: 'Consumidor Final válido' 
    };
  }
  
  // Validar que sea alfanumérico (solo letras y números)
  if (!/^[A-Z0-9]{1,20}$/.test(nitClean)) {
    return { 
      valid: false, 
      message: 'El NIT debe ser alfanumérico (letras y números), o "CF" para Consumidor Final' 
    };
  }
  
  // Si es solo dígitos, realizar validación de dígito verificador
  if (/^[0-9]{8,9}$/.test(nitClean)) {
    const nitPadded = nitClean.length === 8 ? '0' + nitClean : nitClean;
    const nitDigits = nitPadded.substring(0, 8);
    const checkDigit = parseInt(nitPadded.substring(8, 9));
    
    let sum = 0;
    let multiplier = 2;
    
    for (let i = 7; i >= 0; i--) {
      sum += parseInt(nitDigits[i]) * multiplier;
      multiplier++;
    }
    
    let calculatedDigit = 11 - (sum % 11);
    
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
  }
  
  return { 
    valid: true, 
    message: 'NIT válido' 
  };
};

const formatGuatemalanNIT = (nit) => {
  if (!nit) return '';
  
  const nitClean = nit.replace(/[\s-]/g, '').toUpperCase();
  
  if (nitClean === 'CF') {
    return 'CF';
  }
  
  // Para NITs alfanuméricos puros (no numéricos), retornar como está
  if (!/^[0-9]+$/.test(nitClean)) {
    return nitClean;
  }
  
  // Para NITs numéricos, aplicar formato con guión
  if (nitClean.length === 8) {
    return `${nitClean.substring(0, 7)}-${nitClean.substring(7)}`;
  } else if (nitClean.length === 9) {
    return `${nitClean.substring(0, 8)}-${nitClean.substring(8)}`;
  }
  
  return nitClean;
};

const getOrCreateNIT = async (client, nitValue) => {
  if (!nitValue || nitValue.trim() === '') {
    return null;
  }
  
  const nitFormatted = formatGuatemalanNIT(nitValue.trim());
  
  try {
    const existingNIT = await client.query(
      'SELECT id FROM nits WHERE nit = $1',
      [nitFormatted]
    );
    
    if (existingNIT.rows.length > 0) {
      return existingNIT.rows[0].id;
    }
    
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

router.get('/:id/cuentas-por-cobrar', auth, async (req, res) => {
  let client;
  
  try {
    const { id } = req.params;
    
    if (isNaN(id) || parseInt(id) <= 0) {
      return res.status(400).json({ error: 'ID de cliente inválido' });
    }
    
    client = await pool.connect();
    
    const clientCheck = await client.query('SELECT id FROM clientes WHERE id = $1', [id]);
    if (clientCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    console.log(`Checking pending accounts receivable for client ${id}`);
    
    const query = `
      WITH pagos_por_pedido AS (
        SELECT 
          id_pedido,
          COALESCE(SUM(monto_pagado), 0) as total_pagado
        FROM pagos_pedidos
        GROUP BY id_pedido
      ),
      pedidos_info AS (
        SELECT 
          p.id,
          p.total as total_original,
          p.fecha,
          p.subtotal,
          COALESCE(pep.estado, 'Pendiente') as estado_pago,
          p.id_pedido_estado_pago,
          COALESCE(ppp.total_pagado, 0) as total_cancelado,
          (p.total - COALESCE(ppp.total_pagado, 0)) as saldo_pendiente,
          FLOOR(EXTRACT(epoch FROM (NOW() - p.fecha)) / 86400) as dias_desde_creacion
        FROM pedidos p
        LEFT JOIN pedidos_estado_pago pep ON p.id_pedido_estado_pago = pep.id
        LEFT JOIN pagos_por_pedido ppp ON p.id = ppp.id_pedido
        WHERE p.id_cliente = $1
      )
      SELECT *
      FROM pedidos_info
      WHERE id_pedido_estado_pago = 1
      ORDER BY fecha ASC
    `;
    
    console.log('Executing query for pending payments');
    
    const result = await client.query(query, [id]);
    
    console.log(`Found ${result.rows.length} pending pedidos for client ${id}`);
    
    if (result.rows.length === 0) {
      return res.status(200).json({
        message: 'El cliente no tiene pedidos pendientes de pago',
        count: 0,
        data: [],
        hasPendingOrders: false
      });
    }
    
    // Obtener el promedio de días para pedidos PAGADOS (para colorear ID del cliente)
    const promedioQuery = `
      SELECT 
        AVG(FLOOR(EXTRACT(epoch FROM (pp.fecha_de_pago - p.fecha)) / 86400)) as promedio_dias_pagados
      FROM pedidos p
      INNER JOIN pagos_pedidos pp ON p.id = pp.id_pedido
      WHERE p.id_cliente = $1 
        AND p.id_pedido_estado_pago = 2
    `;
    
    const promedioResult = await client.query(promedioQuery, [id]);
    const promedioDiasPagados = promedioResult.rows[0]?.promedio_dias_pagados 
      ? Math.floor(parseFloat(promedioResult.rows[0].promedio_dias_pagados))
      : null;
    
    const enhancedData = result.rows.map(pedido => ({
      ...pedido,
      dias_pendiente: pedido.dias_desde_creacion
    }));
    
    res.status(200).json({
      message: 'Cuentas por cobrar obtenidas correctamente',
      count: enhancedData.length,
      data: enhancedData,
      promedioDiasPagados: promedioDiasPagados,
      pedidoMasAntiguo: enhancedData.length > 0 ? enhancedData[0] : null,
      resumen: {
        total_pendiente: enhancedData.reduce((sum, pedido) => sum + parseFloat(pedido.saldo_pendiente || 0), 0),
        total_general: enhancedData.reduce((sum, pedido) => sum + parseFloat(pedido.total_original || 0), 0),
        total_cancelado: enhancedData.reduce((sum, pedido) => sum + parseFloat(pedido.total_cancelado || 0), 0),
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

router.get('/', auth, async (req, res) => {
  let client;
  
  try {
    client = await pool.connect();
    
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
      return res.status(200).json({
        message: 'No hay clientes registrados',
        count: 0,
        data: []
      });
    }
    
    const clients = formatClientResponse(result.rows);
    
    try {
      const summaryQuery = `
        WITH pagos_por_pedido AS (
          SELECT 
            id_pedido,
            COALESCE(SUM(monto_pagado), 0) as total_pagado
          FROM pagos_pedidos
          GROUP BY id_pedido
        ),
        pedidos_con_saldo AS (
          SELECT 
            p.id,
            p.id_cliente,
            p.fecha,
            p.total,
            p.id_pedido_estado_pago,
            (p.total - COALESCE(ppp.total_pagado, 0)) as saldo_pendiente,
            CASE 
              WHEN (p.total - COALESCE(ppp.total_pagado, 0)) > 0 
              THEN FLOOR(EXTRACT(epoch FROM (NOW() - p.fecha)) / 86400)
              ELSE NULL
            END as dias_pendiente
          FROM pedidos p
          LEFT JOIN pagos_por_pedido ppp ON p.id = ppp.id_pedido
        )
        SELECT 
          c.id,
          (SELECT MAX(dias_pendiente)
           FROM pedidos_con_saldo pcs 
           WHERE pcs.id_cliente = c.id 
           AND pcs.saldo_pendiente > 0) AS oldest_pending_days,
          (SELECT COALESCE(SUM(pp.monto_pagado), 0) 
           FROM pagos_pedidos pp 
           JOIN pedidos p2 ON pp.id_pedido = p2.id 
           WHERE p2.id_cliente = c.id) AS total_cancelado,
          (SELECT FLOOR(AVG(EXTRACT(epoch FROM (NOW() - p3.fecha)) / 86400))
           FROM pedidos_con_saldo p3
           WHERE p3.id_cliente = c.id 
           AND p3.id_pedido_estado_pago = 2) AS avg_days_to_pay,
          (SELECT COUNT(*)
           FROM pedidos p4
           WHERE p4.id_cliente = c.id
           AND p4.id_pedido_estado_pago = 1) AS pedidos_activos
        FROM clientes c
      `;

      const summaryResult = await client.query(summaryQuery);
      const summaryMap = new Map();
      summaryResult.rows.forEach(r => {
        summaryMap.set(r.id, r);
      });

      const clientsWithSummary = clients.map(cl => {
        const s = summaryMap.get(cl.id) || {};
        return Object.assign({}, cl, {
          oldest_pending_days: s.oldest_pending_days !== null ? parseInt(s.oldest_pending_days) : null,
          total_cancelado: s.total_cancelado !== null ? parseFloat(s.total_cancelado) : 0,
          avg_days_to_pay: s.avg_days_to_pay !== null ? parseInt(s.avg_days_to_pay) : null,
          pedidos_activos: s.pedidos_activos !== null ? parseInt(s.pedidos_activos) : 0
        });
      });

      console.log('Clientes loaded:', clientsWithSummary.length);

      res.status(200).json({
        message: 'Clientes obtenidos correctamente',
        count: clientsWithSummary.length,
        data: clientsWithSummary
      });
    } catch (summaryErr) {
      console.error('Error obteniendo resúmenes de clientes:', summaryErr);
      res.status(200).json({
        message: 'Clientes obtenidos correctamente (sin resúmenes)',
        count: clients.length,
        data: clients
      });
    }
    
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

router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
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

router.post('/', auth, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { nombre, apellido, empresa, nit, direcciones, telefonos } = req.body;
    
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
    
    if (nit && nit.trim() !== '') {
      if (!validateGuatemalanNIT(nit).valid) {
        return res.status(400).json({ 
          error: 'El NIT proporcionado no es válido según el formato guatemalteco' 
        });
      }
    }
    
    await client.query('BEGIN');
    
    let nitId = null;
    if (nit && nit.trim() !== '') {
      nitId = await getOrCreateNIT(client, nit);
    }
    
    const clienteResult = await client.query(
      'INSERT INTO clientes (nombre, apellido, empresa, id_nit) VALUES ($1, $2, $3, $4) RETURNING *',
      [nombre.trim(), apellido.trim(), empresa?.trim() || null, nitId]
    );
    
    const clienteId = clienteResult.rows[0].id;
    
    const direccionesInsertadas = [];
    let primeraDireccionId = null;
    
    for (const direccion of direcciones) {
      if (direccion && direccion.trim()) {
        const direccionTrimmed = direccion.trim();
        
        const direccionResult = await client.query(
          'INSERT INTO direcciones (direccion) VALUES ($1) RETURNING *',
          [direccionTrimmed]
        );
        
        const direccionId = direccionResult.rows[0].id;
        
        await client.query(
          'INSERT INTO cliente_direcciones (id_cliente, id_direccion) VALUES ($1, $2)',
          [clienteId, direccionId]
        );
        
        direccionesInsertadas.push(direccionResult.rows[0]);
        
        if (primeraDireccionId === null) {
          primeraDireccionId = direccionId;
        }
      }
    }
    
    const telefonosInsertados = [];
    let primerClienteTelefonoId = null;
    
    for (const telefono of telefonos) {
      if (telefono && telefono.trim()) {
        const telefonoTrimmed = telefono.trim();
        
        const telefonoResult = await client.query(
          'INSERT INTO telefonos (telefono) VALUES ($1) RETURNING *',
          [telefonoTrimmed]
        );
        
        const telefonoId = telefonoResult.rows[0].id;
        
        const clienteTelefonoResult = await client.query(
          'INSERT INTO cliente_telefonos (id_cliente, id_telefono) VALUES ($1, $2) RETURNING *',
          [clienteId, telefonoId]
        );
        
        telefonosInsertados.push(telefonoResult.rows[0]);
        
        if (primerClienteTelefonoId === null) {
          primerClienteTelefonoId = clienteTelefonoResult.rows[0].id;
        }
      }
    }
    
    try {
      await client.query(
        'UPDATE clientes SET id_direcciones = $1, id_cliente_telefono = $2 WHERE id = $3',
        [primeraDireccionId, primerClienteTelefonoId, clienteId]
      );
    } catch (updateErr) {
      console.log('Warning: Could not update reference fields, they might not exist in the schema');
    }
    
    await client.query('COMMIT');
    
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

router.put('/:id', auth, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    const { nombre, apellido, empresa, nit, direcciones, telefonos } = req.body;
    
    if (!nombre || !apellido) {
      return res.status(400).json({ 
        error: 'Los campos nombre y apellido son obligatorios' 
      });
    }
    
    const checkResult = await client.query(
      'SELECT * FROM clientes WHERE id = $1',
      [id]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    
    if (nit && nit.trim() !== '') {
      if (!validateGuatemalanNIT(nit).valid) {
        return res.status(400).json({ 
          error: 'El NIT proporcionado no es válido según el formato guatemalteco' 
        });
      }
    }
    
    await client.query('BEGIN');
    
    let nitId = null;
    if (nit && nit.trim() !== '') {
      nitId = await getOrCreateNIT(client, nit);
    }
    
    const clienteResult = await client.query(
      'UPDATE clientes SET nombre = $1, apellido = $2, empresa = $3, id_nit = $4 WHERE id = $5 RETURNING *',
      [nombre, apellido, empresa || null, nitId, id]
    );
    
    const currentDirecciones = await client.query(
      'SELECT d.id, d.direccion FROM direcciones d JOIN cliente_direcciones cd ON d.id = cd.id_direccion WHERE cd.id_cliente = $1',
      [id]
    );
    
    let primeraDireccionId = null;
    
    for (const direccion of direcciones) {
      if (direccion.id) {
        await client.query(
          'UPDATE direcciones SET direccion = $1 WHERE id = $2',
          [direccion.direccion.trim(), direccion.id]
        );
        
        if (primeraDireccionId === null) {
          primeraDireccionId = direccion.id;
        }
      } else if (direccion.direccion?.trim()) {
        const direccionTrimmed = direccion.direccion.trim();
        
        const existingDireccionResult = await client.query(
          'SELECT * FROM direcciones WHERE LOWER(direccion) = LOWER($1)',
          [direccionTrimmed]
        );
        
        let direccionId;
        
        if (existingDireccionResult.rows.length > 0) {
          direccionId = existingDireccionResult.rows[0].id;
        } else {
          const direccionResult = await client.query(
            'INSERT INTO direcciones (direccion) VALUES ($1) RETURNING *',
            [direccionTrimmed]
          );
          direccionId = direccionResult.rows[0].id;
        }
        
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
        
        if (primeraDireccionId === null) {
          primeraDireccionId = direccionId;
        }
      }
    }
    
    const direccionesActualesIds = direcciones.filter(d => d.id).map(d => d.id);
    for (const dir of currentDirecciones.rows) {
      if (!direccionesActualesIds.includes(dir.id)) {
        await client.query('DELETE FROM cliente_direcciones WHERE id_cliente = $1 AND id_direccion = $2', [id, dir.id]);
        await client.query('DELETE FROM direcciones WHERE id = $1', [dir.id]);
      }
    }
    
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
    
    await client.query(
      'UPDATE clientes SET id_direcciones = $1, id_cliente_telefono = $2 WHERE id = $3',
      [primeraDireccionId, primerClienteTelefonoId, id]
    );
    
    await client.query('COMMIT');
    
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

router.delete('/:id', auth, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    
    const checkResult = await client.query(
      'SELECT * FROM clientes WHERE id = $1',
      [id]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

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