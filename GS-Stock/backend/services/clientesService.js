// Servicio de Clientes: lógica de negocio, validaciones, orquestación de
// transacciones y armado de los datos. No conoce de Express (req/res); habla
// con el repositorio y lanza ServiceError para los casos de negocio (400/404).
const pool = require('../db');
const repo = require('../repositories/clientesRepository');
const ServiceError = require('../utils/ServiceError');
const { validateGuatemalanNIT, formatGuatemalanNIT } = require('../utils/nitGuatemala');

// ─── Helpers de shaping ─────────────────────────────────────────────────

// Convierte filas planas (con joins de direcciones/teléfonos) en una lista de
// clientes con sus direcciones y teléfonos anidados y deduplicados.
function formatClientList(rows) {
  const clientMap = new Map();

  rows.forEach((row) => {
    if (!clientMap.has(row.id)) {
      clientMap.set(row.id, {
        id: row.id,
        nombre: row.nombre,
        apellido: row.apellido,
        empresa: row.empresa,
        nit: row.nit || null,
        direcciones: [],
        telefonos: [],
      });
    }

    const cliente = clientMap.get(row.id);

    if (
      row.direccion_id &&
      row.direccion &&
      !cliente.direcciones.some((d) => d.id === row.direccion_id)
    ) {
      cliente.direcciones.push({ id: row.direccion_id, direccion: row.direccion });
    }

    if (
      row.telefono_id &&
      row.telefono &&
      !cliente.telefonos.some((t) => t.id === row.telefono_id)
    ) {
      cliente.telefonos.push({ id: row.telefono_id, telefono: row.telefono });
    }
  });

  return Array.from(clientMap.values());
}

// Igual que formatClientList pero para un único cliente (devuelve objeto o null).
function buildClienteDetalle(rows) {
  if (rows.length === 0) return null;
  return formatClientList(rows)[0];
}

// Devuelve el cliente completo (con direcciones/teléfonos) por id.
async function getFullClientData(clienteId, executor = pool) {
  const rows = await repo.findDetailRowsById(clienteId, executor);
  return buildClienteDetalle(rows);
}

// Crea (o reutiliza) el NIT y devuelve su id, o null si no se proporcionó.
async function getOrCreateNit(client, nitValue) {
  if (!nitValue || nitValue.trim() === '') {
    return null;
  }

  const nitFormatted = formatGuatemalanNIT(nitValue.trim());

  const existingId = await repo.findNitId(nitFormatted, client);
  if (existingId) {
    return existingId;
  }

  return repo.insertNit(nitFormatted, client);
}

// ─── Casos de uso ───────────────────────────────────────────────────────

async function getCuentasPorCobrar(id) {
  if (isNaN(id) || parseInt(id) <= 0) {
    throw new ServiceError(400, { error: 'ID de cliente inválido' });
  }

  const cliente = await repo.findById(id);
  if (!cliente) {
    throw new ServiceError(404, { error: 'Cliente no encontrado' });
  }

  const pedidos = await repo.findCuentasPorCobrar(id);

  if (pedidos.length === 0) {
    return { hasPendingOrders: false };
  }

  const rawPromedio = await repo.findPromedioDiasPagados(id);
  const promedioDiasPagados =
    rawPromedio != null ? Math.floor(parseFloat(rawPromedio)) : null;

  const enhancedData = pedidos.map((pedido) => ({
    ...pedido,
    dias_pendiente: pedido.dias_desde_creacion,
  }));

  return {
    hasPendingOrders: true,
    data: enhancedData,
    promedioDiasPagados,
    pedidoMasAntiguo: enhancedData.length > 0 ? enhancedData[0] : null,
    resumen: {
      total_pendiente: enhancedData.reduce(
        (sum, p) => sum + parseFloat(p.saldo_pendiente || 0),
        0
      ),
      total_general: enhancedData.reduce(
        (sum, p) => sum + parseFloat(p.total_original || 0),
        0
      ),
      total_cancelado: enhancedData.reduce(
        (sum, p) => sum + parseFloat(p.total_cancelado || 0),
        0
      ),
      pedidos_count: enhancedData.length,
    },
  };
}

async function searchClientes(termino) {
  if (!termino || termino.trim() === '') {
    throw new ServiceError(400, { error: 'El término de búsqueda no puede estar vacío' });
  }

  const searchTerm = `%${termino.trim().toLowerCase()}%`;
  return repo.search(searchTerm);
}

// Devuelve { clients, summaryOk }. Si el cálculo de resúmenes falla, devuelve
// los clientes sin enriquecer (igual que el comportamiento original).
async function listClientes() {
  const rows = await repo.findAllDetailRows();

  if (rows.length === 0) {
    return { clients: [], summaryOk: true };
  }

  const clients = formatClientList(rows);

  try {
    const summaryRows = await repo.findSummary();
    const summaryMap = new Map();
    summaryRows.forEach((r) => summaryMap.set(r.id, r));

    const clientsWithSummary = clients.map((cl) => {
      const s = summaryMap.get(cl.id) || {};
      return Object.assign({}, cl, {
        oldest_pending_days:
          s.oldest_pending_days !== null && s.oldest_pending_days !== undefined
            ? parseInt(s.oldest_pending_days)
            : null,
        total_cancelado:
          s.total_cancelado !== null && s.total_cancelado !== undefined
            ? parseFloat(s.total_cancelado)
            : 0,
        avg_days_to_pay:
          s.avg_days_to_pay !== null && s.avg_days_to_pay !== undefined
            ? parseInt(s.avg_days_to_pay)
            : null,
        pedidos_activos:
          s.pedidos_activos !== null && s.pedidos_activos !== undefined
            ? parseInt(s.pedidos_activos)
            : 0,
      });
    });

    return { clients: clientsWithSummary, summaryOk: true };
  } catch (summaryErr) {
    console.error('Error obteniendo resúmenes de clientes:', summaryErr);
    return { clients, summaryOk: false };
  }
}

async function getClienteById(id) {
  if (isNaN(id) || parseInt(id) <= 0) {
    throw new ServiceError(400, { error: 'ID de cliente inválido' });
  }

  const rows = await repo.findDetailRowsById(id);
  if (rows.length === 0) {
    throw new ServiceError(404, { error: 'Cliente no encontrado' });
  }

  return buildClienteDetalle(rows);
}

function validarNit(nit) {
  if (!nit) {
    throw new ServiceError(400, { error: 'NIT requerido para validación' });
  }

  const validation = validateGuatemalanNIT(nit);
  const formattedNIT = formatGuatemalanNIT(nit);

  return {
    valid: validation,
    formatted: formattedNIT,
    message: validation ? 'NIT válido' : 'NIT inválido',
  };
}

async function createCliente(body) {
  const { nombre, apellido, empresa, nit, direcciones, telefonos } = body;

  if (!nombre || !apellido) {
    throw new ServiceError(400, { error: 'Los campos nombre y apellido son obligatorios' });
  }
  if (!direcciones || !Array.isArray(direcciones) || direcciones.length === 0) {
    throw new ServiceError(400, { error: 'Debe proporcionar al menos una dirección' });
  }
  if (!telefonos || !Array.isArray(telefonos) || telefonos.length === 0) {
    throw new ServiceError(400, { error: 'Debe proporcionar al menos un teléfono' });
  }
  if (nit && nit.trim() !== '' && !validateGuatemalanNIT(nit).valid) {
    throw new ServiceError(400, {
      error: 'El NIT proporcionado no es válido según el formato guatemalteco',
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let nitId = null;
    if (nit && nit.trim() !== '') {
      nitId = await getOrCreateNit(client, nit);
    }

    const cliente = await repo.insertCliente(
      {
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        empresa: empresa?.trim() || null,
        nitId,
      },
      client
    );
    const clienteId = cliente.id;

    let primeraDireccionId = null;
    for (const direccion of direcciones) {
      if (direccion && direccion.trim()) {
        const nuevaDireccion = await repo.insertDireccion(direccion.trim(), client);
        await repo.linkClienteDireccion(clienteId, nuevaDireccion.id, client);
        if (primeraDireccionId === null) {
          primeraDireccionId = nuevaDireccion.id;
        }
      }
    }

    let primerClienteTelefonoId = null;
    for (const telefono of telefonos) {
      if (telefono && telefono.trim()) {
        const nuevoTelefono = await repo.insertTelefono(telefono.trim(), client);
        const clienteTelefono = await repo.linkClienteTelefono(
          clienteId,
          nuevoTelefono.id,
          client
        );
        if (primerClienteTelefonoId === null) {
          primerClienteTelefonoId = clienteTelefono.id;
        }
      }
    }

    // Los campos de referencia pueden no existir en el esquema: se ignora el error.
    try {
      await repo.updateClienteRefs(clienteId, primeraDireccionId, primerClienteTelefonoId, client);
    } catch {
      console.log('Warning: no se pudieron actualizar los campos de referencia del cliente');
    }

    await client.query('COMMIT');

    return getFullClientData(clienteId);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function updateCliente(id, body) {
  const { nombre, apellido, empresa, nit, direcciones, telefonos } = body;

  if (!nombre || !apellido) {
    throw new ServiceError(400, { error: 'Los campos nombre y apellido son obligatorios' });
  }

  const existente = await repo.findById(id);
  if (!existente) {
    throw new ServiceError(404, { error: 'Cliente no encontrado' });
  }

  if (nit && nit.trim() !== '' && !validateGuatemalanNIT(nit).valid) {
    throw new ServiceError(400, {
      error: 'El NIT proporcionado no es válido según el formato guatemalteco',
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let nitId = null;
    if (nit && nit.trim() !== '') {
      nitId = await getOrCreateNit(client, nit);
    }

    await repo.updateCliente(id, { nombre, apellido, empresa: empresa || null, nitId }, client);

    const currentDirecciones = await repo.findDireccionesConTextoByCliente(id, client);

    let primeraDireccionId = null;
    for (const direccion of direcciones) {
      if (direccion.id) {
        await repo.updateDireccion(direccion.id, direccion.direccion.trim(), client);
        if (primeraDireccionId === null) {
          primeraDireccionId = direccion.id;
        }
      } else if (direccion.direccion?.trim()) {
        const direccionTrimmed = direccion.direccion.trim();
        const existing = await repo.findDireccionByText(direccionTrimmed, client);

        let direccionId;
        if (existing) {
          direccionId = existing.id;
        } else {
          const nueva = await repo.insertDireccion(direccionTrimmed, client);
          direccionId = nueva.id;
        }

        const yaRelacionada = await repo.existsClienteDireccion(id, direccionId, client);
        if (!yaRelacionada) {
          await repo.linkClienteDireccion(id, direccionId, client);
        }

        if (primeraDireccionId === null) {
          primeraDireccionId = direccionId;
        }
      }
    }

    const direccionesActualesIds = direcciones.filter((d) => d.id).map((d) => d.id);
    for (const dir of currentDirecciones) {
      if (!direccionesActualesIds.includes(dir.id)) {
        await repo.unlinkClienteDireccion(id, dir.id, client);
        await repo.deleteDireccion(dir.id, client);
      }
    }

    const currentTelefonos = await repo.findTelefonosConTextoByCliente(id, client);

    let primerClienteTelefonoId = null;
    for (const telefono of telefonos) {
      if (telefono.id) {
        await repo.updateTelefono(telefono.id, telefono.telefono.trim(), client);
        if (primerClienteTelefonoId === null) {
          const ctId = await repo.findClienteTelefonoId(id, telefono.id, client);
          if (ctId !== undefined) {
            primerClienteTelefonoId = ctId;
          }
        }
      } else if (telefono.telefono?.trim()) {
        const nuevoTelefono = await repo.insertTelefono(telefono.telefono.trim(), client);
        const clienteTelefono = await repo.linkClienteTelefono(id, nuevoTelefono.id, client);
        if (primerClienteTelefonoId === null) {
          primerClienteTelefonoId = clienteTelefono.id;
        }
      }
    }

    const telefonosActualesIds = telefonos.filter((t) => t.id).map((t) => t.id);
    for (const tel of currentTelefonos) {
      if (!telefonosActualesIds.includes(tel.id)) {
        await repo.unlinkClienteTelefono(id, tel.id, client);
        await repo.deleteTelefono(tel.id, client);
      }
    }

    await repo.updateClienteRefs(id, primeraDireccionId, primerClienteTelefonoId, client);

    await client.query('COMMIT');

    return getFullClientData(id);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function deleteCliente(id) {
  const existente = await repo.findById(id);
  if (!existente) {
    throw new ServiceError(404, { error: 'Cliente no encontrado' });
  }

  const pedidosCount = await repo.countPedidosByCliente(id);
  if (pedidosCount > 0) {
    throw new ServiceError(400, {
      error: 'No se puede eliminar el cliente porque tiene pedidos asociados',
      details: `El cliente tiene ${pedidosCount} pedidos registrados`,
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await repo.clearClienteTelefonoRef(id, client);

    const direccionesIds = await repo.findDireccionIdsByCliente(id, client);
    const telefonosIds = await repo.findTelefonoIdsByCliente(id, client);

    await repo.deleteAllClienteDirecciones(id, client);
    await repo.deleteAllClienteTelefonos(id, client);

    for (const direccion of direccionesIds) {
      await repo.deleteDireccion(direccion.id_direccion, client);
    }
    for (const telefono of telefonosIds) {
      await repo.deleteTelefono(telefono.id_telefono, client);
    }

    const clienteEliminado = await repo.deleteCliente(id, client);

    await client.query('COMMIT');

    return {
      clienteEliminado,
      direccionesEliminadas: direccionesIds.length,
      telefonosEliminados: telefonosIds.length,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function getDirecciones(id) {
  return repo.findDireccionesByCliente(id);
}

async function getTelefonos(id) {
  return repo.findTelefonosByCliente(id);
}

module.exports = {
  getCuentasPorCobrar,
  searchClientes,
  listClientes,
  getClienteById,
  validarNit,
  createCliente,
  updateCliente,
  deleteCliente,
  getDirecciones,
  getTelefonos,
};
