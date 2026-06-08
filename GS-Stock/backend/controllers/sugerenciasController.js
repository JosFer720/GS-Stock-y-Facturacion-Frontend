// Controlador de Sugerencias de facturación: capa HTTP.
const service = require('../services/sugerenciasService');

async function getSugerencias(req, res) {
  try {
    const data = await service.getSugerencias();
    res.json({ success: true, data });
  } catch (err) {
    console.error('Error al obtener sugerencias:', err);
    res
      .status(500)
      .json({ success: false, error: 'Error al obtener datos para autollenado', details: err.message });
  }
}

async function buscarClienteEmpresa(req, res) {
  try {
    const data = await service.buscarClienteEmpresa(req.params.empresa);
    res.json({ success: true, data });
  } catch (err) {
    console.error('Error al buscar cliente por empresa:', err);
    res.status(500).json({ success: false, error: 'Error al buscar cliente', details: err.message });
  }
}

module.exports = {
  getSugerencias,
  buscarClienteEmpresa,
};
