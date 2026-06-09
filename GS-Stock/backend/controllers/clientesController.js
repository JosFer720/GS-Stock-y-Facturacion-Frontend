// Controlador de Clientes: capa HTTP. Lee req, delega en el servicio y arma la
// respuesta. Traduce los ServiceError (negocio) a su status/cuerpo, y cualquier
// otro error a un 500 con el mismo formato que tenía cada endpoint original.
const service = require('../services/clientesService');
const ServiceError = require('../utils/ServiceError');

// Responde un ServiceError; devuelve true si lo manejó.
function handleServiceError(err, res) {
  if (err instanceof ServiceError) {
    res.status(err.status).json(err.body);
    return true;
  }
  return false;
}

async function getCuentasPorCobrar(req, res) {
  try {
    const { id } = req.params;
    const result = await service.getCuentasPorCobrar(id);

    if (!result.hasPendingOrders) {
      return res.status(200).json({
        message: 'El cliente no tiene pedidos pendientes de pago',
        count: 0,
        data: [],
        hasPendingOrders: false,
      });
    }

    res.status(200).json({
      message: 'Cuentas por cobrar obtenidas correctamente',
      count: result.data.length,
      data: result.data,
      promedioDiasPagados: result.promedioDiasPagados,
      pedidoMasAntiguo: result.pedidoMasAntiguo,
      resumen: result.resumen,
    });
  } catch (err) {
    if (handleServiceError(err, res)) return;
    console.error('Error al obtener cuentas por cobrar:', err);
    console.error('Error stack:', err.stack);
    res.status(500).json({
      error: 'Error en el servidor',
      details: err.message,
      errorCode: err.code,
    });
  }
}

async function search(req, res) {
  try {
    const { termino } = req.params;
    const data = await service.searchClientes(termino);
    res.status(200).json({
      message: `Clientes encontrados para "${termino}"`,
      count: data.length,
      data,
    });
  } catch (err) {
    if (handleServiceError(err, res)) return;
    console.error('Error al buscar clientes:', err);
    res.status(500).json({ error: 'Error en el servidor', details: err.message });
  }
}

async function list(req, res) {
  try {
    const { clients, summaryOk } = await service.listClientes();

    if (clients.length === 0) {
      return res.status(200).json({ message: 'No hay clientes registrados', count: 0, data: [] });
    }

    res.status(200).json({
      message: summaryOk
        ? 'Clientes obtenidos correctamente'
        : 'Clientes obtenidos correctamente (sin resúmenes)',
      count: clients.length,
      data: clients,
    });
  } catch (err) {
    if (handleServiceError(err, res)) return;
    console.error('Error al obtener clientes:', err);
    console.error('Error stack:', err.stack);
    res.status(500).json({
      error: 'Error al consultar la base de datos',
      details: err.message,
      code: err.code || 'UNKNOWN_ERROR',
    });
  }
}

async function getById(req, res) {
  try {
    const { id } = req.params;
    const data = await service.getClienteById(id);
    res.status(200).json({ message: 'Cliente obtenido correctamente', data });
  } catch (err) {
    if (handleServiceError(err, res)) return;
    console.error('Error al obtener cliente:', err);
    res.status(500).json({ error: 'Error en el servidor', details: err.message });
  }
}

async function validarNit(req, res) {
  try {
    const { nit } = req.body;
    const result = service.validarNit(nit);
    res.status(200).json(result);
  } catch (err) {
    if (handleServiceError(err, res)) return;
    console.error('Error al validar NIT:', err);
    res.status(500).json({ error: 'Error en el servidor', details: err.message });
  }
}

async function create(req, res) {
  try {
    const data = await service.createCliente(req.body);
    res.status(201).json({ message: 'Cliente creado correctamente', data });
  } catch (err) {
    if (handleServiceError(err, res)) return;
    console.error('Error al crear cliente:', err);
    res.status(500).json({ error: 'Error en el servidor', details: err.message });
  }
}

async function update(req, res) {
  try {
    const { id } = req.params;
    const data = await service.updateCliente(id, req.body);
    res.status(200).json({ message: 'Cliente actualizado correctamente', data });
  } catch (err) {
    if (handleServiceError(err, res)) return;
    console.error('Error al actualizar cliente:', err);
    res.status(500).json({ error: 'Error en el servidor', details: err.message });
  }
}

async function remove(req, res) {
  try {
    const { id } = req.params;
    const result = await service.deleteCliente(id);
    res.status(200).json({
      message: 'Cliente eliminado correctamente',
      data: {
        clienteEliminado: result.clienteEliminado,
        direccionesEliminadas: result.direccionesEliminadas,
        telefonosEliminados: result.telefonosEliminados,
      },
    });
  } catch (err) {
    if (handleServiceError(err, res)) return;
    console.error('Error al eliminar cliente:', err);
    if (err.code === '23503') {
      return res.status(400).json({
        error: 'No se puede eliminar el cliente porque está referenciado en otras tablas',
        details: 'El cliente tiene registros asociados que impiden su eliminación',
      });
    }
    res.status(500).json({ error: 'Error en el servidor', details: err.message });
  }
}

async function getDirecciones(req, res) {
  try {
    const { id } = req.params;
    const data = await service.getDirecciones(id);
    res.status(200).json({ message: 'Direcciones del cliente obtenidas correctamente', data });
  } catch (err) {
    if (handleServiceError(err, res)) return;
    console.error('Error al obtener direcciones del cliente:', err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
}

async function getTelefonos(req, res) {
  try {
    const { id } = req.params;
    const data = await service.getTelefonos(id);
    res.status(200).json({ message: 'Teléfonos del cliente obtenidos correctamente', data });
  } catch (err) {
    if (handleServiceError(err, res)) return;
    console.error('Error al obtener teléfonos del cliente:', err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
}

module.exports = {
  getCuentasPorCobrar,
  search,
  list,
  getById,
  validarNit,
  create,
  update,
  remove,
  getDirecciones,
  getTelefonos,
};
