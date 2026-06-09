const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const productos = require('../controllers/productosController');

router.delete('/productos/:id', auth, productos.remove);

module.exports = router;
