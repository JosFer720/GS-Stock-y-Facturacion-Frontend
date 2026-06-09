const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const catalogos = require('../controllers/catalogosController');

router.get('/', auth, catalogos.getTiposLinea);
router.post('/', auth, catalogos.createTipoLinea);

module.exports = router;
