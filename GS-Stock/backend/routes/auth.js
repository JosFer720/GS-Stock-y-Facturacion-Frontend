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

// Endpoint de registro de usuario - MEJORADO
router.post('/register', async (req, res) => {
  try {
    const { nombre, usuario, email, contrasena } = req.body;
    
    console.log('=== REGISTRO DE USUARIO ===');
    console.log('Datos recibidos:', { nombre, usuario, email: email?.toLowerCase().trim(), contrasena: '***' });
    
    // Validaciones básicas
    if (!nombre?.trim() || !usuario?.trim() || !email?.trim() || !contrasena) {
      console.log('❌ Campos obligatorios faltantes');
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }
    
    if (contrasena.length < 8) {
      console.log('❌ Contraseña muy corta');
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    }
    
    // Normalizar datos
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedUsuario = usuario.trim();
    const normalizedNombre = nombre.trim();
    
    // Verificar si el usuario ya existe
    const userCheck = await pool.query(
      'SELECT usuario FROM cuentas_usuarios WHERE LOWER(TRIM(usuario)) = $1',
      [normalizedUsuario.toLowerCase()]
    );
    
    if (userCheck.rows.length > 0) {
      console.log('❌ Usuario ya existe:', normalizedUsuario);
      return res.status(400).json({ error: 'El nombre de usuario ya está en uso' });
    }
    
    // Verificar si el email ya existe en usuarios
    const emailCheckUsuarios = await pool.query(
      'SELECT email FROM usuarios WHERE LOWER(TRIM(email)) = $1',
      [normalizedEmail]
    );
    
    if (emailCheckUsuarios.rows.length > 0) {
      console.log('❌ Email ya existe en usuarios:', normalizedEmail);
      return res.status(400).json({ error: 'El email ya está registrado' });
    }
    
    // Verificar si el email ya existe en cuentas_usuarios
    const emailCheckCuentas = await pool.query(
      'SELECT email FROM cuentas_usuarios WHERE LOWER(TRIM(email)) = $1',
      [normalizedEmail]
    );
    
    if (emailCheckCuentas.rows.length > 0) {
      console.log('❌ Email ya existe en cuentas:', normalizedEmail);
      return res.status(400).json({ error: 'El email ya está registrado' });
    }
    
    // Hash de la contraseña
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(contrasena, salt);
    
    // Iniciar transacción
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      console.log('🚀 Transacción de registro iniciada');
      
      const rolDefault = 2; // Asumiendo 2 para usuario normal, 1 para admin
      const userResult = await client.query(
        'INSERT INTO usuarios (nombre, apellido, email, id_roles, estado) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [normalizedNombre, '', normalizedEmail, rolDefault, true] 
      );
      
      const userId = userResult.rows[0].id;
      console.log('👤 Usuario creado en tabla usuarios:', userId);
      
      await client.query(
        'INSERT INTO cuentas_usuarios (usuario, email, contrasena, id_usuarios) VALUES ($1, $2, $3, $4)',
        [normalizedUsuario, normalizedEmail, hashedPassword, userId]
      );
      
      console.log('🔐 Cuenta creada en cuentas_usuarios');
      
      await client.query('COMMIT');
      console.log('✅ Registro completado exitosamente');
      
      res.status(201).json({ 
        message: 'Usuario registrado correctamente',
        user: {
          id: userId,
          nombre: normalizedNombre,
          usuario: normalizedUsuario,
          email: normalizedEmail
        }
      });
    } catch (transactionError) {
      await client.query('ROLLBACK');
      console.error('💥 Error en transacción de registro:', transactionError);
      throw transactionError;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('💀 Error general en registro:', err);
    
    // Manejar errores específicos de PostgreSQL
    if (err.code === '23505') { // Unique constraint violation
      if (err.detail && err.detail.toLowerCase().includes('email')) {
        return res.status(400).json({ error: 'El email ya está registrado' });
      } else if (err.detail && err.detail.toLowerCase().includes('usuario')) {
        return res.status(400).json({ error: 'El nombre de usuario ya está en uso' });
      }
    }
    
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Endpoint de login - VERSIÓN MEJORADA
router.post('/login', async (req, res) => {
  try {
    const { usuario, contrasena } = req.body;

    console.log('=== INTENTO DE LOGIN ===');
    console.log('Usuario:', usuario);

    if (!usuario?.trim() || !contrasena) {
      console.log('❌ Credenciales faltantes');
      return res.status(400).json({ error: 'Usuario y contraseña son obligatorios' });
    }

    // Consulta mejorada con normalización
    const result = await pool.query(
      `SELECT u.id, u.nombre, u.apellido, u.estado, r.rol, cu.contrasena, cu.usuario
       FROM cuentas_usuarios cu
       JOIN usuarios u ON cu.id_usuarios = u.id
       JOIN roles r ON u.id_roles = r.id
       WHERE LOWER(TRIM(cu.usuario)) = LOWER(TRIM($1))`,
      [usuario.trim()]
    );

    if (result.rows.length === 0) {
      console.log('❌ Usuario no encontrado:', usuario);
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const user = result.rows[0];
    console.log('👤 Usuario encontrado:', {
      id: user.id,
      nombre: user.nombre,
      estado: user.estado,
      rol: user.rol
    });

    if (!user.estado) {
      console.log('❌ Usuario desactivado');
      return res.status(401).json({ 
        error: 'Error al ingresar. Contacta al administrador.' 
      });
    }

    const validPassword = await bcrypt.compare(contrasena, user.contrasena);

    if (!validPassword) {
      console.log('❌ Contraseña inválida');
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    console.log('✅ Login exitoso');

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
        rol: user.rol,
        estado: user.estado 
      }
    });
  } catch (err) {
    console.error('💀 Error en login:', err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Endpoint de logout
router.post('/logout', (req, res) => {
  res.json({ message: 'Sesión cerrada correctamente' });
});

// Endpoint recuperación de contraseña - MEJORADO
const { sendPasswordResetEmail } = require('../services/emailService'); 

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  console.log('=== RECUPERACIÓN DE CONTRASEÑA ===');
  console.log('Email recibido:', email);

  if (!email?.trim()) {
    console.log('❌ Email faltante');
    return res.status(400).json({ message: 'El correo es requerido' });
  }

  try {
    const normalizedEmail = email.toLowerCase().trim();
    
    // Consulta mejorada con normalización
    const result = await pool.query(
      `SELECT u.id, u.nombre, u.email FROM usuarios u 
       JOIN cuentas_usuarios cu ON u.id = cu.id_usuarios 
       WHERE LOWER(TRIM(u.email)) = $1`,
      [normalizedEmail]
    );

    if (result.rowCount === 0) {
      console.log('❌ Usuario no encontrado para email:', normalizedEmail);
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const user = result.rows[0];
    console.log('👤 Usuario encontrado:', user.nombre);

    // Generar token de recuperación
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    console.log('🔐 Token generado, guardando en BD...');
    console.log('📏 Token length:', token.length);
    console.log('🔑 Token (DEBUG):', token);

    // Guardar token en la base de datos
    await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at, created_at) 
       VALUES ($1, $2, $3, NOW())`,
      [user.id, token, expiresAt]
    );

    const resetLink = `${process.env.FRONTEND_URL}/cambiar?token=${token}`;
    console.log('🔗 Reset link generado:', resetLink);

    await sendPasswordResetEmail(normalizedEmail, user.nombre, resetLink);

    console.log('✅ Email de recuperación enviado');
    res.status(200).json({ message: 'Correo de recuperación enviado con éxito' });

  } catch (err) {
    console.error('💀 Error en forgot-password:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// ENDPOINT TEMPORAL DE DEBUG - Obtener último token generado
router.get('/debug-last-token', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT token, expires_at, used, created_at, u.nombre, u.email
       FROM password_reset_tokens prt
       JOIN usuarios u ON prt.user_id = u.id
       ORDER BY created_at DESC
       LIMIT 1`
    );
    
    if (result.rows.length === 0) {
      return res.json({ message: 'No hay tokens' });
    }
    
    const tokenData = result.rows[0];
    res.json({
      token: tokenData.token,
      usuario: tokenData.nombre,
      email: tokenData.email,
      expires_at: tokenData.expires_at,
      used: tokenData.used,
      created_at: tokenData.created_at,
      url_local: `http://localhost:3001/cambiar?token=${tokenData.token}`,
      url_prod: `https://importadoragenser.com/cambiar?token=${tokenData.token}`
    });
  } catch (err) {
    console.error('Error obteniendo último token:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Endpoint para validar token de reset - MEJORADO
router.post('/validate-reset-token', async (req, res) => {
  console.log('🚨 ENDPOINT /validate-reset-token ALCANZADO');
  console.log('📦 Request body completo:', req.body);
  console.log('📦 Request headers:', req.headers);
  
  const { token } = req.body;
  
  console.log('=== VALIDANDO TOKEN ===');
  console.log('Token recibido (raw):', token);
  console.log('Token presente?:', token ? 'SÍ' : 'NO');
  console.log('Token length:', token?.length);
  console.log('Token bytes:', token ? Buffer.from(token).toString('hex').substring(0, 100) : 'N/A');
  
  try {
    if (!token?.trim()) {
      console.log('❌ Token vacío');
      return res.status(400).json({ error: 'Token es requerido', valid: false });
    }
    
    // Normalizar el token - eliminar espacios, caracteres especiales invisibles y solo tomar caracteres válidos hex
    let normalizedToken = token.trim();
    // Eliminar caracteres de espacio de ancho cero y otros caracteres invisibles Unicode
    normalizedToken = normalizedToken.replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '');
    // Asegurar que solo contenga caracteres hexadecimales válidos
    normalizedToken = normalizedToken.replace(/[^a-fA-F0-9]/g, '');
    
    console.log('🔍 Token normalizado length:', normalizedToken.length);
    console.log('🔍 Token normalizado:', normalizedToken);
    
    // Validar que el token tenga el tamaño correcto (64 caracteres hex)
    if (normalizedToken.length !== 64) {
      console.log('❌ Token con longitud incorrecta. Esperado: 64, Recibido:', normalizedToken.length);
      return res.status(400).json({ 
        error: 'Token inválido (longitud incorrecta)',
        valid: false 
      });
    }
    
    console.log('🔍 Buscando token en BD...');
    
    const tokenResult = await pool.query(
      `SELECT prt.id, prt.user_id, prt.expires_at, prt.used, prt.token, u.nombre 
       FROM password_reset_tokens prt
       JOIN usuarios u ON prt.user_id = u.id
       WHERE prt.token = $1`,
      [normalizedToken]
    );
    
    console.log('📊 Tokens encontrados:', tokenResult.rows.length);
    
    if (tokenResult.rows.length === 0) {
      console.log('❌ Token no encontrado en BD');
      
      // DEBUG: Mostrar tokens recientes en desarrollo
      if (process.env.NODE_ENV === 'development') {
        const allTokens = await pool.query(
          `SELECT LEFT(token, 10) as token_preview, LENGTH(token) as length, 
           used, expires_at, created_at 
           FROM password_reset_tokens 
           ORDER BY created_at DESC LIMIT 5`
        );
        console.log('🔍 Últimos 5 tokens en BD:', allTokens.rows);
      }
      
      return res.status(400).json({ 
        error: 'Token inválido o expirado',
        valid: false 
      });
    }
    
    const resetData = tokenResult.rows[0];
    const now = new Date();
    const expiresAt = new Date(resetData.expires_at);
    
    console.log('📋 Validando datos del token:', {
      id: resetData.id,
      used: resetData.used,
      expires_at: expiresAt.toISOString(),
      now: now.toISOString(),
      expired: expiresAt < now
    });
    
    // Verificar si está usado
    if (resetData.used) {
      console.log('❌ Token ya fue usado');
      return res.status(400).json({ 
        error: 'Este enlace ya fue utilizado',
        valid: false 
      });
    }
    
    // Verificar si expiró
    if (expiresAt < now) {
      console.log('❌ Token expirado');
      return res.status(400).json({ 
        error: 'El enlace ha expirado. Solicita uno nuevo.',
        valid: false 
      });
    }
    
    console.log('✅ Token válido');
    
    res.json({ 
      valid: true,
      message: 'Token válido',
      userName: resetData.nombre,
      expiresAt: resetData.expires_at
    });
    
  } catch (err) {
    console.error('💀 Error validando token:', err);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      valid: false 
    });
  }
});

// Endpoint para cambiar contraseña - VERSIÓN MEJORADA
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  
  console.log('=== INICIANDO RESET-PASSWORD ===');
  console.log('Token recibido:', token ? 'presente' : 'ausente');
  console.log('Token length:', token?.length);
  console.log('Token bytes:', token ? Buffer.from(token).toString('hex').substring(0, 100) : 'N/A');
  console.log('Password recibido:', newPassword ? `presente (${newPassword.length} chars)` : 'ausente');
  
  try {
    // Validar datos de entrada
    if (!token?.trim() || !newPassword) {
      console.log('❌ Datos faltantes:', { token: !!token, newPassword: !!newPassword });
      return res.status(400).json({ error: 'Token y nueva contraseña son requeridos' });
    }
    
    // Validar longitud mínima de contraseña
    if (newPassword.length < 8) {
      console.log('❌ Contraseña muy corta:', newPassword.length);
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    }
    
    // Normalizar el token - eliminar espacios, caracteres especiales invisibles y solo tomar caracteres válidos hex
    let normalizedToken = token.trim();
    // Eliminar caracteres de espacio de ancho cero y otros caracteres invisibles Unicode
    normalizedToken = normalizedToken.replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '');
    // Asegurar que solo contenga caracteres hexadecimales válidos
    normalizedToken = normalizedToken.replace(/[^a-fA-F0-9]/g, '');
    
    console.log('🔍 Token normalizado length:', normalizedToken.length);
    console.log('🔍 Token normalizado:', normalizedToken);
    
    // Validar que el token tenga el tamaño correcto (64 caracteres hex)
    if (normalizedToken.length !== 64) {
      console.log('❌ Token con longitud incorrecta. Esperado: 64, Recibido:', normalizedToken.length);
      return res.status(400).json({ 
        error: 'Token inválido (longitud incorrecta)'
      });
    }
    
    console.log('✅ Validaciones básicas pasadas');
    console.log('🔍 Buscando token en la base de datos...');
    
    // Buscar token válido en la base de datos
    const tokenResult = await pool.query(
      `SELECT prt.id, prt.user_id, prt.expires_at, prt.used, u.nombre 
       FROM password_reset_tokens prt
       JOIN usuarios u ON prt.user_id = u.id
       WHERE prt.token = $1`,
      [normalizedToken]
    );
    
    console.log('📊 Resultados de búsqueda de token:', tokenResult.rows.length);
    
    if (tokenResult.rows.length === 0) {
      console.log('❌ Token no encontrado en la base de datos');
      return res.status(400).json({ error: 'Token inválido.' });
    }
    
    const resetData = tokenResult.rows[0];
    console.log('📋 Datos del token encontrado:', {
      id: resetData.id,
      user_id: resetData.user_id,
      used: resetData.used,
      expires_at: resetData.expires_at,
      current_time: new Date().toISOString()
    });
    
    // Verificar si el token ya fue usado
    if (resetData.used) {
      console.log('❌ Token ya fue usado');
      return res.status(400).json({ error: 'Este enlace ya fue utilizado.' });
    }
    
    // Verificar si el token expiró
    const now = new Date();
    const expiresAt = new Date(resetData.expires_at);
    
    if (expiresAt < now) {
      console.log('❌ Token expirado:', { expiresAt: expiresAt.toISOString(), now: now.toISOString() });
      return res.status(400).json({ error: 'El enlace ha expirado. Solicita uno nuevo.' });
    }
    
    console.log('✅ Token válido y no expirado');
    console.log('🚀 Iniciando proceso de cambio de contraseña...');
    
    // Iniciar transacción
    const client = await pool.connect();
    console.log('🔌 Conexión a base de datos establecida');
    
    try {
      await client.query('BEGIN');
      console.log('🚀 Transacción iniciada');
      
      // Generar hash de la nueva contraseña
      const saltRounds = 12; 
      console.log('🔐 Generando hash de contraseña...');
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
      console.log('✅ Hash de contraseña generado');
      
      // Verificar que el usuario existe en cuentas_usuarios
      console.log('👤 Verificando existencia del usuario...');
      const userExists = await client.query(
        'SELECT id, usuario FROM cuentas_usuarios WHERE id_usuarios = $1',
        [resetData.user_id]
      );
      
      console.log('📊 Usuario encontrado en cuentas_usuarios:', userExists.rows.length);
      
      if (userExists.rows.length === 0) {
        console.log('❌ Usuario no encontrado en cuentas_usuarios');
        throw new Error('Usuario no encontrado en el sistema.');
      }
      
      // Actualizar contraseña del usuario
      console.log('🔄 Actualizando contraseña...');
      const updateResult = await client.query(
        'UPDATE cuentas_usuarios SET contrasena = $1 WHERE id_usuarios = $2',
        [hashedPassword, resetData.user_id]
      );
      
      console.log('📊 Resultado de actualización:', {
        rowCount: updateResult.rowCount,
        command: updateResult.command
      });
      
      if (updateResult.rowCount === 0) {
        console.log('❌ No se actualizó ninguna fila');
        throw new Error('No se pudo actualizar la contraseña. Usuario no encontrado.');
      }
      
      // Marcar el token como usado
      console.log('✅ Marcando token como usado...');
      const markUsedResult = await client.query(
        'UPDATE password_reset_tokens SET used = TRUE WHERE id = $1',
        [resetData.id]
      );
      
      console.log('📊 Token marcado como usado:', markUsedResult.rowCount);
      
      // Limpiar otros tokens del usuario (opcional pero recomendado)
      console.log('🧹 Limpiando tokens antiguos...');
      const deleteResult = await client.query(
        'DELETE FROM password_reset_tokens WHERE user_id = $1 AND id != $2 AND (used = TRUE OR expires_at < NOW())',
        [resetData.user_id, resetData.id]
      );
      console.log('📊 Tokens antiguos eliminados:', deleteResult.rowCount);
      
      await client.query('COMMIT');
      console.log('✅ Transacción confirmada exitosamente');
      
      console.log(`🎉 ÉXITO: Contraseña actualizada para usuario: ${resetData.nombre} (ID: ${resetData.user_id})`);
      
      res.json({ 
        message: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión con tu nueva contraseña.',
        success: true
      });
      
    } catch (transactionError) {
      await client.query('ROLLBACK');
      console.error('💥 Error en la transacción, rollback realizado:', transactionError);
      throw transactionError;
    } finally {
      client.release();
      console.log('🔌 Conexión liberada');
    }
    
  } catch (err) {
    console.error('💀 ERROR COMPLETO EN RESET-PASSWORD:', err);
    console.error('Stack trace:', err.stack);
    
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
    }
    
    res.status(statusCode).json({ error: errorMessage });
  }
});

// Endpoint de DEBUG - SOLO DESARROLLO
if (process.env.NODE_ENV === 'development') {
  router.get('/debug-tokens', async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT 
          id, 
          user_id, 
          LEFT(token, 10) as token_preview, 
          LENGTH(token) as token_length,
          used, 
          expires_at,
          created_at,
          expires_at > NOW() as is_valid
         FROM password_reset_tokens 
         ORDER BY created_at DESC 
         LIMIT 10`
      );
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
}

module.exports = router;