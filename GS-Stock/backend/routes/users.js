const express = require('express');
const router = express.Router();
const authenticateJWT = require('../middleware/authenticateJWT');
const users = require('../controllers/usersController');

router.get('/profile', authenticateJWT(), users.profile);
router.get('/admin', authenticateJWT(['Administrador', 'Super Admin']), users.admin);
router.get('/usuario-actual', authenticateJWT(), users.usuarioActual);
router.post('/create', authenticateJWT(['Administrador', 'Super Admin']), users.create);
router.put('/update/:id', authenticateJWT(), users.update);
router.delete('/delete/:id', authenticateJWT(), users.remove);
router.get('/vendedor', authenticateJWT(), users.vendedor);

module.exports = router;
