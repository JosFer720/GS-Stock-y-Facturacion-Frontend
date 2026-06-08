const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const crearFactura = require('../controllers/crearFacturaController');

router.post('/crear-factura', auth, crearFactura.crearFactura);

module.exports = router;
