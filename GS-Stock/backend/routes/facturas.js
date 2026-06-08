const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const facturas = require('../controllers/facturasController');

router.get('/', auth, facturas.list);
router.get('/:id', auth, facturas.getById);
router.get('/:id/detalles', auth, facturas.getDetalles);

module.exports = router;
