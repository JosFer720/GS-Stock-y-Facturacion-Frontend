// Controlador de Auth: capa HTTP. Preserva los status y cuerpos de cada endpoint
// original, incluido el mapeo de errores de constraint de PostgreSQL.
const service = require('../services/authService');
const ServiceError = require('../utils/ServiceError');

function handleServiceError(err, res) {
  if (err instanceof ServiceError) {
    res.status(err.status).json(err.body);
    return true;
  }
  return false;
}

async function register(req, res) {
  try {
    const user = await service.register(req.body);
    res.status(201).json({ message: 'Usuario registrado correctamente', user });
  } catch (err) {
    if (handleServiceError(err, res)) return;
    console.error('Error en registro:', err);
    // Violación de restricción UNIQUE.
    if (err.code === '23505' && err.detail) {
      const detalle = err.detail.toLowerCase();
      if (detalle.includes('email')) {
        return res.status(400).json({ error: 'El email ya está registrado' });
      }
      if (detalle.includes('usuario')) {
        return res.status(400).json({ error: 'El nombre de usuario ya está en uso' });
      }
    }
    res.status(500).json({ error: 'Error en el servidor' });
  }
}

async function login(req, res) {
  try {
    const result = await service.login(req.body);
    res.json(result);
  } catch (err) {
    if (handleServiceError(err, res)) return;
    console.error('Error en login:', err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
}

function logout(req, res) {
  res.json({ message: 'Sesión cerrada correctamente' });
}

async function forgotPassword(req, res) {
  try {
    await service.forgotPassword(req.body.email);
    res.status(200).json({ message: 'Correo de recuperación enviado con éxito' });
  } catch (err) {
    if (handleServiceError(err, res)) return;
    console.error('Error en forgot-password:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
}

async function validateResetToken(req, res) {
  try {
    const result = await service.validateResetToken(req.body.token);
    res.json(result);
  } catch (err) {
    if (handleServiceError(err, res)) return;
    console.error('Error validando token:', err);
    res.status(500).json({ error: 'Error interno del servidor', valid: false });
  }
}

async function resetPassword(req, res) {
  try {
    const { token, newPassword } = req.body;
    const result = await service.resetPassword(token, newPassword);
    res.json(result);
  } catch (err) {
    if (handleServiceError(err, res)) return;
    console.error('Error en reset-password:', err);
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Conflicto en la base de datos.' });
    }
    if (err.code === '23503') {
      return res.status(400).json({ error: 'Usuario no válido.' });
    }
    res.status(500).json({ error: 'Error interno del servidor. Por favor, intenta más tarde.' });
  }
}

module.exports = {
  register,
  login,
  logout,
  forgotPassword,
  validateResetToken,
  resetPassword,
};
