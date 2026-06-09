// Repositorio de Users (/api/user): SQL de usuarios y cuentas_usuarios.
// Cada función recibe un `executor` (pool compartido o client de transacción).
const pool = require('../db');

// Usuario con su rol (usado por el middleware de autorización).
async function findUserWithRole(id, executor = pool) {
  const result = await executor.query(
    `SELECT u.id, u.nombre, u.apellido, r.rol
       FROM usuarios u
       JOIN roles r ON u.id_roles = r.id
       WHERE u.id = $1`,
    [id]
  );
  return result.rows[0];
}

async function findUsuarioActual(id, executor = pool) {
  const result = await executor.query(
    `SELECT u.id, u.nombre, u.apellido, r.rol, cu.usuario, cu.email
       FROM Usuarios u
       JOIN Roles r ON u.id_roles = r.id
       LEFT JOIN Cuentas_Usuarios cu ON u.id = cu.id_usuarios
       WHERE u.id = $1`,
    [id]
  );
  return result.rows[0];
}

async function findVendedorInfo(id, executor = pool) {
  const result = await executor.query(
    `SELECT u.Id, u.Nombre, u.Apellido, u.Email, r.Rol, cu.Usuario as nombre_usuario
       FROM Usuarios u
       JOIN Roles r ON u.Id_Roles = r.Id
       JOIN Cuentas_Usuarios cu ON u.Id = cu.Id_Usuarios
       WHERE u.Id = $1`,
    [id]
  );
  return result.rows[0];
}

async function existsById(id, executor = pool) {
  const result = await executor.query('SELECT u.id FROM usuarios u WHERE u.id = $1', [id]);
  return result.rows.length > 0;
}

async function findCuentaByUsuario(usuario, executor = pool) {
  const result = await executor.query('SELECT * FROM cuentas_usuarios WHERE usuario = $1', [usuario]);
  return result.rows[0];
}

async function findCuentaByEmail(email, executor = pool) {
  const result = await executor.query('SELECT * FROM cuentas_usuarios WHERE email = $1', [email]);
  return result.rows[0];
}

async function findCuentaByUsuarioExcluding(usuario, excludeId, executor = pool) {
  const result = await executor.query(
    'SELECT id_usuarios FROM cuentas_usuarios WHERE usuario = $1 AND id_usuarios != $2',
    [usuario, excludeId]
  );
  return result.rows[0];
}

async function findCuentaByEmailExcluding(email, excludeId, executor = pool) {
  const result = await executor.query(
    'SELECT id_usuarios FROM cuentas_usuarios WHERE email = $1 AND id_usuarios != $2',
    [email, excludeId]
  );
  return result.rows[0];
}

async function insertUsuario({ nombre, apellido, idRoles }, executor = pool) {
  const result = await executor.query(
    'INSERT INTO usuarios (nombre, apellido, id_roles) VALUES ($1, $2, $3) RETURNING id',
    [nombre, apellido, idRoles]
  );
  return result.rows[0].id;
}

async function insertCuenta({ usuario, email, contrasena, idUsuarios }, executor = pool) {
  await executor.query(
    'INSERT INTO cuentas_usuarios (usuario, email, contrasena, id_usuarios) VALUES ($1, $2, $3, $4)',
    [usuario, email, contrasena, idUsuarios]
  );
}

// Actualización parcial de `usuarios` (sólo columnas presentes en `fields`).
async function updateUsuarioFields(id, fields, executor = pool) {
  const keys = Object.keys(fields);
  if (keys.length === 0) return;
  const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
  const values = keys.map((key) => fields[key]);
  await executor.query(`UPDATE usuarios SET ${setClause} WHERE id = $${keys.length + 1}`, [
    ...values,
    id,
  ]);
}

// Actualización parcial de `cuentas_usuarios` por id_usuarios.
async function updateCuentaFields(idUsuario, fields, executor = pool) {
  const keys = Object.keys(fields);
  if (keys.length === 0) return;
  const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
  const values = keys.map((key) => fields[key]);
  await executor.query(
    `UPDATE cuentas_usuarios SET ${setClause} WHERE id_usuarios = $${keys.length + 1}`,
    [...values, idUsuario]
  );
}

async function findUpdatedUser(id, executor = pool) {
  const result = await executor.query(
    `SELECT u.id, u.nombre, u.apellido, r.rol, cu.usuario, cu.email
       FROM usuarios u
       JOIN roles r ON u.id_roles = r.id
       JOIN cuentas_usuarios cu ON u.id = cu.id_usuarios
       WHERE u.id = $1`,
    [id]
  );
  return result.rows[0];
}

async function deleteCuenta(idUsuario, executor = pool) {
  await executor.query('DELETE FROM cuentas_usuarios WHERE id_usuarios = $1', [idUsuario]);
}

async function deleteUsuario(id, executor = pool) {
  await executor.query('DELETE FROM usuarios WHERE id = $1', [id]);
}

// Asegura la existencia de la columna `activo` (migración perezosa del código original).
async function ensureActivoColumn(executor = pool) {
  await executor.query('ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT TRUE');
}

async function setActivo(id, activo, executor = pool) {
  await executor.query('UPDATE usuarios SET activo = $1 WHERE id = $2', [activo, id]);
}

module.exports = {
  findUserWithRole,
  findUsuarioActual,
  findVendedorInfo,
  existsById,
  findCuentaByUsuario,
  findCuentaByEmail,
  findCuentaByUsuarioExcluding,
  findCuentaByEmailExcluding,
  insertUsuario,
  insertCuenta,
  updateUsuarioFields,
  updateCuentaFields,
  findUpdatedUser,
  deleteCuenta,
  deleteUsuario,
  ensureActivoColumn,
  setActivo,
};
