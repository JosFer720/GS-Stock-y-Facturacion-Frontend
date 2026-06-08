// Controlador de Graphics: capa HTTP. Preserva los cuerpos de respuesta
// originales ({ success, data, message }, con `period` donde corresponde).
const service = require('../services/graphicsService');

const AVAILABLE_ENDPOINTS = [
  'GET /api/graphics/test',
  'GET /api/graphics/dashboard/summary',
  'GET /api/graphics/comparison/product-lines',
  'GET /api/graphics/analytics/best-selling-products',
  'GET /api/graphics/analytics/vendedor-performance',
  'GET /api/graphics/analytics/sales-performance',
  'GET /api/graphics/analytics/vendedores-list',
];

async function test(req, res) {
  try {
    const timestamp = await service.test();
    res.json({
      success: true,
      message: 'Graphics routes are working!',
      timestamp,
      available_endpoints: AVAILABLE_ENDPOINTS,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Error connecting to database',
      error: err.message,
    });
  }
}

async function dashboardSummary(req, res) {
  try {
    const data = await service.getDashboardSummary(req.query);
    res.json({ success: true, data, message: 'Resumen del dashboard obtenido exitosamente' });
  } catch (err) {
    console.error('Error obteniendo resumen del dashboard:', err);
    res.status(500).json({ success: false, message: 'Error interno del servidor', error: err.message });
  }
}

async function productLinesComparison(req, res) {
  try {
    const data = await service.getProductLinesComparison(req.query);
    res.json({
      success: true,
      data,
      message: 'Comparación de líneas de producto obtenida exitosamente',
    });
  } catch (err) {
    console.error('Error en comparación de líneas de producto:', err);
    res.status(500).json({ success: false, message: 'Error interno del servidor', error: err.message });
  }
}

async function bestSellingProducts(req, res) {
  try {
    const data = await service.getBestSellingProducts(req.query);
    res.json({ success: true, data, message: 'Productos más vendidos obtenidos exitosamente' });
  } catch (err) {
    console.error('Error obteniendo productos más vendidos:', err);
    res.status(500).json({ success: false, message: 'Error interno del servidor', error: err.message });
  }
}

async function vendedorPerformance(req, res) {
  try {
    const { data, period } = await service.getVendedorPerformance(req.query);
    res.json({
      success: true,
      data,
      period,
      message: 'Rendimiento de vendedores obtenido exitosamente',
    });
  } catch (err) {
    console.error('Error obteniendo rendimiento de vendedores:', err);
    res.status(500).json({ success: false, message: 'Error interno del servidor', error: err.message });
  }
}

async function salesPerformance(req, res) {
  try {
    const { data, period } = await service.getSalesPerformance(req.query);
    res.json({
      success: true,
      data,
      period,
      message: 'Rendimiento de ventas obtenido exitosamente',
    });
  } catch (err) {
    console.error('Error obteniendo rendimiento de ventas:', err);
    res.status(500).json({ success: false, message: 'Error interno del servidor', error: err.message });
  }
}

async function vendedoresList(req, res) {
  try {
    const data = await service.getVendedoresList();
    res.json({ success: true, data, message: 'Lista de vendedores obtenida exitosamente' });
  } catch (err) {
    console.error('Error obteniendo lista de vendedores:', err);
    res.status(500).json({ success: false, message: 'Error interno del servidor', error: err.message });
  }
}

module.exports = {
  test,
  dashboardSummary,
  productLinesComparison,
  bestSellingProducts,
  vendedorPerformance,
  salesPerformance,
  vendedoresList,
};
