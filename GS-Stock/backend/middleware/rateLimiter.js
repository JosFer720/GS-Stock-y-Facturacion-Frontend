// middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');

// Helper function to properly normalize IPv6 addresses
const normalizeIp = (ip) => {
  // Remove IPv6 prefix if present
  if (ip && ip.startsWith('::ffff:')) {
    return ip.substring(7);
  }
  return ip || 'unknown';
};

// Rate limiter para forgot-password
const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 5,
  message: {
    error: 'Demasiadas solicitudes de recuperación. Intenta de nuevo en una hora.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Proper keyGenerator using the helper
  keyGenerator: (req, res) => {
    const ip = normalizeIp(req.ip);
    const email = req.body.email || 'no-email';
    return `${ip}-${email}`;
  },
  // Disable the IPv6 check since we're handling it manually
  validate: {keyGeneratorIpFallback: false}
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

// Rate limiter general para API endpoints
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // 100 requests por IP cada 15 minutos
  message: {
    error: 'Demasiadas solicitudes. Intenta de nuevo en unos minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  forgotPasswordLimiter,
  resetPasswordLimiter,
  loginLimiter,
  apiLimiter 
};