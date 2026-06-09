// Servicio de Auth: registro, login (JWT), recuperación y cambio de contraseña.
// Lanza ServiceError para los casos esperados (400/401/404).
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../db');
const repo = require('../repositories/authRepository');
const ServiceError = require('../utils/ServiceError');
const { sendPasswordResetEmail } = require('./emailService');

// NOTA DE SEGURIDAD: el fallback hardcodeado del JWT_SECRET se conserva por
// compatibilidad, pero está pendiente de rotar y de eliminar (definir siempre
// JWT_SECRET por entorno). Ver nota de "secretos a rotar".
const JWT_SECRET = process.env.JWT_SECRET || 'fba7a07f4174d84d67ad67aedf16422a';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

const SALT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 8;
const RESET_TOKEN_HEX_LENGTH = 64;
const ROL_USUARIO_DEFAULT = 2;

// Limpia el token de reseteo: espacios, caracteres invisibles Unicode y deja
// sólo caracteres hexadecimales.
function normalizeResetToken(token) {
  return token
    .trim()
    .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '')
    .replace(/[^a-fA-F0-9]/g, '');
}

// ─── Registro ───────────────────────────────────────────────────────────

async function register(body) {
  const { nombre, usuario, email, contrasena } = body;

  if (!nombre?.trim() || !usuario?.trim() || !email?.trim() || !contrasena) {
    throw new ServiceError(400, { error: 'Todos los campos son obligatorios' });
  }
  if (contrasena.length < MIN_PASSWORD_LENGTH) {
    throw new ServiceError(400, { error: 'La contraseña debe tener al menos 8 caracteres' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const normalizedUsuario = usuario.trim();
  const normalizedNombre = nombre.trim();

  if (await repo.findCuentaByUsuario(normalizedUsuario.toLowerCase())) {
    throw new ServiceError(400, { error: 'El nombre de usuario ya está en uso' });
  }
  if (await repo.findEmailInUsuarios(normalizedEmail)) {
    throw new ServiceError(400, { error: 'El email ya está registrado' });
  }
  if (await repo.findEmailInCuentas(normalizedEmail)) {
    throw new ServiceError(400, { error: 'El email ya está registrado' });
  }

  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  const hashedPassword = await bcrypt.hash(contrasena, salt);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id: userId } = await repo.insertUsuario(
      {
        nombre: normalizedNombre,
        apellido: '',
        email: normalizedEmail,
        idRoles: ROL_USUARIO_DEFAULT,
        estado: true,
      },
      client
    );

    await repo.insertCuenta(
      {
        usuario: normalizedUsuario,
        email: normalizedEmail,
        contrasena: hashedPassword,
        idUsuarios: userId,
      },
      client
    );

    await client.query('COMMIT');

    return {
      id: userId,
      nombre: normalizedNombre,
      usuario: normalizedUsuario,
      email: normalizedEmail,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ─── Login ──────────────────────────────────────────────────────────────

async function login(body) {
  const { usuario, contrasena } = body;

  if (!usuario?.trim() || !contrasena) {
    throw new ServiceError(400, { error: 'Usuario y contraseña son obligatorios' });
  }

  const user = await repo.findLoginUserByUsuario(usuario.trim());
  if (!user) {
    throw new ServiceError(401, { error: 'Credenciales inválidas' });
  }
  if (!user.estado) {
    throw new ServiceError(401, { error: 'Error al ingresar. Contacta al administrador.' });
  }

  const validPassword = await bcrypt.compare(contrasena, user.contrasena);
  if (!validPassword) {
    throw new ServiceError(401, { error: 'Credenciales inválidas' });
  }

  const token = jwt.sign(
    { id: user.id, nombre: user.nombre, apellido: user.apellido, rol: user.rol },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  return {
    token,
    user: {
      id: user.id,
      nombre: user.nombre,
      apellido: user.apellido,
      rol: user.rol,
      estado: user.estado,
    },
  };
}

// ─── Recuperación de contraseña ─────────────────────────────────────────

async function forgotPassword(email) {
  if (!email?.trim()) {
    throw new ServiceError(400, { message: 'El correo es requerido' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  const user = await repo.findUsuarioByEmailForReset(normalizedEmail);
  if (!user) {
    throw new ServiceError(404, { message: 'Usuario no encontrado' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

  await repo.insertResetToken(user.id, token, expiresAt);

  const resetLink = `${process.env.FRONTEND_URL}/cambiar?token=${token}`;
  await sendPasswordResetEmail(normalizedEmail, user.nombre, resetLink);
}

async function validateResetToken(token) {
  if (!token?.trim()) {
    throw new ServiceError(400, { error: 'Token es requerido', valid: false });
  }

  const normalizedToken = normalizeResetToken(token);
  if (normalizedToken.length !== RESET_TOKEN_HEX_LENGTH) {
    throw new ServiceError(400, { error: 'Token inválido (longitud incorrecta)', valid: false });
  }

  const resetData = await repo.findResetToken(normalizedToken);
  if (!resetData) {
    throw new ServiceError(400, { error: 'Token inválido o expirado', valid: false });
  }
  if (resetData.used) {
    throw new ServiceError(400, { error: 'Este enlace ya fue utilizado', valid: false });
  }
  if (new Date(resetData.expires_at) < new Date()) {
    throw new ServiceError(400, { error: 'El enlace ha expirado. Solicita uno nuevo.', valid: false });
  }

  return {
    valid: true,
    message: 'Token válido',
    userName: resetData.nombre,
    expiresAt: resetData.expires_at,
  };
}

async function resetPassword(token, newPassword) {
  if (!token?.trim() || !newPassword) {
    throw new ServiceError(400, { error: 'Token y nueva contraseña son requeridos' });
  }
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    throw new ServiceError(400, { error: 'La contraseña debe tener al menos 8 caracteres' });
  }

  const normalizedToken = normalizeResetToken(token);
  if (normalizedToken.length !== RESET_TOKEN_HEX_LENGTH) {
    throw new ServiceError(400, { error: 'Token inválido (longitud incorrecta)' });
  }

  const resetData = await repo.findResetToken(normalizedToken);
  if (!resetData) {
    throw new ServiceError(400, { error: 'Token inválido.' });
  }
  if (resetData.used) {
    throw new ServiceError(400, { error: 'Este enlace ya fue utilizado.' });
  }
  if (new Date(resetData.expires_at) < new Date()) {
    throw new ServiceError(400, { error: 'El enlace ha expirado. Solicita uno nuevo.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

    const cuenta = await repo.findCuentaByIdUsuario(resetData.user_id, client);
    if (!cuenta) {
      throw new ServiceError(400, { error: 'Usuario no encontrado en el sistema.' });
    }

    const rowCount = await repo.updateCuentaPassword(hashedPassword, resetData.user_id, client);
    if (rowCount === 0) {
      throw new ServiceError(400, {
        error: 'No se pudo actualizar la contraseña. Usuario no encontrado.',
      });
    }

    await repo.markTokenUsed(resetData.id, client);
    await repo.deleteOldTokens(resetData.user_id, resetData.id, client);

    await client.query('COMMIT');

    return {
      message:
        'Contraseña actualizada correctamente. Ya puedes iniciar sesión con tu nueva contraseña.',
      success: true,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  register,
  login,
  forgotPassword,
  validateResetToken,
  resetPassword,
};
