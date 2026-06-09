// Servicio de Usuarios: lógica de negocio, validaciones, transacciones y reglas
// de seguridad. Lanza ServiceError para los casos esperados (400/403/404/409).
const pool = require('../db');
const bcrypt = require('bcryptjs');
const repo = require('../repositories/usuariosRepository');
const ServiceError = require('../utils/ServiceError');
const { isValidEmail, isValidUsername } = require('../utils/validators');

const SALT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 8;

// ─── Lecturas ───────────────────────────────────────────────────────────

async function listUsuarios() {
  return repo.findAllBasic();
}

async function getUsuarioById(id) {
  const usuario = await repo.findWithCuentaById(id);
  if (!usuario) {
    throw new ServiceError(404, { error: 'Usuario no encontrado' });
  }
  return usuario;
}

async function getUsuariosByEstado(estado) {
  return repo.findByEstado(estado);
}

async function getUsuariosByRol(idRol) {
  return repo.findByRol(idRol);
}

// ─── Creación ───────────────────────────────────────────────────────────

async function createUsuarioSimple(body) {
  const { nombre, apellido, email, id_roles, estado } = body;

  if (!nombre || !apellido || !id_roles) {
    throw new ServiceError(400, { error: 'Nombre, apellido y rol son obligatorios' });
  }

  return repo.insertUsuarioSimple({ nombre, apellido, email, id_roles, estado });
}

async function createUsuarioConCuenta(body) {
  const { nombre, apellido, email, usuario, contrasena, id_roles, estado } = body;

  // Validación de presencia de campos obligatorios.
  const camposRequeridos = ['nombre', 'apellido', 'email', 'usuario', 'contrasena', 'id_roles'];
  const camposFaltantes = camposRequeridos.filter(
    (campo) => !body[campo] && body[campo] !== 0
  );
  if (camposFaltantes.length > 0) {
    throw new ServiceError(400, {
      error: 'Campos obligatorios faltantes',
      details: `Faltan: ${camposFaltantes.join(', ')}`,
      camposRecibidos: Object.keys(body),
    });
  }

  if (!nombre?.trim()) throw new ServiceError(400, { error: 'El nombre es obligatorio' });
  if (!apellido?.trim()) throw new ServiceError(400, { error: 'El apellido es obligatorio' });
  if (!email?.trim()) throw new ServiceError(400, { error: 'El email es obligatorio' });
  if (!usuario?.trim())
    throw new ServiceError(400, { error: 'El nombre de usuario es obligatorio' });
  if (!contrasena) throw new ServiceError(400, { error: 'La contraseña es obligatoria' });
  if (!id_roles) throw new ServiceError(400, { error: 'El rol es obligatorio' });

  const normalizedEmail = email.toLowerCase().trim();
  const normalizedUsuario = usuario.trim();
  const normalizedNombre = nombre.trim();
  const normalizedApellido = apellido.trim();
  const normalizedEstado = estado !== undefined ? estado : true;

  if (contrasena.length < MIN_PASSWORD_LENGTH) {
    throw new ServiceError(400, { error: 'La contraseña debe tener al menos 8 caracteres' });
  }
  if (!isValidUsername(normalizedUsuario)) {
    throw new ServiceError(400, {
      error: 'El usuario solo puede contener letras, números y guiones bajos (_)',
      details: `Caracteres no permitidos detectados en: "${normalizedUsuario}"`,
    });
  }
  if (!isValidEmail(normalizedEmail)) {
    throw new ServiceError(400, { error: 'Formato de email inválido' });
  }
  if (normalizedNombre.length < 2) {
    throw new ServiceError(400, { error: 'El nombre debe tener al menos 2 caracteres' });
  }
  if (normalizedApellido.length < 2) {
    throw new ServiceError(400, { error: 'El apellido debe tener al menos 2 caracteres' });
  }
  if (normalizedUsuario.length < 3) {
    throw new ServiceError(400, { error: 'El nombre de usuario debe tener al menos 3 caracteres' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const emailEnUso = await repo.findByEmailNormalized(normalizedEmail, client);
    if (emailEnUso) {
      throw new ServiceError(409, {
        error: 'Ya existe un usuario con este email',
        details: `Email registrado para: ${emailEnUso.nombre} ${emailEnUso.apellido}`,
      });
    }

    const usuarioEnUso = await repo.findCuentaByUsuarioNormalized(
      normalizedUsuario.toLowerCase(),
      client
    );
    if (usuarioEnUso) {
      throw new ServiceError(409, {
        error: 'Ya existe un usuario con este nombre de usuario',
        details: `Usuario "${usuarioEnUso.usuario}" ya está en uso`,
      });
    }

    const nuevoUsuario = await repo.insertUsuario(
      {
        nombre: normalizedNombre,
        apellido: normalizedApellido,
        email: normalizedEmail,
        id_roles,
        estado: normalizedEstado,
      },
      client
    );

    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hashedPassword = await bcrypt.hash(contrasena, salt);

    const nuevaCuenta = await repo.insertCuenta(
      { usuario: normalizedUsuario, contrasena: hashedPassword, id_usuarios: nuevoUsuario.id },
      client
    );

    await client.query('COMMIT');

    return {
      id: nuevoUsuario.id,
      nombre: nuevoUsuario.nombre,
      apellido: nuevoUsuario.apellido,
      email: nuevoUsuario.email,
      usuario: nuevaCuenta.usuario,
      id_roles: nuevoUsuario.id_roles,
      estado: nuevoUsuario.estado,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ─── Actualización ──────────────────────────────────────────────────────

async function updateUsuario(id, body, requestingUserId) {
  const { nombre, apellido, email, id_roles, estado } = body;

  // Regla 1: nadie puede cambiar su propio rol.
  if (requestingUserId.toString() === id.toString() && id_roles) {
    throw new ServiceError(403, {
      error: 'No puedes cambiar tu propio rol',
      message:
        'Por seguridad, no está permitido modificar tu propio rol. Contacta a otro administrador.',
    });
  }

  const target = await repo.findAdminFlags(id);
  if (!target) {
    throw new ServiceError(404, { error: 'Usuario no encontrado' });
  }

  // Regla 2: sólo un Super Admin puede modificar a otro Super Admin.
  const requestingIsSuperAdmin = await repo.isSuperAdmin(requestingUserId);
  if (target.es_super_admin && !requestingIsSuperAdmin) {
    throw new ServiceError(403, {
      error: 'No tienes permisos para modificar un Super Admin',
      message: 'Solo otro Super Admin puede modificar la información de un Super Admin',
    });
  }

  return repo.updateUsuarioBasic(id, { nombre, apellido, email, id_roles, estado });
}

async function updateUsuarioConCuenta(id, body) {
  const { nombre, apellido, email, usuario, nueva_contrasena } = body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const currentUser = await repo.findById(id, client);
    if (!currentUser) {
      throw new ServiceError(404, { error: 'Usuario no encontrado' });
    }

    // Datos en tabla usuarios: sólo los campos que realmente cambian.
    if (nombre || apellido || email !== undefined) {
      const fields = {};

      if (nombre && nombre.trim() !== currentUser.nombre) {
        fields.nombre = nombre.trim();
      }
      if (apellido && apellido.trim() !== currentUser.apellido) {
        fields.apellido = apellido.trim();
      }
      if (email !== undefined && email.toLowerCase().trim() !== currentUser.email.toLowerCase()) {
        const normalizedEmail = email.toLowerCase().trim();
        if (!isValidEmail(normalizedEmail)) {
          throw new ServiceError(400, { error: 'Formato de email inválido' });
        }
        const conflict = await repo.findByEmailNormalizedExcluding(normalizedEmail, id, client);
        if (conflict) {
          throw new ServiceError(400, {
            error: `Ya existe un usuario con este email: ${conflict.nombre} ${conflict.apellido}`,
          });
        }
        fields.email = normalizedEmail;
      }

      await repo.updateUsuarioFields(id, fields, client);
    }

    // Datos en cuentas_usuarios.
    const accountFields = {};

    if (usuario) {
      const conflict = await repo.findCuentaByUsuarioNormalizedExcluding(
        usuario.toLowerCase().trim(),
        id,
        client
      );
      if (conflict) {
        throw new ServiceError(400, {
          error: `Ya existe una cuenta con este nombre de usuario: ${conflict.usuario}`,
        });
      }
      accountFields.usuario = usuario.trim();
    }

    if (nueva_contrasena) {
      if (nueva_contrasena.length < MIN_PASSWORD_LENGTH) {
        throw new ServiceError(400, { error: 'La contraseña debe tener al menos 8 caracteres' });
      }
      const salt = await bcrypt.genSalt(SALT_ROUNDS);
      accountFields.contrasena = await bcrypt.hash(nueva_contrasena, salt);
    }

    await repo.updateCuentaFields(id, accountFields, client);

    await client.query('COMMIT');

    return repo.findWithCuentaById(id);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function setEstado(id, estado) {
  const usuario = await repo.updateEstado(id, estado);
  if (!usuario) {
    throw new ServiceError(404, { error: 'Usuario no encontrado' });
  }
  return usuario;
}

// ─── Borrado ────────────────────────────────────────────────────────────

async function deleteUsuario(id) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await repo.deleteCuentaByUsuario(id, client);
    const eliminado = await repo.deleteUsuario(id, client);

    if (!eliminado) {
      throw new ServiceError(404, { error: 'Usuario no encontrado' });
    }

    await client.query('COMMIT');
    return eliminado;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  listUsuarios,
  getUsuarioById,
  getUsuariosByEstado,
  getUsuariosByRol,
  createUsuarioSimple,
  createUsuarioConCuenta,
  updateUsuario,
  updateUsuarioConCuenta,
  setEstado,
  deleteUsuario,
};
