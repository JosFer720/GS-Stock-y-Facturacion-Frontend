// Servicio de Envíos: registra un envío (nacional o importadora) dentro de una
// transacción y genera su PDF. Lanza ServiceError para 400/404.
const pool = require('../db');
const repo = require('../repositories/enviosRepository');
const ServiceError = require('../utils/ServiceError');
const { crearPDFEnvioNacional } = require('../utils/envioNacionalPdf');
const { crearPDFEnvioImportadora } = require('../utils/envioImportadoraPdf');

const DIA_MS = 24 * 60 * 60 * 1000;

function generarNumeroEnvio(tipo) {
  const fecha = new Date();
  const year = fecha.getFullYear().toString().slice(-2);
  const month = (fecha.getMonth() + 1).toString().padStart(2, '0');
  const day = fecha.getDate().toString().padStart(2, '0');
  const timestamp = Date.now().toString().slice(-6);
  return `${tipo}${year}${month}${day}${timestamp}`;
}

// Flujo común de creación de envío, parametrizado por línea.
async function crearEnvio(body, cfg) {
  const { pedido_id, transporte, fecha_entrega_estimada, observaciones } = body;

  if (!pedido_id) {
    throw new ServiceError(400, { success: false, error: 'El ID del pedido es requerido' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const datosPedido = await cfg.findPedido(pedido_id, client);
    if (!datosPedido) {
      throw new ServiceError(404, { success: false, error: cfg.notFoundError });
    }

    const numeroEnvio = generarNumeroEnvio(cfg.prefix);
    const productos = await cfg.findProductos(pedido_id, client);

    await repo.insertEnvio(
      {
        pedidoId: pedido_id,
        fechaEnvio: new Date(),
        fechaEntrega: fecha_entrega_estimada || new Date(Date.now() + cfg.entregaDias * DIA_MS),
        transporte: transporte || 'Por definir',
        numeroEnvio,
        observaciones: observaciones || cfg.observacionesDefault,
      },
      client
    );

    const datosEnvio = {
      numero_envio: numeroEnvio,
      cliente_nombre: datosPedido.cliente_nombre,
      cliente_direccion: datosPedido.cliente_direccion,
      vendedor_nombre: datosPedido.vendedor_nombre,
      transporte: transporte || 'Por definir',
      total: parseFloat(datosPedido.total_pedido || 0),
      productos: productos.map((p) => ({
        cantidad: p.cantidad,
        codigo: p.codigo,
        nombre: `${p.nombre} - EU ${p.talla_eu || 'N/A'}`,
        precio_unitario: parseFloat(p.precio_unitario || 0),
      })),
    };

    const pdfResult = await cfg.generarPdf(datosEnvio);

    await client.query('COMMIT');
    return pdfResult;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function crearEnvioNacional(body) {
  return crearEnvio(body, {
    prefix: 'NAL',
    notFoundError: 'Pedido no encontrado o no pertenece a línea nacional',
    findPedido: repo.findPedidoNacional,
    findProductos: repo.findProductosNacional,
    entregaDias: 3,
    observacionesDefault: '',
    generarPdf: crearPDFEnvioNacional,
  });
}

async function crearEnvioImportadora(body) {
  return crearEnvio(body, {
    prefix: 'IMP',
    notFoundError: 'Pedido no encontrado o no pertenece a línea importadora',
    findPedido: repo.findPedidoImportadora,
    findProductos: repo.findProductosImportadora,
    entregaDias: 7,
    observacionesDefault: 'Generado automáticamente',
    generarPdf: crearPDFEnvioImportadora,
  });
}

async function listEnviosNacional() {
  return repo.findEnviosByLinea('%nacional%');
}

async function listEnviosImportadora() {
  return repo.findEnviosByLinea('%importadora%');
}

module.exports = {
  crearEnvioNacional,
  crearEnvioImportadora,
  listEnviosNacional,
  listEnviosImportadora,
};
