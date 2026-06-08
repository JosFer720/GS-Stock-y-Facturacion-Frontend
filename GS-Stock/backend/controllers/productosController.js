// Controlador de Productos: capa HTTP compartida por los routes agregar/
// modificar/eliminar. Preserva los cuerpos de respuesta originales.
const service = require('../services/productosService');
const ServiceError = require('../utils/ServiceError');

function handleServiceError(err, res) {
  if (err instanceof ServiceError) {
    res.status(err.status).json(err.body);
    return true;
  }
  return false;
}

// El código original usa `req.usuario` (inexistente) con fallback a 1.
const usuarioId = (req) => req.usuario?.id;

async function create(req, res) {
  try {
    const data = await service.addProducto(req.body, usuarioId(req));
    res.status(201).json({ mensaje: 'Producto agregado exitosamente', data });
  } catch (err) {
    if (handleServiceError(err, res)) return;
    console.error('Error al agregar producto:', err);
    res.status(500).json({ error: 'Error al agregar el producto', details: err.message });
  }
}

async function update(req, res) {
  try {
    const data = await service.updateProducto(req.params.id, req.body, usuarioId(req));
    res.status(200).json({ mensaje: 'Producto actualizado exitosamente', data });
  } catch (err) {
    if (handleServiceError(err, res)) return;
    console.error('Error al modificar producto:', err);
    res.status(500).json({ error: 'Error al modificar el producto', details: err.message });
  }
}

async function updatePrecio(req, res) {
  try {
    const data = await service.updatePrecio(req.params.id, req.body);
    res.status(200).json({ mensaje: 'Precio del producto actualizado exitosamente', data });
  } catch (err) {
    if (handleServiceError(err, res)) return;
    console.error('Error al actualizar precio del producto:', err);
    res.status(500).json({ error: 'Error al actualizar precio del producto', details: err.message });
  }
}

async function updateEstado(req, res) {
  try {
    const data = await service.updateEstado(req.params.id, req.body, usuarioId(req));
    res
      .status(200)
      .json({ mensaje: `Estado del producto actualizado a '${data.estado}' exitosamente`, data });
  } catch (err) {
    if (handleServiceError(err, res)) return;
    console.error('Error al actualizar estado del producto:', err);
    res.status(500).json({ error: 'Error al actualizar estado del producto', details: err.message });
  }
}

async function updateStock(req, res) {
  try {
    const data = await service.updateStock(req.params.id, req.body, usuarioId(req));
    res.status(200).json({ mensaje: 'Stock actualizado exitosamente', data });
  } catch (err) {
    if (handleServiceError(err, res)) return;
    console.error('Error al modificar stock:', err);
    res.status(500).json({ error: 'Error al modificar el stock', details: err.message });
  }
}

async function remove(req, res) {
  try {
    const data = await service.deleteProducto(req.params.id);
    res.status(200).json({ mensaje: 'Producto eliminado exitosamente', id: data.id });
  } catch (err) {
    if (handleServiceError(err, res)) return;
    console.error('Error al eliminar producto:', err);
    res.status(500).json({ error: 'Error al eliminar el producto', details: err.message });
  }
}

module.exports = {
  create,
  update,
  updatePrecio,
  updateEstado,
  updateStock,
  remove,
};
