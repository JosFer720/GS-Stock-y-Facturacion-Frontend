// Controlador de Devoluciones: capa HTTP. Preserva los cuerpos de respuesta
// originales ({ success, data }, { success, mensaje, data }, etc.).
const service = require('../services/devolucionesService');
const ServiceError = require('../utils/ServiceError');

function handleServiceError(err, res) {
  if (err instanceof ServiceError) {
    res.status(err.status).json(err.body);
    return true;
  }
  return false;
}

async function getMetodos(req, res) {
  try {
    const data = await service.getMetodos();
    res.json({ success: true, data });
  } catch (err) {
    if (handleServiceError(err, res)) return;
    console.error('Error al obtener métodos de devolución:', err);
    res
      .status(500)
      .json({ error: 'Error al obtener los métodos de devolución', details: err.message });
  }
}

async function getPedidosCliente(req, res) {
  try {
    const data = await service.getPedidosCliente(req.params.clienteId);
    res.json({ success: true, data });
  } catch (err) {
    if (handleServiceError(err, res)) return;
    console.error('Error al obtener pedidos del cliente:', err);
    res.status(500).json({ error: 'Error al obtener los pedidos del cliente', details: err.message });
  }
}

async function create(req, res) {
  try {
    const data = await service.createDevolucion(req.body, req.user);
    res.status(201).json({ success: true, mensaje: 'Devolución registrada exitosamente', data });
  } catch (err) {
    if (handleServiceError(err, res)) return;
    console.error('Error al crear devolución:', err);
    res.status(500).json({ error: 'Error al registrar la devolución', details: err.message });
  }
}

async function list(req, res) {
  try {
    const data = await service.listDevoluciones();
    res.json({ success: true, data, total: data.length });
  } catch (err) {
    if (handleServiceError(err, res)) return;
    console.error('Error al obtener devoluciones:', err);
    res.status(500).json({ error: 'Error al obtener las devoluciones', details: err.message });
  }
}

async function update(req, res) {
  try {
    const data = await service.updateDevolucion(req.params.id, req.body);
    res.json({ success: true, mensaje: 'Devolución actualizada exitosamente', data });
  } catch (err) {
    if (handleServiceError(err, res)) return;
    console.error('Error al actualizar devolución:', err);
    res.status(500).json({ error: 'Error al actualizar la devolución', details: err.message });
  }
}

async function remove(req, res) {
  try {
    await service.deleteDevolucion(req.params.id);
    res.json({ success: true, mensaje: 'Devolución eliminada exitosamente' });
  } catch (err) {
    if (handleServiceError(err, res)) return;
    console.error('Error al eliminar devolución:', err);
    res.status(500).json({ error: 'Error al eliminar la devolución', details: err.message });
  }
}

module.exports = {
  getMetodos,
  getPedidosCliente,
  create,
  list,
  update,
  remove,
};
