// Controlador de Facturas: capa HTTP. Preserva los cuerpos originales (el
// listado devuelve el array crudo de filas).
const service = require('../services/facturasService');
const ServiceError = require('../utils/ServiceError');

function handleServiceError(err, res) {
  if (err instanceof ServiceError) {
    res.status(err.status).json(err.body);
    return true;
  }
  return false;
}

async function list(req, res) {
  try {
    const rows = await service.listFacturas(req.query);
    res.json(rows);
  } catch (err) {
    if (handleServiceError(err, res)) return;
    console.error('Error al obtener facturas:', err);
    res.status(500).json({ error: 'Error al obtener facturas', details: err.message });
  }
}

async function getById(req, res) {
  try {
    const data = await service.getFacturaById(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    if (handleServiceError(err, res)) return;
    console.error('Error al obtener factura:', err);
    res.status(500).json({ error: 'Error al obtener factura', details: err.message });
  }
}

async function getDetalles(req, res) {
  try {
    const data = await service.getFacturaDetalles(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    if (handleServiceError(err, res)) return;
    console.error('Error al obtener detalles de factura:', err);
    res.status(500).json({ error: 'Error al obtener detalles de factura', details: err.message });
  }
}

module.exports = {
  list,
  getById,
  getDetalles,
};
