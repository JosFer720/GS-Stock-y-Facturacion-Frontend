const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const clientes = require('../controllers/clientesController');

// El orden se conserva igual que en la versión original para no alterar la
// precedencia de coincidencia de rutas de Express.
router.get('/:id/cuentas-por-cobrar', auth, clientes.getCuentasPorCobrar);
router.get('/buscar/:termino', auth, clientes.search);
router.get('/', auth, clientes.list);
router.get('/:id', auth, clientes.getById);
router.post('/validar-nit', auth, clientes.validarNit);
router.post('/', auth, clientes.create);
router.put('/:id', auth, clientes.update);
router.delete('/:id', auth, clientes.remove);
router.get('/:id/direcciones', auth, clientes.getDirecciones);
router.get('/:id/telefonos', auth, clientes.getTelefonos);

module.exports = router;
