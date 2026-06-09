const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');
const ventas = require('../controllers/ventasController');

// Orden conservado igual que la versión original (precedencia de rutas Express).
router.get('/metodos-pago', auth, apiLimiter, ventas.getMetodosPago);
router.get('/tipos-linea-producto', auth, apiLimiter, ventas.getTiposLineaProducto);
router.post('/pedidos', auth, apiLimiter, ventas.createPedido);
router.get('/pedidos', auth, apiLimiter, ventas.listPedidos);
router.get('/vendedor-actual', auth, apiLimiter, ventas.getVendedorActual);
router.get('/vendedores', auth, apiLimiter, ventas.getVendedores);
router.get('/tipos-cliente', auth, apiLimiter, ventas.getTiposCliente);
router.get('/clientes', auth, apiLimiter, ventas.getClientes);
router.get('/estados-pedidos', auth, apiLimiter, ventas.getEstadosPedidos);
router.get('/pedidos/:id/productos', auth, apiLimiter, ventas.getProductosPedido);
router.put('/pedidos/:id/estado', auth, apiLimiter, ventas.updateEstadoPedido);

module.exports = router;
