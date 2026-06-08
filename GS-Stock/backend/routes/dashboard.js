const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const dashboard = require('../controllers/dashboardController');

router.get('/ingresos', auth, dashboard.getIngresos);
router.get('/pedidos-pendientes', auth, dashboard.getPedidosPendientes);
router.get('/nuevos-clientes', auth, dashboard.getNuevosClientes);
router.get('/ventas-mensuales', auth, dashboard.getVentasMensuales);
router.get('/productos-mas-vendidos', auth, dashboard.getProductosMasVendidos);
router.get('/actividad-reciente', auth, dashboard.getActividadReciente);
router.get('/alertas', auth, dashboard.getAlertas);
router.get('/resumen', auth, dashboard.getResumen);

module.exports = router;
