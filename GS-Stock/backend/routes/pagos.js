const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const pagos = require('../controllers/pagosController');

router.get('/clientes-pendientes', auth, pagos.getClientesPendientes);
router.get('/pedidos-cliente/:clienteId', auth, pagos.getPedidosCliente);
router.post('/', auth, pagos.create);
router.get('/', auth, pagos.list);

module.exports = router;
