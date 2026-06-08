// Servicio de CrearFactura: valida, emite la factura dentro de una transacción
// (pedido + detalle + inventario + factura) y genera el PDF.
// Corrige el manejo de transacción original (usaba el pool directamente para
// BEGIN/COMMIT) por una transacción con un client dedicado.
const pool = require('../db');
const repo = require('../repositories/crearFacturaRepository');
const ServiceError = require('../utils/ServiceError');
const { generarFacturaPDF } = require('../utils/facturaPdf');

function validar(body) {
  const { id_cliente, id_metodo_pago, items, subtotal, total, id_usuario } = body;

  if (!id_cliente || !id_metodo_pago || !items || !Array.isArray(items) || items.length === 0) {
    throw new ServiceError(400, {
      success: false,
      error: 'Faltan campos obligatorios o items inválidos',
      received: {
        id_cliente: !!id_cliente,
        id_metodo_pago: !!id_metodo_pago,
        items: items ? items.length : 0,
      },
    });
  }

  if (!subtotal || !total || !id_usuario) {
    throw new ServiceError(400, {
      success: false,
      error: 'Faltan montos o usuario',
      received: { subtotal: !!subtotal, total: !!total, id_usuario: !!id_usuario },
    });
  }

  // Normaliza y valida cada item.
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item.id_zapato || !item.cantidad) {
      throw new ServiceError(400, {
        success: false,
        error: `Item ${i + 1} incompleto: falta id_zapato o cantidad`,
        item_error: item,
      });
    }
    items[i].id_zapato = parseInt(item.id_zapato, 10);
    items[i].cantidad = parseInt(item.cantidad, 10);
    if (isNaN(items[i].id_zapato) || isNaN(items[i].cantidad)) {
      throw new ServiceError(400, {
        success: false,
        error: `Item ${i + 1} tiene valores no numéricos`,
        item_error: item,
      });
    }
  }
}

// Enriquece cada item con datos de producto para el PDF (con valores por defecto
// si el producto no existe o la consulta falla).
async function buildItemsConDetalles(items, client) {
  const itemsConDetalles = [];
  for (const item of items) {
    try {
      const producto = await repo.findProductoForPdf(item.id_zapato, client);
      if (!producto) {
        itemsConDetalles.push({
          ...item,
          nombre: `Producto ID: ${item.id_zapato}`,
          codigo: `COD-${item.id_zapato}`,
          precio_unitario: 0,
        });
      } else {
        itemsConDetalles.push({
          ...item,
          nombre: producto.nombre || `Producto ${item.id_zapato}`,
          codigo: producto.codigo || `COD-${item.id_zapato}`,
          precio_unitario: producto.precio_venta || 0,
        });
      }
    } catch (queryError) {
      console.error(`Error en consulta de producto ${item.id_zapato}:`, queryError);
      itemsConDetalles.push({
        ...item,
        nombre: `Producto ID: ${item.id_zapato}`,
        codigo: `COD-${item.id_zapato}`,
        precio_unitario: 0,
      });
    }
  }
  return itemsConDetalles;
}

async function crearFactura(body) {
  validar(body);

  const {
    id_cliente,
    id_metodo_pago,
    nit,
    items,
    subtotal,
    direccion_facturacion,
    telefono_cliente,
    total,
    id_usuario,
  } = body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const cliente = await repo.findClienteBasic(id_cliente, client);
    if (!cliente) {
      throw new Error('Cliente no encontrado');
    }

    const idPedido = await repo.insertPedido(
      { idCliente: id_cliente, idVendedor: id_usuario, idMetodoPago: id_metodo_pago, subtotal, total },
      client
    );

    for (const item of items) {
      await repo.insertDetalle(
        { cantidad: item.cantidad, idZapato: item.id_zapato, idPedido },
        client
      );
      const filas = await repo.decrementStock(item.cantidad, item.id_zapato, client);
      if (filas.length === 0) {
        throw new Error(`No se pudo actualizar el inventario para el producto ${item.id_zapato}`);
      }
    }

    const impuestos = parseFloat(total) - parseFloat(subtotal);
    const factura = await repo.insertFactura(
      { idPedido, subtotal, impuestos, total },
      client
    );

    const itemsConDetalles = await buildItemsConDetalles(items, client);

    const pdfBuffer = await generarFacturaPDF(factura, itemsConDetalles, {
      nombre: `${cliente.nombre} ${cliente.apellido}`,
      empresa: cliente.empresa || '',
      nit: nit || 'CF',
      direccion: direccion_facturacion || 'Sin dirección',
      telefono: telefono_cliente || 'Sin teléfono',
    });

    await client.query('COMMIT');

    return { pdfBuffer, factura };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { crearFactura };
