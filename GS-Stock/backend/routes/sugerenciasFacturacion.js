const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const sugerencias = require('../controllers/sugerenciasController');

router.get('/sugerencias-facturacion', auth, sugerencias.getSugerencias);
router.get('/buscar-cliente-empresa/:empresa', auth, sugerencias.buscarClienteEmpresa);

module.exports = router;
