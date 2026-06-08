// Servicio de Devoluciones: validaciones, transacción de registro (con
// reposición de stock e histórico) y CRUD. Lanza ServiceError para 400/404.
const pool = require('../db');
const repo = require('../repositories/devolucionesRepository');
const ServiceError = require('../utils/ServiceError');

const METODO_DEVOLUCION_DEFAULT = 1; // Efectivo

async function getMetodos() {
  return repo.findMetodos();
}

// Pedidos despachados del cliente, agrupando sus productos.
async function getPedidosCliente(clienteId) {
  const rows = await repo.findPedidosDespachadosByCliente(clienteId);

  const pedidosMap = new Map();
  rows.forEach((row) => {
    if (!pedidosMap.has(row.pedido_id)) {
      pedidosMap.set(row.pedido_id, {
        id: row.pedido_id,
        fecha: row.pedido_fecha,
        total: row.pedido_total,
        estado: row.pedido_estado,
        productos: [],
      });
    }
    pedidosMap.get(row.pedido_id).productos.push({
      detalle_id: row.detalle_id,
      zapato_id: row.zapato_id,
      codigo: row.codigo,
      nombre: row.zapato_nombre,
      talla_id: row.talla_id,
      talla_eu: row.talla_eu,
      talla_us: row.talla_us,
      cantidad: row.cantidad,
      precio_unitario: row.precio_unitario,
    });
  });

  return Array.from(pedidosMap.values());
}

async function createDevolucion(body, user) {
  const { id_pedido, productos, motivo, observaciones_adicionales } = body;

  if (!id_pedido || !productos || productos.length === 0 || !motivo) {
    throw new ServiceError(400, {
      error: 'Se requieren los campos: id_pedido, productos (array), motivo',
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const pedido = await repo.findPedidoConEstado(id_pedido, client);
    if (!pedido) {
      throw new ServiceError(404, { error: 'Pedido no encontrado' });
    }
    if (pedido.estado !== 'Despachado') {
      throw new ServiceError(400, {
        error: 'Solo se pueden hacer devoluciones de pedidos despachados',
      });
    }
    if (await repo.existsDevolucionByPedido(id_pedido, client)) {
      throw new ServiceError(400, { error: 'Este pedido ya tiene una devolución registrada' });
    }

    // Validar productos y calcular monto.
    let montoTotalDevolucion = 0;
    const productosValidados = [];
    for (const prod of productos) {
      const detalle = await repo.findDetallePedido(prod.detalle_id, id_pedido, client);
      if (!detalle) {
        throw new ServiceError(400, {
          error: `Producto con detalle_id ${prod.detalle_id} no encontrado en el pedido`,
        });
      }
      if (prod.cantidad > detalle.cantidad) {
        throw new ServiceError(400, {
          error: `La cantidad a devolver (${prod.cantidad}) excede la cantidad original (${detalle.cantidad}) para ${detalle.nombre}`,
        });
      }
      const montoProducto = prod.cantidad * parseFloat(detalle.precio_unitario);
      montoTotalDevolucion += montoProducto;
      productosValidados.push({
        zapato_id: detalle.id_zapato,
        talla_id: detalle.id_talla,
        cantidad: prod.cantidad,
        codigo: detalle.codigo,
        nombre: detalle.nombre,
        monto: montoProducto,
      });
    }

    const devolucion = await repo.insertDevolucion(
      {
        idPedido: id_pedido,
        motivo,
        idMetodo: METODO_DEVOLUCION_DEFAULT,
        monto: montoTotalDevolucion,
      },
      client
    );

    // Reponer stock de los productos devueltos.
    for (const prod of productosValidados) {
      await repo.incrementStockTalla(prod.cantidad, prod.zapato_id, prod.talla_id, client);
      await repo.incrementInventario(prod.cantidad, prod.zapato_id, client);
    }

    const observacion = `Devolución registrada: ${motivo}${
      observaciones_adicionales ? '. ' + observaciones_adicionales : ''
    }. Productos devueltos: ${productosValidados.length}`;
    await repo.insertHistoricoDespachado(id_pedido, user?.id || 1, observacion, client);

    await client.query('COMMIT');

    return {
      id: devolucion.id,
      id_pedido,
      cliente_nombre: pedido.cliente_nombre,
      motivo,
      monto_devuelto: parseFloat(montoTotalDevolucion),
      metodo_devolucion: 'Efectivo',
      fecha: devolucion.fecha,
      productos_devueltos: productosValidados.map((p) => ({
        codigo: p.codigo,
        nombre: p.nombre,
        cantidad: p.cantidad,
        monto: p.monto,
      })),
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function listDevoluciones() {
  return repo.findAll();
}

async function updateDevolucion(id, body) {
  const existente = await repo.findById(id);
  if (!existente) {
    throw new ServiceError(404, { error: 'Devolución no encontrada' });
  }

  const fields = {};
  if (body.motivo) fields.motivo = body.motivo;
  if (body.id_metodo_devolucion) fields.id_metodo_devolucion = body.id_metodo_devolucion;
  if (body.monto !== undefined) fields.monto = body.monto;

  if (Object.keys(fields).length === 0) {
    throw new ServiceError(400, { error: 'No se proporcionaron campos para actualizar' });
  }

  return repo.updateFields(id, fields);
}

async function deleteDevolucion(id) {
  const existente = await repo.findById(id);
  if (!existente) {
    throw new ServiceError(404, { error: 'Devolución no encontrada' });
  }
  await repo.deleteById(id);
}

module.exports = {
  getMetodos,
  getPedidosCliente,
  createDevolucion,
  listDevoluciones,
  updateDevolucion,
  deleteDevolucion,
};
