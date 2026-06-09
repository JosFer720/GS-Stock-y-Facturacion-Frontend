const express = require('express');
const router = express.Router();
const auth = require('../controllers/authController');

// Orden conservado igual que la versión original. Los endpoints de depuración
// (/debug-last-token, /debug-tokens) se eliminaron por exponer tokens de reseteo.
router.post('/register', auth.register);
router.post('/login', auth.login);
router.post('/logout', auth.logout);
router.post('/forgot-password', auth.forgotPassword);
router.post('/validate-reset-token', auth.validateResetToken);
router.post('/reset-password', auth.resetPassword);

module.exports = router;
