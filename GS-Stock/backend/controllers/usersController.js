// Controlador de Users (/api/user): capa HTTP. Preserva los cuerpos originales.
const service = require('../services/usersService');
const ServiceError = require('../utils/ServiceError');

function handleServiceError(err, res) {
  if (err instanceof ServiceError) {
    res.status(err.status).json(err.body);
    return true;
  }
  return false;
}

function profile(req, res) {
  res.json({ message: 'Perfil de usuario', user: req.user });
}

function admin(req, res) {
  res.json({ message: 'Acceso administrativo', user: req.user });
}

async function usuarioActual(req, res) {
  try {
    const data = await service.getUsuarioActual(req.user.id);
    res.json({ success: true, data, message: 'Información del usuario obtenida correctamente' });
  } catch (err) {
    if (handleServiceError(err, res)) return;
    console.error('Error al obtener información del usuario:', err);
    res.status(500).json({ success: false, error: 'Error al obtener información del usuario' });
  }
}

async function create(req, res) {
  try {
    const user = await service.createUser(req.body);
    res.status(201).json({ message: 'Usuario creado correctamente', user });
  } catch (err) {
    if (handleServiceError(err, res)) return;
    console.error('Error al crear usuario:', err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
}

async function update(req, res) {
  try {
    const user = await service.updateUser(req.params.id, req.body, req.user);
    res.json({ message: 'Usuario actualizado correctamente', user });
  } catch (err) {
    if (handleServiceError(err, res)) return;
    console.error('Error al actualizar usuario:', err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
}

async function remove(req, res) {
  try {
    const { action = 'deactivate' } = req.body;
    const result = await service.deleteUser(req.params.id, action, req.user);
    res.json(result);
  } catch (err) {
    if (handleServiceError(err, res)) return;
    console.error('Error al desactivar/eliminar usuario:', err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
}

async function vendedor(req, res) {
  try {
    const data = await service.getVendedor(req.user);
    res.json({ success: true, data });
  } catch (err) {
    if (handleServiceError(err, res)) return;
    console.error('Error al obtener información del vendedor:', err);
    res.status(500).json({ success: false, error: 'Error al obtener información del vendedor' });
  }
}

module.exports = {
  profile,
  admin,
  usuarioActual,
  create,
  update,
  remove,
  vendedor,
};
