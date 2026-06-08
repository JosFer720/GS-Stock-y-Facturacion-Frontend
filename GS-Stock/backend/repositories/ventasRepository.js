// Repositorio de Ventas: único lugar con SQL para pedidos, catálogos, stock,
// inventario e histórico de estados. Cada función recibe un `executor`
// (pool compartido o client de transacción).
const pool = require('../db');

// ─── Catálogos ──────────────────────────────────────────────────────────

async function findMetodosPago(executor = pool) {
  const result = await executor.query('SELECT * FROM Metodos_De_Pago ORDER BY tipo');
  return result.rows;
}

async function findTiposLineaProducto(executor = pool) {
  const result = await executor.query('SELECT * FROM Tipos_Linea_Producto ORDER BY nombre');
  return result.rows;
}

async function findNombreTipoLinea(id, executor = pool) {
  const result = await executor.query('SELECT nombre FROM Tipos_Linea_Producto WHERE id = $1', [
    id,
  ]);
  return result.rows[0];
}

async function findTiposCliente(executor = pool) {
  const result = await executor.query('SELECT * FROM Tipos_De_Cliente ORDER BY tipo');
  return result.rows;
}

async function findEstadosPedidos(executor = pool) {
  const result = await executor.query('SELECT * FROM Estados_Pedidos ORDER BY id');
  return result.rows;
}

async function findEstadoIdByNombre(estado, executor = pool) {
  const result = await executor.query('SELECT id FROM Estados_Pedidos WHERE estado = $1', [estado]);
  return result.rows[0]?.id;
}

// ─── Vendedores / usuarios ──────────────────────────────────────────────

// Usuario habilitado para vender (rol Vendedor/Administrador/Super Admin).
async function findVendedorElegible(userId, executor = pool) {
  const result = await executor.query(
    `SELECT u.id as vendedor_id, u.nombre, u.apellido, r.rol
       FROM Usuarios u
       JOIN Roles r ON u.id_roles = r.id
       WHERE u.id = $1 AND r.rol IN ('Vendedor','Administrador','Super Admin')`,
    [userId]
  );
  return result.rows[0];
}

async function findUsuarioActual(userId, executor = pool) {
  const result = await executor.query(
    `SELECT u.id, u.nombre, u.apellido, r.rol, cu.usuario
       FROM Usuarios u
       JOIN Roles r ON u.id_roles = r.id
       LEFT JOIN Cuentas_Usuarios cu ON u.id = cu.id_usuarios
       WHERE u.id = $1`,
    [userId]
  );
  return result.rows[0];
}

async function findVendedores(executor = pool) {
  const result = await executor.query(
    `SELECT u.id, u.nombre || ' ' || u.apellido as nombre_completo, r.rol
       FROM Usuarios u
       JOIN Roles r ON u.id_roles = r.id
       WHERE r.rol = 'Vendedor'
       ORDER BY nombre_completo`
  );
  return result.rows;
}

// ─── Clientes (vista de ventas) ─────────────────────────────────────────

async function findClientesConContacto(executor = pool) {
  const result = await executor.query(`
    SELECT
      c.id,
      c.nombre,
      c.apellido,
      c.empresa,
      d.id as direccion_id,
      d.direccion,
      t.id as telefono_id,
      t.telefono
    FROM clientes c
    LEFT JOIN cliente_direcciones cd ON c.id = cd.id_cliente
    LEFT JOIN direcciones d ON cd.id_direccion = d.id
    LEFT JOIN cliente_telefonos ct ON c.id = ct.id_cliente
    LEFT JOIN telefonos t ON ct.id_telefono = t.id
    ORDER BY c.id
  `);
  return result.rows;
}

async function findDescuentoCliente(idCliente, executor = pool) {
  const result = await executor.query(
    `SELECT COALESCE(tc.descuento, 0.0) AS descuento
       FROM clientes c
       LEFT JOIN tipos_de_cliente tc ON tc.id = c.id_tipo_cliente
       WHERE c.id = $1`,
    [idCliente]
  );
  return Number(result.rows?.[0]?.descuento ?? 0.0);
}

// ─── Pedidos: listado y detalle ─────────────────────────────────────────

// Cuenta pedidos; si se pasa vendedorId filtra por vendedor.
async function countPedidos(vendedorId, executor = pool) {
  if (vendedorId) {
    const result = await executor.query(
      'SELECT COUNT(*) AS total FROM Pedidos p WHERE p.id_vendedor = $1',
      [vendedorId]
    );
    return Number(result.rows[0].total || 0);
  }
  const result = await executor.query('SELECT COUNT(*) AS total FROM Pedidos p');
  return Number(result.rows[0].total || 0);
}

// Lista pedidos paginados; si se pasa vendedorId filtra por vendedor.
async function findPedidos(vendedorId, limit, offset, executor = pool) {
  const base = `
    SELECT
      p.*,
      c.nombre || ' ' || c.apellido as cliente_nombre,
      c.empresa,
      u.nombre || ' ' || u.apellido as vendedor_nombre,
      ep.estado as estado_pedido,
      tlp.nombre as tipo_linea_producto,
      pep.estado as estado_pago
    FROM Pedidos p
    LEFT JOIN Clientes c ON p.id_cliente = c.id
    LEFT JOIN Usuarios u ON p.id_vendedor = u.id
    LEFT JOIN Estados_Pedidos ep ON p.id_estado_pedido = ep.id
    LEFT JOIN Tipos_Linea_Producto tlp ON p.id_tipo_linea_producto = tlp.id
    LEFT JOIN pedidos_estado_pago pep ON p.id_pedido_estado_pago = pep.id
  `;

  if (vendedorId) {
    const result = await executor.query(
      `${base} WHERE p.id_vendedor = $1 ORDER BY p.fecha DESC LIMIT $2 OFFSET $3`,
      [vendedorId, limit, offset]
    );
    return result.rows;
  }

  const result = await executor.query(
    `${base} ORDER BY p.fecha DESC LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return result.rows;
}

async function findDetallesPedido(idPedido, executor = pool) {
  const result = await executor.query(
    `SELECT dp.id AS detalle_id, dp.id_zapato, dp.id_talla, dp.cantidad, dp.precio_unitario,
        z.codigo, z.nombre, z.precio_par,
        t.talla_eu, t.talla_us,
        tlp.nombre as tipo_linea_producto
       FROM Detalle_Pedidos dp
       JOIN Zapatos z ON dp.id_zapato = z.id
       LEFT JOIN Inventarios i ON z.id = i.id_zapatos
       LEFT JOIN Tipos_Linea_Producto tlp ON i.id_tipo_linea_producto = tlp.id
       LEFT JOIN Tallas t ON dp.id_talla = t.id
       WHERE dp.id_pedido = $1
       ORDER BY z.id, t.talla_eu`,
    [idPedido]
  );
  return result.rows;
}

// ─── Pedidos: creación / actualización (transacciones) ──────────────────

async function findStockZapatoTalla(idZapato, idTalla, executor = pool) {
  const result = await executor.query(
    `SELECT zt.stock, z.nombre, t.talla_eu
       FROM Zapatos_Tallas zt
       JOIN Zapatos z ON zt.id_zapato = z.id
       JOIN Tallas t ON zt.id_talla = t.id
       WHERE zt.id_zapato = $1 AND zt.id_talla = $2`,
    [idZapato, idTalla]
  );
  return result.rows[0];
}

async function insertPedido(
  { idCliente, idVendedor, idTipoLineaProducto, subtotal, total, idEstadoPedido, idEstadoPago },
  executor = pool
) {
  const result = await executor.query(
    `INSERT INTO Pedidos (
        id_cliente, id_vendedor, id_tipo_linea_producto,
        subtotal, total, id_estado_pedido, id_pedido_estado_pago
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
    [idCliente, idVendedor, idTipoLineaProducto, subtotal, total, idEstadoPedido, idEstadoPago]
  );
  return result.rows[0];
}

async function insertDetallePedido(
  { cantidad, idZapato, idPedido, idTalla, precioUnitario },
  executor = pool
) {
  const result = await executor.query(
    `INSERT INTO Detalle_Pedidos (cantidad, id_zapato, id_pedido, id_talla, precio_unitario)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
    [cantidad, idZapato, idPedido, idTalla, precioUnitario]
  );
  return result.rows[0];
}

async function decrementStockTalla(cantidad, idZapato, idTalla, executor = pool) {
  await executor.query(
    'UPDATE Zapatos_Tallas SET stock = stock - $1 WHERE id_zapato = $2 AND id_talla = $3',
    [cantidad, idZapato, idTalla]
  );
}

async function decrementInventarioGeneral(cantidad, idUsuario, idZapato, executor = pool) {
  await executor.query(
    `UPDATE Inventarios
       SET cantidad = cantidad - $1,
           fecha_de_ingreso = CURRENT_TIMESTAMP,
           id_usuarios = $2
       WHERE id_zapatos = $3`,
    [cantidad, idUsuario, idZapato]
  );
}

async function insertEstadoHistorico(idPedido, idEstado, idUsuario, observacion, executor = pool) {
  await executor.query(
    `INSERT INTO Estados_Pedido_Historico (id_pedido, id_estado_pedido, id_usuario, observacion)
       VALUES ($1, $2, $3, $4)`,
    [idPedido, idEstado, idUsuario, observacion]
  );
}

async function updatePedidoEstado(estadoId, idPedido, executor = pool) {
  const result = await executor.query(
    'UPDATE Pedidos SET id_estado_pedido = $1 WHERE id = $2 RETURNING *',
    [estadoId, idPedido]
  );
  return result.rows[0];
}

module.exports = {
  findMetodosPago,
  findTiposLineaProducto,
  findNombreTipoLinea,
  findTiposCliente,
  findEstadosPedidos,
  findEstadoIdByNombre,
  findVendedorElegible,
  findUsuarioActual,
  findVendedores,
  findClientesConContacto,
  findDescuentoCliente,
  countPedidos,
  findPedidos,
  findDetallesPedido,
  findStockZapatoTalla,
  insertPedido,
  insertDetallePedido,
  decrementStockTalla,
  decrementInventarioGeneral,
  insertEstadoHistorico,
  updatePedidoEstado,
};
