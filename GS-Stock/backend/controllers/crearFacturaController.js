// Controlador de CrearFactura: capa HTTP. En éxito responde el PDF; en error de
// negocio el ServiceError, y en cualquier otro un 500.
const service = require('../services/crearFacturaService');
const ServiceError = require('../utils/ServiceError');

async function crearFactura(req, res) {
  try {
    const { pdfBuffer, factura } = await service.crearFactura(req.body);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=factura_${factura.id}.pdf`);
    res.send(pdfBuffer);
  } catch (err) {
    if (err instanceof ServiceError) {
      return res.status(err.status).json(err.body);
    }
    console.error('Error al crear factura:', err);
    res.status(500).json({ success: false, error: 'Error al crear la factura', details: err.message });
  }
}

module.exports = { crearFactura };
