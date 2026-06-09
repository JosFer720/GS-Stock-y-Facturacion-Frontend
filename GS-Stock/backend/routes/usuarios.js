const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const usuarios = require('../controllers/usuariosController');

// Orden conservado igual que la versión original (precedencia de rutas Express).
router.get('/', auth, usuarios.list);
router.post('/', auth, usuarios.create);
router.post('/create-with-account', auth, usuarios.createWithAccount);
router.put('/:id', auth, usuarios.update);
router.put('/:id/update-account', auth, usuarios.updateAccount);
router.put('/:id/deactivate', auth, usuarios.deactivate);
router.put('/:id/activate', auth, usuarios.activate);
router.delete('/:id', auth, usuarios.remove);
router.get('/:id', auth, usuarios.getById);
router.get('/estado/:estado', auth, usuarios.getByEstado);
router.get('/rol/:id_rol', auth, usuarios.getByRol);

module.exports = router;
