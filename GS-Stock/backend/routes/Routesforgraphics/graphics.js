const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const graphics = require('../../controllers/graphicsController');

router.get('/test', auth, graphics.test);
router.get('/dashboard/summary', auth, graphics.dashboardSummary);
router.get('/comparison/product-lines', auth, graphics.productLinesComparison);
router.get('/analytics/best-selling-products', auth, graphics.bestSellingProducts);
router.get('/analytics/vendedor-performance', auth, graphics.vendedorPerformance);
router.get('/analytics/sales-performance', auth, graphics.salesPerformance);
router.get('/analytics/vendedores-list', auth, graphics.vendedoresList);

module.exports = router;
