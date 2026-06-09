// Servicio de Ventas: lógica de negocio, transacciones (creación de pedido con
// validación de stock y descuentos, cambio de estado) y armado de datos.
// Lanza ServiceError para los casos esperados (400/403/404).
const pool = require('../db');
const repo = require('../repositories/ventasRepository');
const ServiceError = require('../utils/ServiceError');

// ─── Helpers de shaping ─────────────────────────────────────────────────

// Agrupa filas de cliente con sus direcciones/teléfonos (vista de ventas, sin NIT).
function formatClientResponse(rows) {
  const clientMap = new Map();

  rows.forEach((row) => {
    if (!clientMap.has(row.id)) {
      clientMap.set(row.id, {
        id: row.id,
        nombre: row.nombre,
        apellido: row.apellido,
        empresa: row.empresa,
        direcciones: [],
        telefonos: [],
      });
    }

    const cliente = clientMap.get(row.id);

    if (row.direccion_id && !cliente.direcciones.some((d) => d.id === row.direccion_id)) {
      cliente.direcciones.push({ id: row.direccion_id, direccion: row.direccion });
    }
    if (row.telefono_id && !cliente.telefonos.some((t) => t.id === row.telefono_id)) {
      cliente.telefonos.push({ id: row.telefono_id, telefono: row.telefono });
    }
  });

  return Array.from(clientMap.values());
}

// Agrupa los detalles de un pedido por zapato, acumulando tallas y subtotal.
function groupProductosPedido(rows) {
  const productsMap = new Map();

  for (const row of rows) {
    const zapatoId = row.id_zapato;

    if (!productsMap.has(zapatoId)) {
      productsMap.set(zapatoId, {
        id: zapatoId,
        codigo: row.codigo,
        nombre: row.nombre,
        precio_par: row.precio_par || row.precio_unitario || 0,
        tipo_linea: row.tipo_linea_producto || null,
        tallas: [],
        subtotal: 0,
      });
    }

    const prod = productsMap.get(zapatoId);
    prod.tallas.push({
      id: row.id_talla,
      talla_eu: row.talla_eu,
      talla_us: row.talla_us,
      cantidad: row.cantidad,
    });
    prod.subtotal += Number(row.precio_unitario || prod.precio_par || 0) * Number(row.cantidad || 0);
  }

  return Array.from(productsMap.values());
}

// ─── Catálogos / lecturas ───────────────────────────────────────────────

async function getMetodosPago() {
  return repo.findMetodosPago();
}

async function getTiposLineaProducto() {
  return repo.findTiposLineaProducto();
}

async function getTiposCliente() {
  return repo.findTiposCliente();
}

async function getEstadosPedidos() {
  return repo.findEstadosPedidos();
}

async function getVendedores() {
  return repo.findVendedores();
}

async function getClientes() {
  const rows = await repo.findClientesConContacto();
  return formatClientResponse(rows);
}

async function getVendedorActual(userId) {
  const usuario = await repo.findUsuarioActual(userId);
  if (!usuario) {
    throw new ServiceError(404, { success: false, error: 'Usuario no encontrado' });
  }
  return {
    id: usuario.id,
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    nombre_completo: `${usuario.nombre} ${usuario.apellido}`,
    rol: usuario.rol,
    es_vendedor: usuario.rol === 'Vendedor',
    es_administrador: usuario.rol === 'Administrador',
    es_super_admin: usuario.rol === 'Super Admin',
    usuario: usuario.usuario,
  };
}

async function listPedidos({ role, userId, limit, page }) {
  const limitParam = Math.min(Number(limit) || 10, 100);
  const pageParam = Math.max(Number(page) || 1, 1);
  const offsetParam = (pageParam - 1) * limitParam;

  const vendedorId = role === 'Vendedor' && userId ? userId : null;

  const total = await repo.countPedidos(vendedorId);
  const data = await repo.findPedidos(vendedorId, limitParam, offsetParam);

  return {
    data,
    total,
    page: pageParam,
    perPage: limitParam,
    totalPages: Math.ceil(total / limitParam),
  };
}

async function getProductosPedido(id) {
  const rows = await repo.findDetallesPedido(id);
  return groupProductosPedido(rows);
}

// ─── Creación de pedido (transacción) ───────────────────────────────────

async function createPedido(body, user) {
  const { id_cliente, id_tipo_linea_producto, productos } = body;

  const vendedor = await repo.findVendedorElegible(user.id);
  if (!vendedor) {
    throw new ServiceError(403, {
      error: 'El usuario actual no tiene permisos de vendedor o administrador',
    });
  }
  const idVendedor = vendedor.vendedor_id;

  if (!id_cliente || !id_tipo_linea_producto || !productos || productos.length === 0) {
    throw new ServiceError(400, {
      error: 'Faltan campos requeridos: id_cliente, id_tipo_linea_producto, productos',
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Validar stock disponible de cada producto.
    const stockValidation = [];
    for (const producto of productos) {
      const stock = await repo.findStockZapatoTalla(producto.id_zapato, producto.id_talla, client);
      if (!stock) {
        throw new ServiceError(400, {
          error: `No se encontró la talla especificada para el zapato ID ${producto.id_zapato}`,
        });
      }
      if (stock.stock < producto.cantidad) {
        throw new ServiceError(400, {
          error: `Stock insuficiente para ${stock.nombre} talla EU ${stock.talla_eu}. Disponible: ${stock.stock}, Solicitado: ${producto.cantidad}`,
          codigo_error: 'STOCK_INSUFICIENTE',
          detalles: {
            zapato: stock.nombre,
            talla_eu: stock.talla_eu,
            stock_disponible: stock.stock,
            cantidad_solicitada: producto.cantidad,
          },
        });
      }
      stockValidation.push({ stock_restante: stock.stock - producto.cantidad });
    }

    // Calcular subtotal, descuento y total.
    let subtotal = 0;
    for (const producto of productos) {
      subtotal += producto.cantidad * producto.precio_unitario;
    }
    const descuento = await repo.findDescuentoCliente(id_cliente, client);
    const montoDescuento = subtotal * descuento;
    const total = subtotal - montoDescuento;

    // Crear el pedido (estado pedido = 1, estado pago = 1 / PENDIENTE).
    const pedido = await repo.insertPedido(
      {
        idCliente: id_cliente,
        idVendedor,
        idTipoLineaProducto: id_tipo_linea_producto,
        subtotal,
        total,
        idEstadoPedido: 1,
        idEstadoPago: 1,
      },
      client
    );
    const pedidoId = pedido.id;

    const tipoLinea = await repo.findNombreTipoLinea(id_tipo_linea_producto, client);
    if (!tipoLinea) {
      throw new Error('Tipo de línea de producto no encontrado');
    }

    // Insertar detalles y descontar inventario.
    const detallesInsertados = [];
    for (let i = 0; i < productos.length; i++) {
      const producto = productos[i];
      const precioUnitarioNum = Number(producto.precio_unitario);
      const precioForDb = Number.isFinite(precioUnitarioNum) ? precioUnitarioNum : null;

      const detalle = await repo.insertDetallePedido(
        {
          cantidad: producto.cantidad,
          idZapato: producto.id_zapato,
          idPedido: pedidoId,
          idTalla: producto.id_talla,
          precioUnitario: precioForDb,
        },
        client
      );

      await repo.decrementStockTalla(producto.cantidad, producto.id_zapato, producto.id_talla, client);
      await repo.decrementInventarioGeneral(
        producto.cantidad,
        user?.id || 1,
        producto.id_zapato,
        client
      );

      detallesInsertados.push({ detalle, stock_actualizado: stockValidation[i].stock_restante });
    }

    await repo.insertEstadoHistorico(pedidoId, 1, user?.id || 1, 'Pedido creado', client);

    await client.query('COMMIT');

    return {
      pedido,
      envio: null,
      vendedor: { id: idVendedor, nombre: `${vendedor.nombre} ${vendedor.apellido}` },
      detalles: detallesInsertados,
      resumen: {
        subtotal: parseFloat(subtotal),
        descuento_aplicado: parseFloat(montoDescuento),
        total: parseFloat(total),
        productos_vendidos: productos.length,
        tipo_linea: tipoLinea.nombre,
      },
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ─── Cambio de estado de pedido (transacción) ───────────────────────────

async function updateEstadoPedido(id, estado, user) {
  if (!estado) {
    throw new ServiceError(400, { error: 'El estado es requerido' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const estadoId = await repo.findEstadoIdByNombre(estado, client);
    if (estadoId === undefined) {
      throw new ServiceError(400, { error: 'Estado no válido' });
    }

    const pedido = await repo.updatePedidoEstado(estadoId, id, client);
    if (!pedido) {
      throw new ServiceError(404, { error: 'Pedido no encontrado' });
    }

    await repo.insertEstadoHistorico(
      id,
      estadoId,
      user?.id || 1,
      `Estado cambiado a ${estado}`,
      client
    );

    await client.query('COMMIT');

    return { pedido_id: id, nuevo_estado: estado, pedido };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  getMetodosPago,
  getTiposLineaProducto,
  getTiposCliente,
  getEstadosPedidos,
  getVendedores,
  getClientes,
  getVendedorActual,
  listPedidos,
  getProductosPedido,
  createPedido,
  updateEstadoPedido,
};
