// Middleware de autenticación para proteger rutas

const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'fba7a07f4174d84d67ad67aedf16422a';

module.exports = (req, res, next) => {
  try {
    // Obtener el token del header Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Acceso denegado. Se requiere autenticación.' 
      });
    }
    
    // Extraer el token (quitar 'Bearer ')
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Acceso denegado. Se requiere autenticación.' 
      });
    }
    
    // Verificar el token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Añadir la información del usuario a la solicitud
    req.user = {
      id: decoded.id,
      nombre: decoded.nombre,
      apellido: decoded.apellido,
      rol: decoded.rol
    };

    // Log opcional para debugging (comentar en producción)
    if (process.env.NODE_ENV === 'development') {
      console.log('Usuario autenticado:', {
        id: req.user.id,
        nombre: req.user.nombre,
        rol: req.user.rol,
        endpoint: req.path
      });
    }
    
    // Continuar con la siguiente función en la cadena de middleware
    next();
    
  } catch (error) {
    let errorMessage = 'Error de autenticación.';
    let statusCode = 401;
    
    if (error.name === 'TokenExpiredError') {
      errorMessage = 'Sesión expirada. Por favor inicie sesión nuevamente.';
      statusCode = 403;
    } else if (error.name === 'JsonWebTokenError') {
      errorMessage = 'Token inválido. Por favor inicie sesión nuevamente.';
      statusCode = 403;
    } else if (error.name === 'NotBeforeError') {
      errorMessage = 'Token no válido aún.';
      statusCode = 403;
    }
    
    // Log de errores para debugging
    if (process.env.NODE_ENV === 'development') {
      console.error('Error de autenticación:', {
        error: error.name,
        message: error.message,
        endpoint: req.path
      });
    }
    
    res.status(statusCode).json({ error: errorMessage });
  }
};