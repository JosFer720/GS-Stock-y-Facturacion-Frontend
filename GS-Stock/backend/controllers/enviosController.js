// Controlador de Envíos: capa HTTP para envíos nacionales e importadora.
// En creación responde el PDF; el listado devuelve JSON.
const service = require('../services/enviosService');
const ServiceError = require('../utils/ServiceError');

function sendPdf(res, pdfResult) {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${pdfResult.fileName}"`);
  res.setHeader('Content-Length', pdfResult.pdfBuffer.length);
  res.setHeader('Cache-Control', 'no-cache');
  res.send(pdfResult.pdfBuffer);
}

function handleCrearError(err, res, logLabel) {
  if (err instanceof ServiceError) {
    return res.status(err.status).json(err.body);
  }
  console.error(`${logLabel}:`, err);
  if (res.headersSent) {
    return res.end();
  }
  res.status(500).json({ success: false, error: 'Error interno del servidor', details: err.message });
}

async function crearNacional(req, res) {
  try {
    const pdfResult = await service.crearEnvioNacional(req.body);
    sendPdf(res, pdfResult);
  } catch (err) {
    handleCrearError(err, res, 'Error al crear envío nacional');
  }
}

async function crearImportadora(req, res) {
  try {
    const pdfResult = await service.crearEnvioImportadora(req.body);
    sendPdf(res, pdfResult);
  } catch (err) {
    handleCrearError(err, res, 'Error al crear envío importadora');
  }
}

async function listNacional(req, res) {
  try {
    const data = await service.listEnviosNacional();
    res.json({ success: true, message: 'Envíos nacionales obtenidos correctamente', data });
  } catch (err) {
    console.error('Error al obtener envíos nacionales:', err);
    res.status(500).json({ success: false, error: 'Error interno del servidor', details: err.message });
  }
}

async function listImportadora(req, res) {
  try {
    const data = await service.listEnviosImportadora();
    res.json({ success: true, message: 'Envíos de importadora obtenidos correctamente', data });
  } catch (err) {
    console.error('Error al obtener envíos de importadora:', err);
    res.status(500).json({ success: false, error: 'Error interno del servidor', details: err.message });
  }
}

module.exports = {
  crearNacional,
  crearImportadora,
  listNacional,
  listImportadora,
};
