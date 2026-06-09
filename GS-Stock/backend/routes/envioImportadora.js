const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const envios = require('../controllers/enviosController');

router.post('/', authenticateToken, envios.crearImportadora);
router.get('/', authenticateToken, envios.listImportadora);

module.exports = router;
