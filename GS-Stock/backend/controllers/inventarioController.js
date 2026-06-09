// Controlador de Inventario: capa HTTP. Delega en el servicio y emite los
// eventos de socket (notificación en tiempo real) tras cada operación.
const service = require('../services/inventarioService');

function emit(req, method, payload) {
  if (req.socketService && typeof req.socketService[method] === 'function') {
    req.socketService[method](payload);
  }
}

async function getInventario(req, res) {
  try {
    const data = await service.getInventario();
    res.json({
      success: true,
      data,
      total_productos: data.length,
      message: 'Inventario obtenido correctamente',
    });
  } catch (err) {
    console.error('Error al obtener inventario:', err);
    res.status(500).json({ success: false, message: 'Error al obtener inventario' });
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
    console.error('Error al obtener tipos de línea de producto:', err);
    res
      .status(500)
      .json({ success: false, message: 'Error al obtener tipos de línea de producto' });
  }
}

async function create(req, res) {
  try {
    const newZapato = await service.addZapato(req.body);
    emit(req, 'emitNewProduct', newZapato);
    res.json({ success: true, data: newZapato, message: 'Zapato agregado correctamente' });
  } catch (err) {
    console.error('Error agregando zapato:', err);
    res.status(500).json({ success: false, message: 'Error al agregar zapato' });
  }
}

async function update(req, res) {
  try {
    const updatedZapato = await service.updateZapato(req.params.id, req.body);
    emit(req, 'emitInventoryUpdate', updatedZapato);
    res.json({ success: true, data: updatedZapato, message: 'Zapato actualizado correctamente' });
  } catch (err) {
    console.error('Error actualizando zapato:', err);
    res.status(500).json({ success: false, message: 'Error al actualizar zapato' });
  }
}

async function remove(req, res) {
  try {
    const zapatoId = req.params.id;
    await service.deactivateProduct(zapatoId);
    emit(req, 'emitProductDeactivation', zapatoId);
    res.json({ success: true, message: 'Producto marcado como no disponible correctamente' });
  } catch (err) {
    console.error('Error desactivando producto:', err);
    res.status(500).json({ success: false, message: 'Error al desactivar producto' });
  }
}

module.exports = {
  getInventario,
  getTiposLineaProducto,
  create,
  update,
  remove,
};
