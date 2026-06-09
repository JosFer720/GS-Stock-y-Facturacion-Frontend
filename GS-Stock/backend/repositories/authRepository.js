// Repositorio de Auth: SQL de cuentas/usuarios, login y tokens de reseteo.
// Cada función recibe un `executor` (pool compartido o client de transacción).
const pool = require('../db');

// ─── Registro / unicidad ────────────────────────────────────────────────

async function findCuentaByUsuario(usuarioLower, executor = pool) {
  const result = await executor.query(
    'SELECT usuario FROM cuentas_usuarios WHERE LOWER(TRIM(usuario)) = $1',
    [usuarioLower]
  );
  return result.rows[0];
}

async function findEmailInUsuarios(email, executor = pool) {
  const result = await executor.query(
    'SELECT email FROM usuarios WHERE LOWER(TRIM(email)) = $1',
    [email]
  );
  return result.rows[0];
}

async function findEmailInCuentas(email, executor = pool) {
  const result = await executor.query(
    'SELECT email FROM cuentas_usuarios WHERE LOWER(TRIM(email)) = $1',
    [email]
  );
  return result.rows[0];
}

async function insertUsuario({ nombre, apellido, email, idRoles, estado }, executor = pool) {
  const result = await executor.query(
    'INSERT INTO usuarios (nombre, apellido, email, id_roles, estado) VALUES ($1, $2, $3, $4, $5) RETURNING id',
    [nombre, apellido, email, idRoles, estado]
  );
  return result.rows[0];
}

async function insertCuenta({ usuario, email, contrasena, idUsuarios }, executor = pool) {
  await executor.query(
    'INSERT INTO cuentas_usuarios (usuario, email, contrasena, id_usuarios) VALUES ($1, $2, $3, $4)',
    [usuario, email, contrasena, idUsuarios]
  );
}

// ─── Login ──────────────────────────────────────────────────────────────

async function findLoginUserByUsuario(usuario, executor = pool) {
  const result = await executor.query(
    `SELECT u.id, u.nombre, u.apellido, u.estado, r.rol, cu.contrasena, cu.usuario
       FROM cuentas_usuarios cu
       JOIN usuarios u ON cu.id_usuarios = u.id
       JOIN roles r ON u.id_roles = r.id
       WHERE LOWER(TRIM(cu.usuario)) = LOWER(TRIM($1))`,
    [usuario]
  );
  return result.rows[0];
}

// ─── Reseteo de contraseña ──────────────────────────────────────────────

async function findUsuarioByEmailForReset(email, executor = pool) {
  const result = await executor.query(
    `SELECT u.id, u.nombre, u.email FROM usuarios u
       JOIN cuentas_usuarios cu ON u.id = cu.id_usuarios
       WHERE LOWER(TRIM(u.email)) = $1`,
    [email]
  );
  return result.rows[0];
}

async function insertResetToken(userId, token, expiresAt, executor = pool) {
  await executor.query(
    `INSERT INTO password_reset_tokens (user_id, token, expires_at, created_at)
       VALUES ($1, $2, $3, NOW())`,
    [userId, token, expiresAt]
  );
}

async function findResetToken(token, executor = pool) {
  const result = await executor.query(
    `SELECT prt.id, prt.user_id, prt.expires_at, prt.used, prt.token, u.nombre
       FROM password_reset_tokens prt
       JOIN usuarios u ON prt.user_id = u.id
       WHERE prt.token = $1`,
    [token]
  );
  return result.rows[0];
}

async function findCuentaByIdUsuario(userId, executor = pool) {
  const result = await executor.query(
    'SELECT id, usuario FROM cuentas_usuarios WHERE id_usuarios = $1',
    [userId]
  );
  return result.rows[0];
}

async function updateCuentaPassword(hashedPassword, userId, executor = pool) {
  const result = await executor.query(
    'UPDATE cuentas_usuarios SET contrasena = $1 WHERE id_usuarios = $2',
    [hashedPassword, userId]
  );
  return result.rowCount;
}

async function markTokenUsed(tokenId, executor = pool) {
  await executor.query('UPDATE password_reset_tokens SET used = TRUE WHERE id = $1', [tokenId]);
}

async function deleteOldTokens(userId, currentTokenId, executor = pool) {
  await executor.query(
    'DELETE FROM password_reset_tokens WHERE user_id = $1 AND id != $2 AND (used = TRUE OR expires_at < NOW())',
    [userId, currentTokenId]
  );
}

module.exports = {
  findCuentaByUsuario,
  findEmailInUsuarios,
  findEmailInCuentas,
  insertUsuario,
  insertCuenta,
  findLoginUserByUsuario,
  findUsuarioByEmailForReset,
  insertResetToken,
  findResetToken,
  findCuentaByIdUsuario,
  updateCuentaPassword,
  markTokenUsed,
  deleteOldTokens,
};
