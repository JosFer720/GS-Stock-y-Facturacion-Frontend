// Servicio de Catálogos: lecturas de catálogos y alta de tipo de línea.
const repo = require('../repositories/catalogosRepository');
const ServiceError = require('../utils/ServiceError');

async function getTallas() {
  return repo.findTallas();
}

async function getTiposCalzado() {
  return repo.findTiposCalzado();
}

async function getTiposLinea() {
  return repo.findTiposLineaActivos();
}

async function createTipoLinea(body) {
  const { nombre, descripcion } = body;
  if (!nombre) {
    throw new ServiceError(400, { success: false, error: 'El nombre es requerido' });
  }
  return repo.insertTipoLinea({ nombre, descripcion });
}

module.exports = {
  getTallas,
  getTiposCalzado,
  getTiposLinea,
  createTipoLinea,
};
