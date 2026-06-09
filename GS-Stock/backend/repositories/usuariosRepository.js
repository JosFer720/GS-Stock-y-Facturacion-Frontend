// Repositorio de Usuarios: único lugar con SQL para `usuarios` y `cuentas_usuarios`.
// Cada función recibe un `executor` (pool compartido o client de transacción).
const pool = require('../db');

// ─── Lectura ────────────────────────────────────────────────────────────

async function findAllBasic(executor = pool) {
  const result = await executor.query(
    'SELECT id, id_roles, nombre, apellido, email, estado, es_super_admin FROM usuarios'
  );
  return result.rows;
}

// Usuario + nombre de cuenta (LEFT JOIN con cuentas_usuarios).
async function findWithCuentaById(id, executor = pool) {
  const result = await executor.query(
    `SELECT u.id, u.nombre, u.apellido, u.email, u.id_roles, u.estado, cu.usuario
       FROM usuarios u
       LEFT JOIN cuentas_usuarios cu ON u.id = cu.id_usuarios
       WHERE u.id = $1`,
    [id]
  );
  return result.rows[0];
}

async function findById(id, executor = pool) {
  const result = await executor.query('SELECT * FROM usuarios WHERE id = $1', [id]);
  return result.rows[0];
}

async function findAdminFlags(id, executor = pool) {
  const result = await executor.query(
    'SELECT es_super_admin, id_roles FROM usuarios WHERE id = $1',
    [id]
  );
  return result.rows[0];
}

async function isSuperAdmin(id, executor = pool) {
  const result = await executor.query('SELECT es_super_admin FROM usuarios WHERE id = $1', [id]);
  return result.rows[0]?.es_super_admin || false;
}

async function findByEstado(estado, executor = pool) {
  const result = await executor.query('SELECT * FROM usuarios WHERE estado = $1', [estado]);
  return result.rows;
}

async function findByRol(idRol, executor = pool) {
  const result = await executor.query('SELECT * FROM usuarios WHERE id_roles = $1', [idRol]);
  return result.rows;
}

// Coincidencias de email/usuario (para validar unicidad).
async function findByEmailNormalized(email, executor = pool) {
  const result = await executor.query(
    'SELECT id, nombre, apellido, email FROM usuarios WHERE LOWER(TRIM(email)) = $1',
    [email]
  );
  return result.rows[0];
}

async function findByEmailNormalizedExcluding(email, excludeId, executor = pool) {
  const result = await executor.query(
    'SELECT id, nombre, apellido FROM usuarios WHERE LOWER(TRIM(email)) = $1 AND id != $2',
    [email, excludeId]
  );
  return result.rows[0];
}

async function findCuentaByUsuarioNormalized(usuario, executor = pool) {
  const result = await executor.query(
    'SELECT id_usuarios, usuario FROM cuentas_usuarios WHERE LOWER(TRIM(usuario)) = $1',
    [usuario]
  );
  return result.rows[0];
}

async function findCuentaByUsuarioNormalizedExcluding(usuario, excludeId, executor = pool) {
  const result = await executor.query(
    'SELECT id_usuarios, usuario FROM cuentas_usuarios WHERE LOWER(TRIM(usuario)) = $1 AND id_usuarios != $2',
    [usuario, excludeId]
  );
  return result.rows[0];
}

// ─── Escritura ──────────────────────────────────────────────────────────

async function insertUsuarioSimple({ nombre, apellido, email, id_roles, estado }, executor = pool) {
  const result = await executor.query(
    'INSERT INTO usuarios (nombre, apellido, email, id_roles, estado) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [nombre, apellido, email, id_roles, estado]
  );
  return result.rows[0];
}

async function insertUsuario({ nombre, apellido, email, id_roles, estado }, executor = pool) {
  const result = await executor.query(
    'INSERT INTO usuarios (nombre, apellido, email, id_roles, estado) VALUES ($1, $2, $3, $4, $5) RETURNING id, nombre, apellido, email, id_roles, estado',
    [nombre, apellido, email, id_roles, estado]
  );
  return result.rows[0];
}

async function insertCuenta({ usuario, contrasena, id_usuarios }, executor = pool) {
  const result = await executor.query(
    'INSERT INTO cuentas_usuarios (usuario, contrasena, id_usuarios) VALUES ($1, $2, $3) RETURNING usuario, id_usuarios',
    [usuario, contrasena, id_usuarios]
  );
  return result.rows[0];
}

async function updateUsuarioBasic(
  id,
  { nombre, apellido, email, id_roles, estado },
  executor = pool
) {
  const result = await executor.query(
    'UPDATE usuarios SET nombre = $1, apellido = $2, email = $3, id_roles = $4, estado = $5 WHERE id = $6 RETURNING *',
    [nombre, apellido, email, id_roles, estado, id]
  );
  return result.rows[0];
}

// Actualización parcial de `usuarios`: sólo las columnas presentes en `fields`.
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

async function updateEstado(id, estado, executor = pool) {
  const result = await executor.query(
    'UPDATE usuarios SET estado = $1 WHERE id = $2 RETURNING *',
    [estado, id]
  );
  return result.rows[0];
}

async function deleteCuentaByUsuario(idUsuario, executor = pool) {
  await executor.query('DELETE FROM cuentas_usuarios WHERE id_usuarios = $1', [idUsuario]);
}

async function deleteUsuario(id, executor = pool) {
  const result = await executor.query('DELETE FROM usuarios WHERE id = $1 RETURNING *', [id]);
  return result.rows[0];
}

module.exports = {
  findAllBasic,
  findWithCuentaById,
  findById,
  findAdminFlags,
  isSuperAdmin,
  findByEstado,
  findByRol,
  findByEmailNormalized,
  findByEmailNormalizedExcluding,
  findCuentaByUsuarioNormalized,
  findCuentaByUsuarioNormalizedExcluding,
  insertUsuarioSimple,
  insertUsuario,
  insertCuenta,
  updateUsuarioBasic,
  updateUsuarioFields,
  updateCuentaFields,
  updateEstado,
  deleteCuentaByUsuario,
  deleteUsuario,
};
