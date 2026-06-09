// Servicio de Users (/api/user): perfil, creación, actualización, baja y datos
// de vendedor. Lanza ServiceError para 400/403/404.
const pool = require('../db');
const bcrypt = require('bcryptjs');
const repo = require('../repositories/usersRepository');
const ServiceError = require('../utils/ServiceError');

const ROL_USUARIO_DEFAULT = 2;

function esAdmin(rol) {
  return rol === 'Administrador' || rol === 'Super Admin';
}

async function getUsuarioActual(id) {
  const usuario = await repo.findUsuarioActual(id);
  if (!usuario) {
    throw new ServiceError(404, { success: false, error: 'Usuario no encontrado' });
  }
  return {
    id: usuario.id,
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    nombre_completo: `${usuario.nombre} ${usuario.apellido}`,
    rol: usuario.rol,
    es_vendedor: usuario.rol === 'Vendedor',
    es_administrador: usuario.rol === 'Administrador',
    usuario: usuario.usuario,
    email: usuario.email,
  };
}

async function createUser(body) {
  const { nombre, apellido, usuario, email, contrasena, id_roles } = body;

  if (!nombre || !usuario || !email || !contrasena) {
    throw new ServiceError(400, { error: 'Todos los campos son obligatorios' });
  }
  if (await repo.findCuentaByUsuario(usuario)) {
    throw new ServiceError(400, { error: 'El nombre de usuario ya está en uso' });
  }
  if (await repo.findCuentaByEmail(email)) {
    throw new ServiceError(400, { error: 'El email ya está registrado' });
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(contrasena, salt);
  const rolAsignado = id_roles || ROL_USUARIO_DEFAULT;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const userId = await repo.insertUsuario(
      { nombre, apellido: apellido || '', idRoles: rolAsignado },
      client
    );
    await repo.insertCuenta({ usuario, email, contrasena: hashedPassword, idUsuarios: userId }, client);

    await client.query('COMMIT');

    return {
      id: userId,
      nombre,
      apellido: apellido || '',
      usuario,
      email,
      rol: rolAsignado,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function updateUser(id, body, requester) {
  const { nombre, apellido, email, usuario } = body;

  if (requester.id != id && !esAdmin(requester.rol)) {
    throw new ServiceError(403, { error: 'No tienes permisos para actualizar este usuario' });
  }
  if (!(await repo.existsById(id))) {
    throw new ServiceError(404, { error: 'Usuario no encontrado' });
  }
  if (usuario && (await repo.findCuentaByUsuarioExcluding(usuario, id))) {
    throw new ServiceError(400, { error: 'El nombre de usuario ya está en uso' });
  }
  if (email && (await repo.findCuentaByEmailExcluding(email, id))) {
    throw new ServiceError(400, { error: 'El email ya está registrado' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (nombre || apellido !== undefined) {
      const fields = {};
      if (nombre) fields.nombre = nombre;
      if (apellido !== undefined) fields.apellido = apellido;
      await repo.updateUsuarioFields(id, fields, client);
    }

    if (usuario || email) {
      const fields = {};
      if (usuario) fields.usuario = usuario;
      if (email) fields.email = email;
      await repo.updateCuentaFields(id, fields, client);
    }

    await client.query('COMMIT');

    return repo.findUpdatedUser(id);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function deleteUser(id, action, requester) {
  if (requester.id != id && !esAdmin(requester.rol)) {
    throw new ServiceError(403, { error: 'No tienes permisos para esta acción' });
  }
  if (!(await repo.existsById(id))) {
    throw new ServiceError(404, { error: 'Usuario no encontrado' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (action === 'delete') {
      await repo.deleteCuenta(id, client);
      await repo.deleteUsuario(id, client);
      await client.query('COMMIT');
      return { message: 'Usuario eliminado correctamente' };
    }

    // Desactivar: asegura la columna `activo` (puede fallar silenciosamente).
    try {
      await repo.ensureActivoColumn(client);
    } catch (err) {
      console.log('La columna activo ya existe o hubo un error:', err.message);
    }
    await repo.setActivo(id, false, client);
    await client.query('COMMIT');
    return { message: 'Usuario desactivado correctamente' };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function getVendedor(requester) {
  if (requester.rol !== 'Vendedor' && !esAdmin(requester.rol)) {
    throw new ServiceError(403, {
      success: false,
      error: 'El usuario actual no tiene permisos de vendedor o administrador',
    });
  }

  const usuario = await repo.findVendedorInfo(requester.id);
  if (!usuario) {
    throw new ServiceError(404, { success: false, error: 'Usuario no encontrado' });
  }

  return {
    id: usuario.id,
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    email: usuario.email,
    rol: usuario.rol,
    nombre_usuario: usuario.nombre_usuario,
  };
}

module.exports = {
  getUsuarioActual,
  createUser,
  updateUser,
  deleteUser,
  getVendedor,
};
