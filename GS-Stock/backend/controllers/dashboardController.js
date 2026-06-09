// Controlador de Dashboard: capa HTTP. Cada handler responde { success, data }
// y, en error, un 500 con el mensaje específico del endpoint original.
const service = require('../services/dashboardService');

// Crea un handler que llama a `serviceFn` y responde con el formato estándar.
function makeHandler(serviceFn, errorMessage, logLabel) {
  return async (req, res) => {
    try {
      const data = await serviceFn();
      res.json({ success: true, data });
    } catch (err) {
      console.error(`${logLabel}:`, err);
      res.status(500).json({ error: errorMessage, details: err.message });
    }
  };
}

module.exports = {
  getIngresos: makeHandler(
    () => service.getIngresos(),
    'Error al obtener los ingresos',
    'Error al obtener ingresos'
  ),
  getPedidosPendientes: makeHandler(
    () => service.getPedidosPendientes(),
    'Error al obtener los pedidos pendientes',
    'Error al obtener pedidos pendientes'
  ),
  getNuevosClientes: makeHandler(
    () => service.getNuevosClientes(),
    'Error al obtener los nuevos clientes',
    'Error al obtener nuevos clientes'
  ),
  getVentasMensuales: makeHandler(
    () => service.getVentasMensuales(),
    'Error al obtener las ventas mensuales',
    'Error al obtener ventas mensuales'
  ),
  getProductosMasVendidos: makeHandler(
    () => service.getProductosMasVendidos(),
    'Error al obtener los productos más vendidos',
    'Error al obtener productos más vendidos'
  ),
  getActividadReciente: makeHandler(
    () => service.getActividadReciente(),
    'Error al obtener la actividad reciente',
    'Error al obtener actividad reciente'
  ),
  getAlertas: makeHandler(
    () => service.getAlertas(),
    'Error al obtener las alertas',
    'Error al obtener alertas'
  ),
  getResumen: makeHandler(
    () => service.getResumen(),
    'Error al obtener el resumen del dashboard',
    'Error al obtener resumen del dashboard'
  ),
};
