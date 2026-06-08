const express = require('express');
const router = express.Router();
const SocketService = require('../services/socketService');
const { checkRole, roles } = require('../middleware/roles');
const inventario = require('../controllers/inventarioController');

// Adjunta el servicio de socket (notificaciones en tiempo real) a cada request.
router.use((req, res, next) => {
  const io = req.app.get('socketio');
  req.socketService = new SocketService(io);
  next();
});

const rolesLectura = [...roles.admin, ...roles.secretaria, ...roles.vendedor, ...roles.inventario];
const rolesEscritura = [...roles.admin, ...roles.secretaria];

router.get('/', checkRole(rolesLectura), inventario.getInventario);
router.get('/tipos-linea-producto', checkRole(rolesLectura), inventario.getTiposLineaProducto);
router.post('/', checkRole(rolesEscritura), inventario.create);
router.put('/:id', checkRole(rolesEscritura), inventario.update);
router.delete('/:id', checkRole(rolesEscritura), inventario.remove);

module.exports = router;
