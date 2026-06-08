const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { apiLimiter } = require('../../middleware/rateLimiter');
const devoluciones = require('../../controllers/devolucionesController');

// Orden conservado igual que la versión original (precedencia de rutas Express).
router.get('/metodos', auth, apiLimiter, devoluciones.getMetodos);
router.get('/pedidos-cliente/:clienteId', auth, apiLimiter, devoluciones.getPedidosCliente);
router.post('/', auth, apiLimiter, devoluciones.create);
router.get('/', auth, apiLimiter, devoluciones.list);
router.put('/:id', auth, apiLimiter, devoluciones.update);
router.delete('/:id', auth, apiLimiter, devoluciones.remove);

module.exports = router;
