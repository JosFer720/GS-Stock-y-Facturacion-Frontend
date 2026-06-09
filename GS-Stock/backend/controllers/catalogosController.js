// Controlador de Catálogos: capa HTTP. Preserva los cuerpos de cada endpoint.
const service = require('../services/catalogosService');
const ServiceError = require('../utils/ServiceError');

function handleServiceError(err, res) {
  if (err instanceof ServiceError) {
    res.status(err.status).json(err.body);
    return true;
  }
  return false;
}

async function getTallas(req, res) {
  try {
    const data = await service.getTallas();
    res.json({ success: true, data, message: 'Tallas obtenidas correctamente' });
  } catch (err) {
    if (handleServiceError(err, res)) return;
    console.error('Error al obtener tallas:', err);
    res.status(500).json({ success: false, message: 'Error al obtener tallas' });
  }
}

async function getTiposCalzado(req, res) {
  try {
    const data = await service.getTiposCalzado();
    res.json({ success: true, data, message: 'Tipos de calzado obtenidos correctamente' });
  } catch (err) {
    if (handleServiceError(err, res)) return;
    console.error('Error al obtener tipos de calzado:', err);
    res.status(500).json({ success: false, message: 'Error al obtener tipos de calzado' });
  }
}

async function getTiposLinea(req, res) {
  try {
    const data = await service.getTiposLinea();
    res.status(200).json({
      success: true,
      message: 'Tipos de línea de producto obtenidos correctamente',
      data,
      total: data.length,
    });
  } catch (err) {
    if (handleServiceError(err, res)) return;
    console.error('Error al obtener tipos de línea de producto:', err);
    res.status(500).json({ success: false, error: 'Error interno del servidor', details: err.message });
  }
}

async function createTipoLinea(req, res) {
  try {
    const data = await service.createTipoLinea(req.body);
    res.status(201).json({ success: true, message: 'Tipo de línea creado correctamente', data });
  } catch (err) {
    if (handleServiceError(err, res)) return;
    console.error('Error al crear tipo de línea:', err);
    if (err.code === '23505') {
      return res
        .status(400)
        .json({ success: false, error: 'Ya existe un tipo de línea con ese nombre' });
    }
    res.status(500).json({ success: false, error: 'Error interno del servidor', details: err.message });
  }
}

module.exports = {
  getTallas,
  getTiposCalzado,
  getTiposLinea,
  createTipoLinea,
};
