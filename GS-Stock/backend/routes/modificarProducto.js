const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const productos = require('../controllers/productosController');

router.put('/productos/:id', auth, productos.update);
router.patch('/productos/:id/precio', auth, productos.updatePrecio);
router.patch('/productos/:id/estado', auth, productos.updateEstado);
router.patch('/productos/:id/stock', auth, productos.updateStock);

module.exports = router;
