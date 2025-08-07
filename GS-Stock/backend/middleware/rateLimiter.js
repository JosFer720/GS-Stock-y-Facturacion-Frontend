// middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');

// Rate limiter para forgot-password 
const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 5, 
  message: {
    error: 'Demasiadas solicitudes de recuperación. Intenta de nuevo en una hora.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Usar IP y email como clave para limitar
  keyGenerator: (req) => {
    return `${req.ip}-${req.body.email || 'no-email'}`;
  }
});

// Rate limiter para reset-password 
const resetPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, 
  max: 10, 
  message: {
    error: 'Demasiados intentos de cambio de contraseña. Intenta de nuevo en una hora.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiter general para login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 5, 
  message: {
    error: 'Demasiados intentos de login. Intenta de nuevo en 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  forgotPasswordLimiter,
  resetPasswordLimiter,
  loginLimiter
};