const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Conexión DB
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'gs_stock',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

const JWT_SECRET = process.env.JWT_SECRET || 'fba7a07f4174d84d67ad67aedf16422a';

// Middleware JWT
const authenticateJWT = (allowedRoles = []) => {
  return async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Token no proporcionado' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const result = await pool.query(
        `SELECT u.id, u.nombre, u.apellido, r.rol 
        FROM usuarios u
        JOIN roles r ON u.id_roles = r.id
        WHERE u.id = $1`,
        [decoded.id]
      );

      if (result.rows.length === 0) return res.status(403).json({ error: 'Usuario no autorizado' });

      const user = result.rows[0];
      if (allowedRoles.length && !allowedRoles.includes(user.rol)) {
        return res.status(403).json({ error: 'No tienes permisos para esta acción' });
      }

      req.user = user;
      next();
    } catch (err) {
      return res.status(403).json({ error: 'Token inválido o expirado' });
    }
  };
};

// Perfil
router.get('/profile', authenticateJWT(), (req, res) => {
  res.json({
    message: 'Perfil de usuario',
    user: req.user
  });
});

// Ruta protegida admin
router.get('/admin', authenticateJWT(['Administrador']), (req, res) => {
  res.json({
    message: 'Acceso administrativo',
    user: req.user
  });
});

// NUEVO ENDPOINT 1: Crear nuevo usuario (solo para administradores)
router.post('/create', authenticateJWT(['Administrador']), async (req, res) => {
  try {
    const { nombre, apellido, usuario, email, contrasena, id_roles } = req.body;
    
    // Validaciones básicas
    if (!nombre || !usuario || !email || !contrasena) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }
    
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
      
      // Si no se proporciona un rol, se asigna el rol por defecto (2 - usuario normal)
      const rolAsignado = id_roles || 2;
      
      const userResult = await client.query(
        'INSERT INTO usuarios (nombre, apellido, id_roles) VALUES ($1, $2, $3) RETURNING id',
        [nombre, apellido || '', rolAsignado] 
      );
      
      const userId = userResult.rows[0].id;
      
      await client.query(
        'INSERT INTO cuentas_usuarios (usuario, email, contrasena, id_usuarios) VALUES ($1, $2, $3, $4)',
        [usuario, email, hashedPassword, userId]
      );
      
      await client.query('COMMIT');
      
      res.status(201).json({ 
        message: 'Usuario creado correctamente',
        user: {
          id: userId,
          nombre,
          apellido: apellido || '',
          usuario,
          email,
          rol: rolAsignado
        }
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error al crear usuario:', err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// NUEVO ENDPOINT 2: Actualizar datos de usuario
router.put('/update/:id', authenticateJWT(), async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, apellido, email, usuario } = req.body;
    const userRole = req.user.rol;
    const userId = req.user.id;
    
    // Verificar permisos: solo el propio usuario o un administrador pueden actualizar
    if (userId != id && userRole !== 'Administrador') {
      return res.status(403).json({ error: 'No tienes permisos para actualizar este usuario' });
    }
    
    // Verificar existencia del usuario
    const userCheck = await pool.query(
      'SELECT u.id FROM usuarios u WHERE u.id = $1',
      [id]
    );
    
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    // Si se actualiza el usuario o email, verificar que no exista en otra cuenta
    if (usuario) {
      const userNameCheck = await pool.query(
        'SELECT id_usuarios FROM cuentas_usuarios WHERE usuario = $1 AND id_usuarios != $2',
        [usuario, id]
      );
      
      if (userNameCheck.rows.length > 0) {
        return res.status(400).json({ error: 'El nombre de usuario ya está en uso' });
      }
    }
    
    if (email) {
      const emailCheck = await pool.query(
        'SELECT id_usuarios FROM cuentas_usuarios WHERE email = $1 AND id_usuarios != $2',
        [email, id]
      );
      
      if (emailCheck.rows.length > 0) {
        return res.status(400).json({ error: 'El email ya está registrado' });
      }
    }
    
    // Iniciar transacción
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Actualizar tabla de usuarios si hay campos para actualizar
      if (nombre || apellido !== undefined) {
        const updateUserFields = [];
        const updateUserValues = [];
        let paramIndex = 1;
        
        if (nombre) {
          updateUserFields.push(`nombre = $${paramIndex}`);
          updateUserValues.push(nombre);
          paramIndex++;
        }
        
        if (apellido !== undefined) {
          updateUserFields.push(`apellido = $${paramIndex}`);
          updateUserValues.push(apellido);
          paramIndex++;
        }
        
        if (updateUserFields.length > 0) {
          await client.query(
            `UPDATE usuarios SET ${updateUserFields.join(', ')} WHERE id = $${paramIndex}`,
            [...updateUserValues, id]
          );
        }
      }
      
      // Actualizar tabla de cuentas_usuarios si hay campos para actualizar
      if (usuario || email) {
        const updateAccountFields = [];
        const updateAccountValues = [];
        let paramIndex = 1;
        
        if (usuario) {
          updateAccountFields.push(`usuario = $${paramIndex}`);
          updateAccountValues.push(usuario);
          paramIndex++;
        }
        
        if (email) {
          updateAccountFields.push(`email = $${paramIndex}`);
          updateAccountValues.push(email);
          paramIndex++;
        }
        
        if (updateAccountFields.length > 0) {
          await client.query(
            `UPDATE cuentas_usuarios SET ${updateAccountFields.join(', ')} WHERE id_usuarios = $${paramIndex}`,
            [...updateAccountValues, id]
          );
        }
      }
      
      await client.query('COMMIT');
      
      // Obtener datos actualizados
      const updatedUserResult = await pool.query(
        `SELECT u.id, u.nombre, u.apellido, r.rol, cu.usuario, cu.email
         FROM usuarios u
         JOIN roles r ON u.id_roles = r.id
         JOIN cuentas_usuarios cu ON u.id = cu.id_usuarios
         WHERE u.id = $1`,
        [id]
      );
      
      res.json({
        message: 'Usuario actualizado correctamente',
        user: updatedUserResult.rows[0]
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error al actualizar usuario:', err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// NUEVO ENDPOINT 3: Desactivar/eliminar cuenta de usuario
router.delete('/delete/:id', authenticateJWT(), async (req, res) => {
  try {
    const { id } = req.params;
    const { action = 'deactivate' } = req.body; // Por defecto desactiva en lugar de eliminar
    const userRole = req.user.rol;
    const userId = req.user.id;
    
    // Verificar permisos: solo el propio usuario o un administrador pueden desactivar/eliminar
    if (userId != id && userRole !== 'Administrador') {
      return res.status(403).json({ error: 'No tienes permisos para esta acción' });
    }
    
    // Verificar existencia del usuario
    const userCheck = await pool.query(
      'SELECT u.id FROM usuarios u WHERE u.id = $1',
      [id]
    );
    
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      if (action === 'delete') {
        // Eliminar completamente el usuario (esto podría causar problemas si hay referencias en otras tablas)
        await client.query('DELETE FROM cuentas_usuarios WHERE id_usuarios = $1', [id]);
        await client.query('DELETE FROM usuarios WHERE id = $1', [id]);
        
        await client.query('COMMIT');
        res.json({ message: 'Usuario eliminado correctamente' });
      } else {
        // Desactivar el usuario (enfoque recomendado)
        // Añadir columna 'activo' si no existe en la tabla
        try {
          await client.query('ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT TRUE');
        } catch (err) {
          console.log('La columna activo ya existe o hubo un error:', err.message);
        }
        
        // Desactivar el usuario
        await client.query('UPDATE usuarios SET activo = FALSE WHERE id = $1', [id]);
        
        await client.query('COMMIT');
        res.json({ message: 'Usuario desactivado correctamente' });
      }
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error al desactivar/eliminar usuario:', err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

module.exports = router;