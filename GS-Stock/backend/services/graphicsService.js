// Servicio de Graphics: aplica los valores por defecto de los filtros y delega
// las consultas analíticas al repositorio.
const repo = require('../repositories/graphicsRepository');

async function test() {
  return repo.testConnection();
}

async function getDashboardSummary(query) {
  const year = query.year || new Date().getFullYear();
  return repo.getDashboardSummary(year);
}

async function getProductLinesComparison(query) {
  return repo.getProductLinesComparison({ year: query.year, month: query.month });
}

async function getBestSellingProducts(query) {
  return repo.getBestSellingProducts({
    limit: query.limit,
    year: query.year,
    month: query.month,
    id_tipo_linea_producto: query.id_tipo_linea_producto,
  });
}

async function getVendedorPerformance(query) {
  const period = query.period || 'month';
  const year = query.year || new Date().getFullYear();
  const data = await repo.getVendedorPerformance({
    vendedor_id: query.vendedor_id,
    period,
    year,
    month: query.month,
  });
  return { data, period };
}

async function getSalesPerformance(query) {
  const period = query.period || 'month';
  const year = query.year || new Date().getFullYear();
  const data = await repo.getSalesPerformance({ period, year, month: query.month });
  return { data, period };
}

async function getVendedoresList() {
  return repo.getVendedoresList();
}

module.exports = {
  test,
  getDashboardSummary,
  getProductLinesComparison,
  getBestSellingProducts,
  getVendedorPerformance,
  getSalesPerformance,
  getVendedoresList,
};
