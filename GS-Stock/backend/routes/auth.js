const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'admin',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'mydb',
  password: process.env.DB_PASSWORD || 'secret',
  port: process.env.DB_PORT || 5432,
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

router.post('/logout', (req, res) => {
  res.json({ message: 'Sesión cerrada correctamente' });
});

module.exports = router;

const crypto = require('crypto');

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    // Verificar si el email existe
    const userResult = await pool.query(
      'SELECT id_usuarios FROM cuentas_usuarios WHERE email = $1',
      [email]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Email no registrado' });
    }
    const userId = userResult.rows[0].id_usuarios;
    
    // Generar token único (válido por 1 hora)
    const token = crypto.randomBytes(20).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000); 
    
    // Guardar token en DB
    await pool.query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [userId, token, expiresAt]
    );
    
    // Simular envío de correo (en producción, usar SendGrid/Nodemailer)
    console.log(`Token para ${email}: ${token}`);
    
    res.json({ message: 'Se ha enviado un enlace de recuperación a tu correo' });
  } catch (err) {
    console.error('Error en forgot-password:', err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  try {
    // Validar longitud mínima
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    }
    
    // Buscar token válido
    const tokenResult = await pool.query(
      `SELECT * FROM password_reset_tokens 
      WHERE token = $1 AND used = FALSE AND expires_at > NOW()`,
      [token]
    );
    if (tokenResult.rows.length === 0) {
      return res.status(400).json({ error: 'Token inválido o expirado' });
    }
    
    const resetToken = tokenResult.rows[0];
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Actualizar contraseña
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await client.query(
        'UPDATE cuentas_usuarios SET contrasena = $1 WHERE id_usuarios = $2',
        [hashedPassword, resetToken.user_id]
      );
      
      // Marcar token como usado
      await client.query(
        'UPDATE password_reset_tokens SET used = TRUE WHERE id = $1',
        [resetToken.id]
      );
      
      await client.query('COMMIT');
      res.json({ message: 'Contraseña actualizada correctamente' });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error en reset-password:', err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});