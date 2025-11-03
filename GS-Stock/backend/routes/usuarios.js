const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const auth = require('../middleware/auth');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  user: process.env.DB_USER || 'admin',
  host: process.env.DB_HOST || 'postgres',
  database: process.env.DB_NAME || 'mydb',
  password: process.env.DB_PASSWORD || 'secret',
  port: process.env.DB_PORT || 5432,
});

// Obtener todos los usuarios
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, id_roles, nombre, apellido, email, estado, es_super_admin FROM usuarios');
    
    if (result.rows.length === 0) {
      return res.status(200).json({ message: 'No hay usuarios registrados', data: [] });
    }
    
    res.status(200).json({
      message: 'Usuarios obtenidos correctamente',
      count: result.rows.length,
      data: result.rows
    });
  } catch (err) {
    console.error('Error al obtener usuarios:', err);
    res.status(500).json({ 
      error: 'Error al consultar la base de datos',
      details: err.message
    });
  }
});

// Crear un nuevo usuario (versión simple sin cuenta de acceso)
router.post('/', auth, async (req, res) => {
  try {
    const { nombre, apellido, email, id_roles, estado } = req.body;
    
    if (!nombre || !apellido || !id_roles) {
      return res.status(400).json({ error: 'Nombre, apellido y rol son obligatorios' });
    }

    const result = await pool.query(
      'INSERT INTO usuarios (nombre, apellido, email, id_roles, estado) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [nombre, apellido, email, id_roles, estado]
    );

    res.status(201).json({
      message: 'Usuario creado correctamente',
      data: result.rows[0]
    });
  } catch (err) {
    console.error('Error al crear usuario:', err);
    res.status(500).json({ 
      error: 'Error al crear el usuario',
      details: err.message
    });
  }
});

// ENDPOINT MEJORADO: Crear usuario con cuenta de acceso completa - CORREGIDO
router.post('/create-with-account', auth, async (req, res) => {
  let client;

  console.log('🔍 Verificando conexión a la base de datos...');
  try {
    // Test connection
    const testResult = await pool.query('SELECT NOW() as current_time');
    console.log('✅ Conexión a BD verificada:', testResult.rows[0].current_time);
  } catch (connectionError) {
    console.error('❌ Error de conexión a la base de datos:', connectionError);
    return res.status(500).json({ 
      error: 'Error de conexión a la base de datos',
      details: 'No se pudo conectar a la base de datos'
    });
  }
  
  console.log('🔍 BACKEND - DATOS RECIBIDOS EN CRUDO:');
  console.log('Body completo:', req.body);
  console.log('Headers:', req.headers);
  console.log('Content-Type:', req.get('Content-Type'));

  // Verificar cada campo individualmente
  console.log('🔍 VERIFICACIÓN DE CAMPOS EN BACKEND:');
  console.log('- nombre:', req.body.nombre, '(type:', typeof req.body.nombre, ')');
  console.log('- apellido:', req.body.apellido, '(type:', typeof req.body.apellido, ')');
  console.log('- email:', req.body.email, '(type:', typeof req.body.email, ')');
  console.log('- usuario:', req.body.usuario, '(type:', typeof req.body.usuario, ')');
  console.log('- contrasena:', req.body.contrasena ? 'PRESENTE' : 'AUSENTE', '(type:', typeof req.body.contrasena, ')');
  console.log('- id_roles:', req.body.id_roles, '(type:', typeof req.body.id_roles, ')');
  console.log('- estado:', req.body.estado, '(type:', typeof req.body.estado, ')');

  try {
    const { nombre, apellido, email, usuario, contrasena, id_roles, estado } = req.body;
    
    console.log('=== CREANDO USUARIO CON CUENTA (DEBUG) ===');
    console.log('Datos recibidos:', { 
      nombre: nombre?.trim(), 
      apellido: apellido?.trim(), 
      email: email?.toLowerCase().trim(), 
      usuario: usuario?.trim(), 
      id_roles, 
      estado, 
      contrasena: contrasena ? `***${contrasena.length} chars***` : 'no proporcionado' 
    });
    
    console.log('🔍 ANALIZANDO ESTRUCTURA DE DATOS RECIBIDA:');
    console.log('Tipo de datos:', typeof req.body);
    console.log('Estructura completa:', JSON.stringify(req.body, null, 2));
    console.log('Campos presentes:', Object.keys(req.body));

    // Verificar campos críticos
    const camposRequeridos = ['nombre', 'apellido', 'email', 'usuario', 'contrasena', 'id_roles'];
    const camposFaltantes = camposRequeridos.filter(campo => !req.body[campo] && req.body[campo] !== 0);

    if (camposFaltantes.length > 0) {
      console.log('❌ CAMPOS FALTANTES:', camposFaltantes);
      return res.status(400).json({ 
        error: 'Campos obligatorios faltantes',
        details: `Faltan: ${camposFaltantes.join(', ')}`,
        camposRecibidos: Object.keys(req.body)
      });
    }

    // Validaciones básicas mejoradas - ORDEN CORRECTO
    if (!nombre?.trim()) {
      console.log('❌ Nombre faltante');
      return res.status(400).json({ error: 'El nombre es obligatorio' });
    }
    
    if (!apellido?.trim()) {
      console.log('❌ Apellido faltante');
      return res.status(400).json({ error: 'El apellido es obligatorio' });
    }
    
    if (!email?.trim()) {
      console.log('❌ Email faltante');
      return res.status(400).json({ error: 'El email es obligatorio' });
    }
    
    if (!usuario?.trim()) {
      console.log('❌ Usuario faltante');
      return res.status(400).json({ error: 'El nombre de usuario es obligatorio' });
    }
    
    if (!contrasena) {
      console.log('❌ Contraseña faltante');
      return res.status(400).json({ error: 'La contraseña es obligatoria' });
    }
    
    if (!id_roles) {
      console.log('❌ Rol faltante');
      return res.status(400).json({ error: 'El rol es obligatorio' });
    }
    
    // Normalizar datos PRIMERO
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedUsuario = usuario.trim();
    const normalizedNombre = nombre.trim();
    const normalizedApellido = apellido.trim();
    const normalizedEstado = estado !== undefined ? estado : true;
    
    console.log('📋 Datos normalizados:', {
      email: normalizedEmail,
      usuario: normalizedUsuario,
      nombre: normalizedNombre,
      apellido: normalizedApellido,
      id_roles: id_roles,
      estado: normalizedEstado
    });
    
    // Validaciones de formato DESPUÉS de normalizar
    if (contrasena.length < 8) {
      console.log('❌ Contraseña muy corta');
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    }
    
    // Validar formato de usuario (solo letras, números y guiones bajos)
    const userNameRegex = /^[a-zA-Z0-9_]+$/;
    if (!userNameRegex.test(normalizedUsuario)) {
      console.log('❌ Formato de usuario inválido:', normalizedUsuario);
      console.log('❌ Caracteres detectados:', normalizedUsuario.split('').map(c => `"${c}"`).join(', '));
      return res.status(400).json({ 
        error: 'El usuario solo puede contener letras, números y guiones bajos (_)',
        details: `Caracteres no permitidos detectados en: "${normalizedUsuario}"`
      });
    }
    
    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      console.log('❌ Formato de email inválido:', normalizedEmail);
      return res.status(400).json({ error: 'Formato de email inválido' });
    }

    // Validaciones de longitud
    if (normalizedNombre.length < 2) {
      console.log('❌ Nombre muy corto');
      return res.status(400).json({ error: 'El nombre debe tener al menos 2 caracteres' });
    }

    if (normalizedApellido.length < 2) {
      console.log('❌ Apellido muy corto');
      return res.status(400).json({ error: 'El apellido debe tener al menos 2 caracteres' });
    }

    if (normalizedUsuario.length < 3) {
      console.log('❌ Usuario muy corto');
      return res.status(400).json({ error: 'El nombre de usuario debe tener al menos 3 caracteres' });
    }
    
    // Verificar conexión a la base de datos
    console.log('🔍 Verificando conexión a la base de datos...');
    try {
      client = await pool.connect();
      console.log('✅ Conexión establecida exitosamente');
    } catch (connectionError) {
      console.error('❌ Error de conexión a la base de datos:', connectionError);
      return res.status(500).json({ 
        error: 'Error de conexión a la base de datos',
        details: process.env.NODE_ENV === 'development' ? connectionError.message : 'Error de conectividad'
      });
    }
    
    try {
      await client.query('BEGIN');
      console.log('🚀 Transacción iniciada');
      
      // VALIDACIÓN 1: Verificar email en tabla usuarios
      console.log('🔍 Verificando email en tabla usuarios...');
      let emailCheckUsuarios;
      try {
        emailCheckUsuarios = await client.query(
          'SELECT id, nombre, apellido, email FROM usuarios WHERE LOWER(TRIM(email)) = $1',
          [normalizedEmail]
        );
        console.log('✅ Consulta de verificación de email en usuarios ejecutada');
      } catch (queryError) {
        console.error('❌ Error en consulta de email usuarios:', queryError);
        throw new Error(`Error verificando email en usuarios: ${queryError.message}`);
      }
      
      if (emailCheckUsuarios.rows.length > 0) {
        const existingUser = emailCheckUsuarios.rows[0];
        console.log('❌ Email ya existe en usuarios:', {
          emailBuscado: normalizedEmail,
          usuarioExistente: existingUser
        });
        await client.query('ROLLBACK');
        return res.status(409).json({ 
          error: 'Ya existe un usuario con este email',
          details: `Email registrado para: ${existingUser.nombre} ${existingUser.apellido}` 
        });
      }
      console.log('✅ Email disponible en tabla usuarios');
      
      // VALIDACIÓN 2: Verificar usuario en tabla cuentas_usuarios
      console.log('🔍 Verificando usuario en tabla cuentas_usuarios...');
      let userCheckCuentas;
      try {
        userCheckCuentas = await client.query(
          'SELECT id_usuarios, usuario FROM cuentas_usuarios WHERE LOWER(TRIM(usuario)) = $1',
          [normalizedUsuario.toLowerCase()]
        );
        console.log('✅ Consulta de verificación de usuario en cuentas ejecutada');
      } catch (queryError) {
        console.error('❌ Error en consulta de usuario cuentas:', queryError);
        throw new Error(`Error verificando usuario en cuentas: ${queryError.message}`);
      }
      
      if (userCheckCuentas.rows.length > 0) {
        const existingAccount = userCheckCuentas.rows[0];
        console.log('❌ Usuario ya existe en cuentas_usuarios:', existingAccount);
        await client.query('ROLLBACK');
        return res.status(409).json({ 
          error: 'Ya existe un usuario con este nombre de usuario',
          details: `Usuario "${existingAccount.usuario}" ya está en uso`
        });
      }
      console.log('✅ Usuario disponible en tabla cuentas_usuarios');

      // VALIDACIÓN 3: CORREGIDO - Saltar verificación de email en cuentas_usuarios (la tabla no tiene columna email)
      console.log('🔍 Saltando verificación de email en cuentas_usuarios - la tabla no tiene columna email');
      console.log('✅ Validación de email en cuentas_usuarios omitida (columna no existe)');
      
      // PASO 1: Crear usuario en tabla usuarios
      console.log('👤 Creando usuario en tabla usuarios...');
      console.log('Parámetros para inserción:', {
        nombre: normalizedNombre,
        apellido: normalizedApellido,
        email: normalizedEmail,
        id_roles: id_roles,
        estado: normalizedEstado
      });
      
      let userResult;
      try {
        userResult = await client.query(
          'INSERT INTO usuarios (nombre, apellido, email, id_roles, estado) VALUES ($1, $2, $3, $4, $5) RETURNING id, nombre, apellido, email, id_roles, estado',
          [normalizedNombre, normalizedApellido, normalizedEmail, id_roles, normalizedEstado]
        );
        console.log('✅ Usuario insertado en tabla usuarios');
      } catch (insertError) {
        console.error('❌ Error insertando en tabla usuarios:', {
          message: insertError.message,
          code: insertError.code,
          detail: insertError.detail,
          constraint: insertError.constraint
        });
        throw new Error(`Error creando usuario: ${insertError.message}`);
      }
      
      if (!userResult.rows || userResult.rows.length === 0) {
        console.error('❌ No se retornaron datos del INSERT de usuarios');
        throw new Error('No se pudo crear el usuario - sin datos de retorno');
      }
      
      const newUserData = userResult.rows[0];
      console.log('✅ Usuario creado exitosamente en tabla usuarios:', {
        id: newUserData.id,
        nombre: newUserData.nombre,
        apellido: newUserData.apellido,
        email: newUserData.email,
        id_roles: newUserData.id_roles,
        estado: newUserData.estado
      });
      
      // PASO 2: Generar hash de contraseña
      console.log('🔐 Generando hash de contraseña...');
      console.log('Contraseña recibida para hashing:', {
        length: contrasena.length,
        firstChars: contrasena.substring(0, 3) + '...',
        type: typeof contrasena
      });

      let hashedPassword;
      try {
        const salt = await bcrypt.genSalt(12);
        console.log('Salt generado');
        
        hashedPassword = await bcrypt.hash(contrasena, salt);
        console.log('✅ Hash de contraseña generado exitosamente');
        console.log('Hash resultante:', hashedPassword ? `presente (${hashedPassword.length} chars)` : 'null');
        
      } catch (hashError) {
        console.error('❌ Error generando hash:', hashError);
        console.error('Stack trace:', hashError.stack);
        throw new Error(`Error generando hash de contraseña: ${hashError.message}`);
      }
      
      // PASO 3: CORREGIDO - Crear cuenta en tabla cuentas_usuarios (sin email)
      console.log('🔑 Creando cuenta de usuario...');
      console.log('Parámetros para inserción en cuentas:', {
        usuario: normalizedUsuario,
        id_usuarios: newUserData.id,
        hashedPassword: 'presente'
      });

      let cuentaResult;
      try {
        // CORRECCIÓN: La tabla cuentas_usuarios solo tiene: usuario, contrasena, id_usuarios
        cuentaResult = await client.query(
          'INSERT INTO cuentas_usuarios (usuario, contrasena, id_usuarios) VALUES ($1, $2, $3) RETURNING usuario, id_usuarios',
          [normalizedUsuario, hashedPassword, newUserData.id]
        );
        console.log('✅ Cuenta insertada en tabla cuentas_usuarios');
      } catch (insertError) {
        console.error('❌ Error insertando en tabla cuentas_usuarios:', {
          message: insertError.message,
          code: insertError.code,
          detail: insertError.detail,
          constraint: insertError.constraint
        });
        throw new Error(`Error creando cuenta: ${insertError.message}`);
      }
      
      if (!cuentaResult.rows || cuentaResult.rows.length === 0) {
        console.error('❌ No se retornaron datos del INSERT de cuentas');
        throw new Error('No se pudo crear la cuenta - sin datos de retorno');
      }
      
      const newAccountData = cuentaResult.rows[0];
      console.log('✅ Cuenta de usuario creada exitosamente:', {
        usuario: newAccountData.usuario,
        id_usuarios: newAccountData.id_usuarios
      });
      
      // PASO 4: Confirmar transacción
      try {
        await client.query('COMMIT');
        console.log('✅ Transacción confirmada exitosamente');
      } catch (commitError) {
        console.error('❌ Error en COMMIT:', commitError);
        throw new Error(`Error confirmando transacción: ${commitError.message}`);
      }
      
      // Respuesta exitosa - CORREGIDA
      const responseData = {
        id: newUserData.id,
        nombre: newUserData.nombre,
        apellido: newUserData.apellido,
        email: newUserData.email,
        usuario: newAccountData.usuario,
        id_roles: newUserData.id_roles,
        estado: newUserData.estado
      };
      
      console.log('📤 Enviando respuesta exitosa:', responseData);
      
      res.status(201).json({
        message: 'Usuario y cuenta creados correctamente',
        data: responseData
      });
      
    } catch (transactionError) {
      console.log('💥 Error en transacción, ejecutando rollback...');
      try {
        await client.query('ROLLBACK');
        console.log('✅ Rollback ejecutado exitosamente');
      } catch (rollbackError) {
        console.error('❌ Error en rollback:', rollbackError);
      }
      
      console.error('💥 DETALLES COMPLETOS DEL ERROR:', {
        name: transactionError.name,
        message: transactionError.message,
        code: transactionError.code,
        detail: transactionError.detail,
        constraint: transactionError.constraint,
        stack: transactionError.stack
      });
      
      // Proporcionar más detalles en la respuesta
      let errorDetails = 'Error procesando datos';
      if (process.env.NODE_ENV === 'development') {
        errorDetails = transactionError.message;
      }
      
      return res.status(400).json({ 
        error: 'Error de validación',
        details: errorDetails,
        errorType: transactionError.name,
        errorCode: transactionError.code
      });
    }
    
  } catch (err) {
    console.error('💀 Error general al crear usuario con cuenta:', {
      message: err.message,
      stack: err.stack,
      code: err.code,
      detail: err.detail
    });
    
    // Determinar el tipo de error y el código de respuesta apropiado
    let statusCode = 500;
    let errorMessage = 'Error interno del servidor';
    
    if (err.message && err.message.includes('conexión')) {
      statusCode = 503; // Service Unavailable
      errorMessage = 'Servicio temporalmente no disponible';
    } else if (err.code === 'ECONNREFUSED') {
      statusCode = 503;
      errorMessage = 'Error de conexión a la base de datos';
    } else if (err.message && err.message.includes('validación')) {
      statusCode = 400;
      errorMessage = 'Error de validación de datos';
    }
    
    res.status(statusCode).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? err.message : 'Error procesando la solicitud'
    });
  } finally {
    // Asegurar que la conexión se libere
    if (client) {
      try {
        client.release();
        console.log('🔌 Conexión liberada exitosamente');
      } catch (releaseError) {
        console.error('❌ Error liberando conexión:', releaseError);
      }
    }
  }
});

// Actualizar usuario
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, apellido, email, id_roles, estado } = req.body;
    
    // REGLA 1: Un usuario NO puede cambiar su propio rol
    if (req.user.id.toString() === id.toString() && id_roles) {
      return res.status(403).json({ 
        error: 'No puedes cambiar tu propio rol',
        message: 'Por seguridad, no está permitido modificar tu propio rol. Contacta a otro administrador.'
      });
    }
    
    // Verificar si el usuario objetivo es super admin
    const userCheck = await pool.query(
      'SELECT es_super_admin, id_roles FROM usuarios WHERE id = $1',
      [id]
    );
    
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    const targetIsSuperAdmin = userCheck.rows[0].es_super_admin;
    const currentRoleId = userCheck.rows[0].id_roles;
    
    // Verificar si el usuario que hace la petición es super admin
    const requestingUserCheck = await pool.query(
      'SELECT es_super_admin FROM usuarios WHERE id = $1',
      [req.user.id]
    );
    
    const requestingUserIsSuperAdmin = requestingUserCheck.rows[0]?.es_super_admin || false;
    
    // REGLA 2: Solo un Super Admin puede modificar CUALQUIER COSA de otro Super Admin
    if (targetIsSuperAdmin && !requestingUserIsSuperAdmin) {
      return res.status(403).json({ 
        error: 'No tienes permisos para modificar un Super Admin',
        message: 'Solo otro Super Admin puede modificar la información de un Super Admin'
      });
    }
    
    const result = await pool.query(
      'UPDATE usuarios SET nombre = $1, apellido = $2, email = $3, id_roles = $4, estado = $5 WHERE id = $6 RETURNING *',
      [nombre, apellido, email, id_roles, estado, id]
    );

    res.status(200).json({
      message: 'Usuario actualizado correctamente',
      data: result.rows[0]
    });
  } catch (err) {
    console.error('Error al actualizar usuario:', err);
    res.status(500).json({ 
      error: 'Error al actualizar el usuario',
      details: err.message
    });
  }
});

// ENDPOINT MEJORADO: Actualizar usuario con cuenta de acceso - CORREGIDO
router.put('/:id/update-account', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, apellido, email, usuario, nueva_contrasena } = req.body;
    
    console.log('=== ACTUALIZANDO USUARIO CON CUENTA ===');
    console.log('Actualizando usuario ID:', id);
    console.log('Datos recibidos:', { 
      nombre, 
      apellido, 
      email: email?.toLowerCase().trim(), 
      usuario, 
      nueva_contrasena: nueva_contrasena ? `***${nueva_contrasena.length} chars***` : 'no' 
    });
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      console.log('🚀 Transacción de actualización iniciada');
      
      // Verificar que el usuario existe
      const userExists = await client.query(
        'SELECT id, nombre, apellido, email FROM usuarios WHERE id = $1',
        [id]
      );
      
      if (userExists.rows.length === 0) {
        console.log('❌ Usuario no encontrado:', id);
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      
      const currentUser = userExists.rows[0];
      console.log('📋 Usuario actual:', currentUser);
      
      // Actualizar datos en tabla usuarios
      if (nombre || apellido || email !== undefined) {
        const updateFields = [];
        const updateValues = [];
        let paramIndex = 1;
        
        if (nombre && nombre.trim() !== currentUser.nombre) {
          updateFields.push(`nombre = $${paramIndex}`);
          updateValues.push(nombre.trim());
          paramIndex++;
        }
        
        if (apellido && apellido.trim() !== currentUser.apellido) {
          updateFields.push(`apellido = $${paramIndex}`);
          updateValues.push(apellido.trim());
          paramIndex++;
        }
        
        if (email !== undefined && email.toLowerCase().trim() !== currentUser.email.toLowerCase()) {
          const normalizedEmail = email.toLowerCase().trim();
          
          // Validar formato de email
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(normalizedEmail)) {
            throw new Error('Formato de email inválido');
          }
          
          // Verificar que el email no esté en uso por otro usuario
          const emailCheck = await client.query(
            'SELECT id, nombre, apellido FROM usuarios WHERE LOWER(TRIM(email)) = $1 AND id != $2',
            [normalizedEmail, id]
          );
          
          if (emailCheck.rows.length > 0) {
            const conflictUser = emailCheck.rows[0];
            console.log('❌ Email en uso por otro usuario:', conflictUser);
            throw new Error(`Ya existe un usuario con este email: ${conflictUser.nombre} ${conflictUser.apellido}`);
          }
          
          updateFields.push(`email = $${paramIndex}`);
          updateValues.push(normalizedEmail);
          paramIndex++;
        }
        
        if (updateFields.length > 0) {
          console.log('👤 Actualizando tabla usuarios...');
          const query = `UPDATE usuarios SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`;
          await client.query(query, [...updateValues, id]);
          console.log('✅ Tabla usuarios actualizada');
        }
      }
      
      // Actualizar datos en cuentas_usuarios - CORREGIDO
      const accountUpdateFields = [];
      const accountUpdateValues = [];
      let accountParamIndex = 1;
      
      if (usuario) {
        // Verificar que el usuario no esté en uso
        const userCheck = await client.query(
          'SELECT id_usuarios, usuario FROM cuentas_usuarios WHERE LOWER(TRIM(usuario)) = $1 AND id_usuarios != $2',
          [usuario.toLowerCase().trim(), id]
        );
        
        if (userCheck.rows.length > 0) {
          const conflictAccount = userCheck.rows[0];
          console.log('❌ Usuario en uso por otra cuenta:', conflictAccount);
          throw new Error(`Ya existe una cuenta con este nombre de usuario: ${conflictAccount.usuario}`);
        }
        
        accountUpdateFields.push(`usuario = $${accountParamIndex}`);
        accountUpdateValues.push(usuario.trim());
        accountParamIndex++;
      }
      
      // CORRECCIÓN: Eliminada la actualización de email en cuentas_usuarios (la tabla no tiene columna email)
      
      if (nueva_contrasena) {
        if (nueva_contrasena.length < 8) {
          throw new Error('La contraseña debe tener al menos 8 caracteres');
        }
        
        console.log('🔐 Generando nueva contraseña...');
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(nueva_contrasena, salt);
        
        accountUpdateFields.push(`contrasena = $${accountParamIndex}`);
        accountUpdateValues.push(hashedPassword);
        accountParamIndex++;
      }
      
      if (accountUpdateFields.length > 0) {
        console.log('🔑 Actualizando tabla cuentas_usuarios...');
        const accountQuery = `UPDATE cuentas_usuarios SET ${accountUpdateFields.join(', ')} WHERE id_usuarios = $${accountParamIndex}`;
        await client.query(accountQuery, [...accountUpdateValues, id]);
        console.log('✅ Tabla cuentas_usuarios actualizada');
      }
      
      await client.query('COMMIT');
      console.log('🎉 Actualización completada exitosamente');
      
      // Obtener datos actualizados
      const updatedUser = await pool.query(
        `SELECT u.id, u.nombre, u.apellido, u.email, u.id_roles, u.estado, cu.usuario
         FROM usuarios u
         LEFT JOIN cuentas_usuarios cu ON u.id = cu.id_usuarios
         WHERE u.id = $1`,
        [id]
      );
      
      res.json({
        message: 'Usuario y cuenta actualizados correctamente',
        data: updatedUser.rows[0]
      });
      
    } catch (transactionError) {
      await client.query('ROLLBACK');
      console.error('💥 Error en actualización, rollback realizado:', transactionError);
      
      if (transactionError.message.includes('email') || 
          transactionError.message.includes('usuario') || 
          transactionError.message.includes('contraseña')) {
        return res.status(400).json({ error: transactionError.message });
      }
      
      throw transactionError;
    } finally {
      client.release();
      console.log('🔌 Conexión liberada');
    }
    
  } catch (err) {
    console.error('💀 Error general al actualizar usuario con cuenta:', err);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? err.message : 'Error procesando la solicitud'
    });
  }
});

// Desactivar usuario
router.put('/:id/deactivate', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'UPDATE usuarios SET estado = false WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.status(200).json({
      message: 'Usuario desactivado correctamente',
      data: result.rows[0]
    });
  } catch (err) {
    console.error('Error al desactivar usuario:', err);
    res.status(500).json({ 
      error: 'Error al desactivar el usuario',
      details: err.message
    });
  }
});

// Activar usuario
router.put('/:id/activate', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'UPDATE usuarios SET estado = true WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.status(200).json({
      message: 'Usuario activado correctamente',
      data: result.rows[0]
    });
  } catch (err) {
    console.error('Error al activar usuario:', err);
    res.status(500).json({ 
      error: 'Error al activar el usuario',
      details: err.message
    });
  }
});

// Eliminar usuario
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Eliminar primero de cuentas_usuarios (si existe)
      await client.query('DELETE FROM cuentas_usuarios WHERE id_usuarios = $1', [id]);
      
      // Luego eliminar de usuarios
      const result = await client.query(
        'DELETE FROM usuarios WHERE id = $1 RETURNING *',
        [id]
      );

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      await client.query('COMMIT');
      
      res.status(200).json({
        message: 'Usuario eliminado correctamente',
        data: result.rows[0]
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error al eliminar usuario:', err);
    res.status(500).json({ 
      error: 'Error al eliminar el usuario',
      details: err.message
    });
  }
});

// Obtener usuario por ID
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `SELECT u.id, u.nombre, u.apellido, u.email, u.id_roles, u.estado, cu.usuario
       FROM usuarios u
       LEFT JOIN cuentas_usuarios cu ON u.id = cu.id_usuarios
       WHERE u.id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    res.status(200).json({
      message: 'Usuario obtenido correctamente',
      data: result.rows[0]
    });
  } catch (err) {
    console.error('Error al obtener usuario:', err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Obtener usuarios por estado
router.get('/estado/:estado', auth, async (req, res) => {
  try {
    const estado = req.params.estado === 'true';
    
    const result = await pool.query(
      'SELECT * FROM usuarios WHERE estado = $1',
      [estado]
    );
    
    res.status(200).json({
      message: `Usuarios con estado '${estado}' obtenidos correctamente`,
      count: result.rows.length,
      data: result.rows
    });
  } catch (err) {
    console.error('Error al obtener usuarios por estado:', err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Obtener usuarios por rol
router.get('/rol/:id_rol', auth, async (req, res) => {
  try {
    const { id_rol } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM usuarios WHERE id_roles = $1',
      [id_rol]
    );
    
    res.status(200).json({
      message: `Usuarios con rol ID ${id_rol} obtenidos correctamente`,
      count: result.rows.length,
      data: result.rows
    });
  } catch (err) {
    console.error('Error al obtener usuarios por rol:', err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

module.exports = router;