// Servicio de Dashboard: arma las métricas y aplica el formato (parseo,
// tiempos relativos, construcción de alertas).
const repo = require('../repositories/dashboardRepository');

function formatTiempoTranscurrido(fecha) {
  const minutos = Math.floor((Date.now() - new Date(fecha)) / 60000);
  if (minutos < 1) return 'Hace menos de 1 min';
  if (minutos < 60) return `Hace ${minutos} min`;
  if (minutos < 1440) return `Hace ${Math.floor(minutos / 60)} horas`;
  return `Hace ${Math.floor(minutos / 1440)} días`;
}

async function getIngresos() {
  const row = await repo.getIngresos();
  return {
    total: parseFloat(row.total_actual),
    porcentaje_cambio: parseFloat(row.porcentaje_cambio),
    periodo: 'Últimos 30 días',
  };
}

async function getPedidosPendientes() {
  const total = await repo.countPedidosPendientes();
  return { total: parseInt(total, 10), mensaje: 'Acción Requerida' };
}

async function getNuevosClientes() {
  const total = await repo.countNuevosClientes();
  return { total: parseInt(total, 10), periodo: 'Este mes' };
}

async function getVentasMensuales() {
  const rows = await repo.getVentasMensuales();
  return rows.map((row) => ({
    mes: row.mes,
    linea_nacional: parseFloat(row.linea_nacional),
    linea_importadora: parseFloat(row.linea_importadora),
  }));
}

async function getProductosMasVendidos() {
  const rows = await repo.getProductosMasVendidos();
  return rows.map((row) => ({ producto: row.producto, cantidad: parseInt(row.cantidad_vendida, 10) }));
}

async function getActividadReciente() {
  const rows = await repo.getActividadReciente();
  return rows.map((row) => ({
    pedido_id: row.pedido_id,
    tiempo: formatTiempoTranscurrido(row.fecha),
    cliente: row.cliente,
    estado: row.estado,
    productos: row.productos,
    total: parseFloat(row.total),
  }));
}

async function getAlertas() {
  const alertas = [];

  const stockBajo = await repo.getStockBajoConTalla();
  stockBajo.forEach((row) => {
    alertas.push({
      tipo: 'stock_bajo',
      mensaje: `Stock bajo: ${row.producto} (Talla ${row.talla_eu}EU) - ${row.stock} unidades`,
      prioridad: row.stock < 10 ? 'alta' : 'media',
    });
  });

  const pagosPendientes = await repo.countPagosPendientes7d();
  if (pagosPendientes > 0) {
    alertas.push({
      tipo: 'pagos_pendientes',
      mensaje: `Pendiente: ${pagosPendientes} pago${pagosPendientes > 1 ? 's' : ''} retrasado${pagosPendientes > 1 ? 's' : ''}`,
      prioridad: 'alta',
    });
  }

  const pedidosPendientes = await repo.countPedidosPendientes2d();
  if (pedidosPendientes > 0) {
    alertas.push({
      tipo: 'pedidos_pendientes',
      mensaje: `${pedidosPendientes} pedido${pedidosPendientes > 1 ? 's' : ''} pendiente${pedidosPendientes > 1 ? 's' : ''} de hace más de 2 días`,
      prioridad: 'media',
    });
  }

  if (alertas.length === 0) {
    alertas.push({ tipo: 'sin_alertas', mensaje: 'No hay alertas en este momento', prioridad: 'baja' });
  }

  return alertas;
}

async function getResumen() {
  const [
    ingresos,
    pedidosPendientes,
    clientesDelMes,
    ventasMensuales,
    productosVendidos,
    actividad,
    stockBajo,
  ] = await Promise.all([
    repo.getIngresos(),
    repo.countPedidosPendientes(),
    repo.countClientesDelMes(),
    repo.getVentasMensuales(),
    repo.getProductosMasVendidos(),
    repo.getActividadResumen(),
    repo.getStockBajoResumen(),
  ]);

  return {
    ingresos: {
      total: parseFloat(ingresos.total_actual),
      porcentaje_cambio: parseFloat(ingresos.porcentaje_cambio),
    },
    pedidos_pendientes: parseInt(pedidosPendientes, 10),
    nuevos_clientes: parseInt(clientesDelMes, 10),
    ventas_mensuales: ventasMensuales,
    productos_mas_vendidos: productosVendidos,
    actividad_reciente: actividad,
    alertas: stockBajo,
  };
}

module.exports = {
  getIngresos,
  getPedidosPendientes,
  getNuevosClientes,
  getVentasMensuales,
  getProductosMasVendidos,
  getActividadReciente,
  getAlertas,
  getResumen,
};
