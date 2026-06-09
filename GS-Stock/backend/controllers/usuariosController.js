// Controlador de Usuarios: capa HTTP. Lee req, delega en el servicio y arma la
// respuesta, preservando los status y cuerpos de cada endpoint original.
const service = require('../services/usuariosService');
const ServiceError = require('../utils/ServiceError');

function handleServiceError(err, res) {
  if (err instanceof ServiceError) {
    res.status(err.status).json(err.body);
    return true;
  }
  return false;
}

const isDev = () => process.env.NODE_ENV === 'development';

async function list(req, res) {
  try {
    const data = await service.listUsuarios();
    if (data.length === 0) {
      return res.status(200).json({ message: 'No hay usuarios registrados', data: [] });
    }
    res.status(200).json({ message: 'Usuarios obtenidos correctamente', count: data.length, data });
  } catch (err) {
    if (handleServiceError(err, res)) return;
    console.error('Error al obtener usuarios:', err);
    res.status(500).json({ error: 'Error al consultar la base de datos', details: err.message });
  }
}

async function create(req, res) {
  try {
    const data = await service.createUsuarioSimple(req.body);
    res.status(201).json({ message: 'Usuario creado correctamente', data });
  } catch (err) {
    if (handleServiceError(err, res)) return;
    console.error('Error al crear usuario:', err);
    res.status(500).json({ error: 'Error al crear el usuario', details: err.message });
  }
}

async function createWithAccount(req, res) {
  try {
    const data = await service.createUsuarioConCuenta(req.body);
    res.status(201).json({ message: 'Usuario y cuenta creados correctamente', data });
  } catch (err) {
    if (handleServiceError(err, res)) return;
    console.error('Error al crear usuario con cuenta:', err);
    res.status(500).json({
      error: 'Error interno del servidor',
      details: isDev() ? err.message : 'Error procesando la solicitud',
    });
  }
}

async function update(req, res) {
  try {
    const { id } = req.params;
    const data = await service.updateUsuario(id, req.body, req.user.id);
    res.status(200).json({ message: 'Usuario actualizado correctamente', data });
  } catch (err) {
    if (handleServiceError(err, res)) return;
    console.error('Error al actualizar usuario:', err);
    res.status(500).json({ error: 'Error al actualizar el usuario', details: err.message });
  }
}

async function updateAccount(req, res) {
  try {
    const { id } = req.params;
    const data = await service.updateUsuarioConCuenta(id, req.body);
    res.status(200).json({ message: 'Usuario y cuenta actualizados correctamente', data });
  } catch (err) {
    if (handleServiceError(err, res)) return;
    console.error('Error al actualizar usuario con cuenta:', err);
    res.status(500).json({
      error: 'Error interno del servidor',
      details: isDev() ? err.message : 'Error procesando la solicitud',
    });
  }
}

async function deactivate(req, res) {
  try {
    const { id } = req.params;
    const data = await service.setEstado(id, false);
    res.status(200).json({ message: 'Usuario desactivado correctamente', data });
  } catch (err) {
    if (handleServiceError(err, res)) return;
    console.error('Error al desactivar usuario:', err);
    res.status(500).json({ error: 'Error al desactivar el usuario', details: err.message });
  }
}

async function activate(req, res) {
  try {
    const { id } = req.params;
    const data = await service.setEstado(id, true);
    res.status(200).json({ message: 'Usuario activado correctamente', data });
  } catch (err) {
    if (handleServiceError(err, res)) return;
    console.error('Error al activar usuario:', err);
    res.status(500).json({ error: 'Error al activar el usuario', details: err.message });
  }
}

async function remove(req, res) {
  try {
    const { id } = req.params;
    const data = await service.deleteUsuario(id);
    res.status(200).json({ message: 'Usuario eliminado correctamente', data });
  } catch (err) {
    if (handleServiceError(err, res)) return;
    console.error('Error al eliminar usuario:', err);
    res.status(500).json({ error: 'Error al eliminar el usuario', details: err.message });
  }
}

async function getById(req, res) {
  try {
    const { id } = req.params;
    const data = await service.getUsuarioById(id);
    res.status(200).json({ message: 'Usuario obtenido correctamente', data });
  } catch (err) {
    if (handleServiceError(err, res)) return;
    console.error('Error al obtener usuario:', err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
}

async function getByEstado(req, res) {
  try {
    const estado = req.params.estado === 'true';
    const data = await service.getUsuariosByEstado(estado);
    res.status(200).json({
      message: `Usuarios con estado '${estado}' obtenidos correctamente`,
      count: data.length,
      data,
    });
  } catch (err) {
    if (handleServiceError(err, res)) return;
    console.error('Error al obtener usuarios por estado:', err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
}

async function getByRol(req, res) {
  try {
    const { id_rol } = req.params;
    const data = await service.getUsuariosByRol(id_rol);
    res.status(200).json({
      message: `Usuarios con rol ID ${id_rol} obtenidos correctamente`,
      count: data.length,
      data,
    });
  } catch (err) {
    if (handleServiceError(err, res)) return;
    console.error('Error al obtener usuarios por rol:', err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
}

module.exports = {
  list,
  create,
  createWithAccount,
  update,
  updateAccount,
  deactivate,
  activate,
  remove,
  getById,
  getByEstado,
  getByRol,
};
