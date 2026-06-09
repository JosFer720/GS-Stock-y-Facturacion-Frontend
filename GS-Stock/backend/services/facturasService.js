// Servicio de Facturas: lecturas de facturas y su detalle.
const repo = require('../repositories/facturasRepository');
const ServiceError = require('../utils/ServiceError');

async function listFacturas(query) {
  return repo.findFacturas({ fecha: query.fecha, cliente: query.cliente });
}

async function getFacturaById(id) {
  const factura = await repo.findFacturaById(id);
  if (!factura) {
    throw new ServiceError(404, { error: 'Factura no encontrada' });
  }
  return factura;
}

async function getFacturaDetalles(id) {
  const [factura, productos] = await Promise.all([
    repo.findFacturaById(id),
    repo.findProductosByFactura(id),
  ]);
  if (!factura) {
    throw new ServiceError(404, { error: 'Factura no encontrada' });
  }
  return { factura, productos };
}

module.exports = {
  listFacturas,
  getFacturaById,
  getFacturaDetalles,
};
