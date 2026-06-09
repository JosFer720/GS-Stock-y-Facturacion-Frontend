// Controlador de Ventas: capa HTTP. Preserva los formatos de respuesta de cada
// endpoint original ({ success, data, message }, etc.).
const service = require('../services/ventasService');
const ServiceError = require('../utils/ServiceError');

function handleServiceError(err, res) {
  if (err instanceof ServiceError) {
    res.status(err.status).json(err.body);
    return true;
  }
  return false;
}

async function getMetodosPago(req, res) {
  try {
    const data = await service.getMetodosPago();
    res.json({ success: true, data, message: 'Métodos de pago obtenidos correctamente' });
  } catch (err) {
    if (handleServiceError(err, res)) return;
    console.error('Error al obtener métodos de pago:', err);
    res.status(500).json({ success: false, message: 'Error al obtener métodos de pago' });
  }
}

async function getTiposLineaProducto(req, res) {
  try {
    const data = await service.getTiposLineaProducto();
    res.json({
      success: true,
      data,
      message: 'Tipos de línea de producto obtenidos correctamente',
    });
  } catch (err) {
    if (handleServiceError(err, res)) return;
    console.error('Error al obtener tipos de línea:', err);
    res.status(500).json({ success: false, message: 'Error al obtener tipos de línea de producto' });
  }
}

async function createPedido(req, res) {
  try {
    const data = await service.createPedido(req.body, req.user);
    res.status(201).json({ mensaje: 'Pedido creado exitosamente', data });
  } catch (err) {
    if (handleServiceError(err, res)) return;
    console.error('Error al crear pedido:', err);
    res.status(500).json({ error: 'Error al procesar el pedido', details: err.message });
  }
}

async function listPedidos(req, res) {
  try {
    const result = await service.listPedidos({
      role: req.user?.rol,
      userId: req.user?.id,
      limit: req.query.limit,
      page: req.query.page,
    });
    res.json({
      success: true,
      data: result.data,
      total: result.total,
      page: result.page,
      perPage: result.perPage,
      totalPages: result.totalPages,
      message: 'Pedidos obtenidos correctamente',
    });
  } catch (err) {
    if (handleServiceError(err, res)) return;
    console.error('Error al obtener pedidos:', err);
    res.status(500).json({ success: false, message: 'Error al obtener pedidos' });
  }
}

async function getVendedorActual(req, res) {
  try {
    const data = await service.getVendedorActual(req.user.id);
    res.json({ success: true, data, message: 'Información del usuario obtenida correctamente' });
  } catch (err) {
    if (handleServiceError(err, res)) return;
    console.error('Error al obtener información del usuario:', err);
    res.status(500).json({ success: false, error: 'Error al obtener información del usuario' });
  }
}

async function getVendedores(req, res) {
  try {
    const data = await service.getVendedores();
    res.json({ success: true, data, message: 'Vendedores obtenidos correctamente' });
  } catch (err) {
    if (handleServiceError(err, res)) return;
    res.status(500).json({ success: false, message: 'Error al obtener vendedores' });
  }
}

async function getTiposCliente(req, res) {
  try {
    const data = await service.getTiposCliente();
    res.json({ success: true, data, message: 'Tipos de cliente obtenidos correctamente' });
  } catch (err) {
    if (handleServiceError(err, res)) return;
    res.status(500).json({ success: false, message: 'Error al obtener tipos de cliente' });
  }
}

async function getClientes(req, res) {
  try {
    const data = await service.getClientes();
    res.status(200).json({ message: 'Clientes obtenidos correctamente', count: data.length, data });
  } catch (err) {
    if (handleServiceError(err, res)) return;
    console.error('Error al obtener clientes:', err);
    res.status(500).json({ error: 'Error al consultar la base de datos', details: err.message });
  }
}

async function getEstadosPedidos(req, res) {
  try {
    const data = await service.getEstadosPedidos();
    res.json({ success: true, data, message: 'Estados de pedidos obtenidos correctamente' });
  } catch (err) {
    if (handleServiceError(err, res)) return;
    console.error('Error al obtener estados de pedidos:', err);
    res
      .status(500)
      .json({ success: false, message: 'Error al obtener estados de pedidos', error: err.message });
  }
}

async function getProductosPedido(req, res) {
  try {
    const productos = await service.getProductosPedido(req.params.id);
    return res.json({ success: true, productos });
  } catch (err) {
    if (handleServiceError(err, res)) return;
    console.error('Error al obtener productos del pedido:', err);
    return res
      .status(500)
      .json({ success: false, error: 'Error al obtener productos del pedido' });
  }
}

async function updateEstadoPedido(req, res) {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    const data = await service.updateEstadoPedido(id, estado, req.user);
    res.json({ success: true, message: 'Estado actualizado correctamente', data });
  } catch (err) {
    if (handleServiceError(err, res)) return;
    console.error('Error al actualizar estado:', err);
    res
      .status(500)
      .json({ success: false, error: 'Error al actualizar estado del pedido', details: err.message });
  }
}

module.exports = {
  getMetodosPago,
  getTiposLineaProducto,
  createPedido,
  listPedidos,
  getVendedorActual,
  getVendedores,
  getTiposCliente,
  getClientes,
  getEstadosPedidos,
  getProductosPedido,
  updateEstadoPedido,
};
