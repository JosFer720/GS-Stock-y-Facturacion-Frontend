const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'admin',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'mydb',
  password: process.env.DB_PASSWORD || 'secret',
  port: process.env.DB_PORT || 5432,
  client_encoding: 'utf8' 
});

const JWT_SECRET = process.env.JWT_SECRET || 'fba7a07f4174d84d67ad67aedf16422a';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

// Endpoint de registro de usuario
router.post('/register', async (req, res) => {
  try {
    const { nombre, usuario, email, contrasena } = req.body;
    
    // Verificar si el usuario ya existe
    const userCheck = await pool.query(
      'SELECT * FROM cuentas_usuarios WHERE usuario = $1',
      [usuario]
    );
    
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ error: 'El nombre de usuario ya está en uso' });
    }
    
    // Verificar si el email ya existe
    const emailCheck = await pool.query(
      'SELECT * FROM cuentas_usuarios WHERE email = $1',
      [email]
    );
    
    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }
    
    // Hash de la contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(contrasena, salt);
    
    // Iniciar transacción
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const rolDefault = 2; // Asumiendo 2 para usuario normal, 1 para admin
      const userResult = await client.query(
        'INSERT INTO usuarios (nombre, apellido, id_roles) VALUES ($1, $2, $3) RETURNING id',
        [nombre, '', rolDefault] 
      );
      
      const userId = userResult.rows[0].id;
      
      await client.query(
        'INSERT INTO cuentas_usuarios (usuario, email, contrasena, id_usuarios) VALUES ($1, $2, $3, $4)',
        [usuario, email, hashedPassword, userId]
      );
      
      await client.query('COMMIT');
      
      res.status(201).json({ 
        message: 'Usuario registrado correctamente',
        user: {
          id: userId,
          nombre: nombre,
          usuario: usuario,
          email: email
        }
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error en registro:', err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Endpoint de login
router.post('/login', async (req, res) => {
  try {
    const { usuario, contrasena } = req.body;

    const result = await pool.query(
      `SELECT u.id, u.nombre, u.apellido, r.rol, cu.contrasena 
      FROM cuentas_usuarios cu
      JOIN usuarios u ON cu.id_usuarios = u.id
      JOIN roles r ON u.id_roles = r.id
      WHERE cu.usuario = $1`,
      [usuario]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(contrasena, user.contrasena);

    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign({
      id: user.id,
      nombre: user.nombre,
      apellido: user.apellido,
      rol: user.rol
    }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    res.json({
      token,
      user: {
        id: user.id,
        nombre: user.nombre,
        apellido: user.apellido,
        rol: user.rol
      }
    });
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Endpoint de logout
router.post('/logout', (req, res) => {
  res.json({ message: 'Sesión cerrada correctamente' });
});

// Endpoint recuperación de contraseña 
const { sendPasswordResetEmail } = require('../services/emailService'); 

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'El correo es requerido' });
  }

  try {
    // Corregir la consulta SQL - el email está en la tabla usuarios, no en cuentas_usuarios
    const result = await pool.query(
      `SELECT u.id, u.nombre, u.email FROM usuarios u 
       JOIN cuentas_usuarios cu ON u.id = cu.id_usuarios 
       WHERE u.email = $1`,
      [email]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const user = result.rows[0];

    // Generar token de recuperación
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    // Guardar token en la base de datos
    await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at, created_at) 
       VALUES ($1, $2, $3, NOW())`,
      [user.id, token, expiresAt]
    );

    const resetLink = `${process.env.FRONTEND_URL}/cambiar?token=${token}`;

    await sendPasswordResetEmail(email, user.nombre, resetLink);

    res.status(200).json({ message: 'Correo de recuperación enviado con éxito' });

  } catch (err) {
    console.error('Error en forgot-password:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Endpoint para cambiar contraseña
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  
  console.log('=== INICIANDO RESET-PASSWORD ===');
  console.log('Token recibido:', token ? 'presente' : 'ausente');
  console.log('Password recibido:', newPassword ? `presente (${newPassword.length} chars)` : 'ausente');
  
  try {
    // Validar datos de entrada
    if (!token || !newPassword) {
      console.log('Datos faltantes:', { token: !!token, newPassword: !!newPassword });
      return res.status(400).json({ error: 'Token y nueva contraseña son requeridos' });
    }
    
    // Validar longitud mínima de contraseña
    if (newPassword.length < 8) {
      console.log('Contraseña muy corta:', newPassword.length);
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    }
    
    console.log('Validaciones básicas pasadas');
    console.log('Buscando token en la base de datos...');
    
    // Buscar token válido en la base de datos
    const tokenResult = await pool.query(
      `SELECT prt.id, prt.user_id, prt.expires_at, prt.used, u.nombre 
       FROM password_reset_tokens prt
       JOIN usuarios u ON prt.user_id = u.id
       WHERE prt.token = $1`,
      [token]
    );
    
    console.log('Resultados de búsqueda de token:', tokenResult.rows.length);
    
    if (tokenResult.rows.length === 0) {
      console.log('Token no encontrado en la base de datos');
      return res.status(400).json({ error: 'Token inválido.' });
    }
    
    const resetData = tokenResult.rows[0];
    console.log('Datos del token encontrado:', {
      id: resetData.id,
      user_id: resetData.user_id,
      used: resetData.used,
      expires_at: resetData.expires_at,
      current_time: new Date().toISOString()
    });
    
    // Verificar si el token ya fue usado
    if (resetData.used) {
      console.log('Token ya fue usado');
      return res.status(400).json({ error: 'Este enlace ya fue utilizado.' });
    }
    
    // Verificar si el token ha expirado
    const now = new Date();
    const expiresAt = new Date(resetData.expires_at);
    if (expiresAt < now) {
      console.log('Token expirado:', { expiresAt: expiresAt.toISOString(), now: now.toISOString() });
      return res.status(400).json({ error: 'El enlace ha expirado. Solicita uno nuevo.' });
    }
    
    console.log('Token válido y no expirado');
    console.log('Iniciando proceso de cambio de contraseña...');
    
    // Iniciar transacción
    const client = await pool.connect();
    console.log('Conexión a base de datos establecida');
    
    try {
      await client.query('BEGIN');
      console.log('Transacción iniciada');
      
      // Generar hash de la nueva contraseña
      const saltRounds = 12; 
      console.log('Generando hash de contraseña...');
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
      console.log('Hash de contraseña generado');
      
      // Verificar que el usuario existe en cuentas_usuarios
      console.log('Verificando existencia del usuario...');
      const userExists = await client.query(
        'SELECT id FROM cuentas_usuarios WHERE id_usuarios = $1',
        [resetData.user_id]
      );
      
      console.log('Usuario encontrado en cuentas_usuarios:', userExists.rows.length);
      
      if (userExists.rows.length === 0) {
        console.log('Usuario no encontrado en cuentas_usuarios');
        throw new Error('Usuario no encontrado en el sistema.');
      }
      
      // Actualizar contraseña del usuario
      console.log('Actualizando contraseña...');
      const updateResult = await client.query(
        'UPDATE cuentas_usuarios SET contrasena = $1 WHERE id_usuarios = $2',
        [hashedPassword, resetData.user_id]
      );
      
      console.log('Resultado de actualización:', {
        rowCount: updateResult.rowCount,
        command: updateResult.command
      });
      
      if (updateResult.rowCount === 0) {
        console.log('No se actualizó ninguna fila');
        throw new Error('No se pudo actualizar la contraseña. Usuario no encontrado.');
      }
      
      // Marcar el token como usado
      console.log('Marcando token como usado...');
      const markUsedResult = await client.query(
        'UPDATE password_reset_tokens SET used = TRUE WHERE id = $1',
        [resetData.id]
      );
      
      console.log('Token marcado como usado:', markUsedResult.rowCount);
      
      // Limpiar otros tokens del usuario (opcional pero recomendado)
      console.log('Limpiando tokens antiguos...');
      const deleteResult = await client.query(
        'DELETE FROM password_reset_tokens WHERE user_id = $1 AND id != $2 AND (used = TRUE OR expires_at < NOW())',
        [resetData.user_id, resetData.id]
      );
      console.log('Tokens antiguos eliminados:', deleteResult.rowCount);
      
      await client.query('COMMIT');
      console.log('Transacción confirmada exitosamente');
      
      console.log(`ÉXITO: Contraseña actualizada para usuario: ${resetData.nombre} (ID: ${resetData.user_id})`);
      
      res.json({ 
        message: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión con tu nueva contraseña.',
        success: true
      });
      
    } catch (transactionError) {
      await client.query('ROLLBACK');
      console.error('Error en la transacción, rollback realizado:', transactionError);
      throw transactionError;
    } finally {
      client.release();
      console.log('Conexión liberada');
    }
    
  } catch (err) {
    console.error('ERROR COMPLETO EN RESET-PASSWORD:', err);
    console.error('Stack trace:', err.stack);
    console.error('Error details:', {
      message: err.message,
      code: err.code,
      detail: err.detail,
      where: err.where
    });
    
    let errorMessage = 'Error interno del servidor. Por favor, intenta más tarde.';
    let statusCode = 500;
    
    if (err.code === '23505') { 
      errorMessage = 'Conflicto en la base de datos.';
      statusCode = 400;
    } else if (err.code === '23503') { 
      errorMessage = 'Usuario no válido.';
      statusCode = 400;
    } else if (err.message && (err.message.includes('actualizar') || err.message.includes('encontrado'))) {
      errorMessage = err.message;
      statusCode = 400;
    } else if (err.code === 'ECONNREFUSED') {
      errorMessage = 'Error de conexión a la base de datos.';
      console.error('🔌 Error de conexión a PostgreSQL');
    }
    
    res.status(statusCode).json({ error: errorMessage });
  }
});

router.post('/validate-reset-token', async (req, res) => {
  const { token } = req.body;
  
  console.log('=== VALIDANDO TOKEN ===');
  console.log('Token recibido:', token ? 'presente' : 'ausente');
  
  try {
    if (!token) {
      return res.status(400).json({ error: 'Token es requerido', valid: false });
    }
    
    const tokenResult = await pool.query(
      `SELECT prt.id, prt.user_id, prt.expires_at, prt.used, u.nombre 
       FROM password_reset_tokens prt
       JOIN usuarios u ON prt.user_id = u.id
       WHERE prt.token = $1`,
      [token]
    );
    
    console.log('Resultado validación token:', tokenResult.rows.length);
    
    if (tokenResult.rows.length === 0) {
      console.log('oken no encontrado');
      return res.status(400).json({ 
        error: 'Token inválido o expirado',
        valid: false 
      });
    }
    
    const resetData = tokenResult.rows[0];
    console.log('Validando datos del token:', {
      used: resetData.used,
      expires_at: resetData.expires_at,
      now: new Date().toISOString()
    });
    
    // Verificar si está usado o expirado
    if (resetData.used || new Date(resetData.expires_at) < new Date()) {
      console.log('Token usado o expirado');
      return res.status(400).json({ 
        error: 'Token inválido o expirado',
        valid: false 
      });
    }
    
    console.log('Token válido');
    
    res.json({ 
      valid: true,
      message: 'Token válido',
      userName: resetData.nombre,
      expiresAt: resetData.expires_at
    });
    
  } catch (err) {
    console.error('Error validando token:', err);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      valid: false 
    });
  }
});

module.exports = router;