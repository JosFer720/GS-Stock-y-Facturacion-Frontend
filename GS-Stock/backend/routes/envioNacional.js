const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const envios = require('../controllers/enviosController');

router.post('/', authenticateToken, envios.crearNacional);
router.get('/', authenticateToken, envios.listNacional);

module.exports = router;
