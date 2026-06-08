// Controlador de Pagos: capa HTTP. Preserva los cuerpos de respuesta originales.
const service = require('../services/pagosService');

async function getClientesPendientes(req, res) {
  try {
    const data = await service.getClientesPendientes();
    res.json({ success: true, data });
  } catch (err) {
    console.error('Error al obtener clientes con pagos pendientes:', err);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

async function getPedidosCliente(req, res) {
  try {
    const data = await service.getPedidosCliente(req.params.clienteId);
    res.json({ success: true, data });
  } catch (err) {
    console.error('Error al obtener pedidos del cliente:', err);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

async function create(req, res) {
  try {
    const data = await service.registerPayment(req.body);
    res.json({ success: true, data, message: 'Pago registrado exitosamente' });
  } catch (err) {
    console.error('Error al registrar pago:', err);
    res.status(500).json({ success: false, error: err.message || 'Error interno del servidor' });
  }
}

async function list(req, res) {
  try {
    const data = await service.getHistorial();
    res.json({ success: true, data });
  } catch (err) {
    console.error('Error al obtener historial de pagos:', err);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

module.exports = {
  getClientesPendientes,
  getPedidosCliente,
  create,
  list,
};
