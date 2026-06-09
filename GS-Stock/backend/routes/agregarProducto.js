const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const productos = require('../controllers/productosController');

router.post('/productos', auth, productos.create);

module.exports = router;
