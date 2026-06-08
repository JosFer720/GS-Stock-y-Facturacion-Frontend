// Repositorio de CrearFactura: SQL para emitir una factura (pedido, detalle,
// inventario, factura) y obtener datos de producto para el PDF.
const pool = require('../db');

async function findClienteBasic(id, executor = pool) {
  const result = await executor.query(
    'SELECT nombre, apellido, empresa FROM clientes WHERE id = $1',
    [id]
  );
  return result.rows[0];
}

async function insertPedido(
  { idCliente, idVendedor, idMetodoPago, subtotal, total },
  executor = pool
) {
  const result = await executor.query(
    `INSERT INTO pedidos (
        id_cliente, id_estado_pedido, id_vendedor, id_metodo_de_pago,
        fecha, subtotal, total, id_pedido_estado_pago
      )
      VALUES ($1, 1, $2, $3, NOW(), $4, $5, 1)
      RETURNING id`,
    [idCliente, idVendedor, idMetodoPago, subtotal, total]
  );
  return result.rows[0].id;
}

async function insertDetalle({ cantidad, idZapato, idPedido }, executor = pool) {
  await executor.query(
    'INSERT INTO detalle_pedidos (cantidad, id_zapato, id_pedido) VALUES ($1, $2, $3)',
    [cantidad, idZapato, idPedido]
  );
}

// Descuenta stock del zapato; devuelve las filas afectadas (para validar que existió).
async function decrementStock(cantidad, idZapato, executor = pool) {
  const result = await executor.query(
    'UPDATE zapatos_tallas SET stock = stock - $1 WHERE id_zapato = $2 RETURNING stock',
    [cantidad, idZapato]
  );
  return result.rows;
}

async function insertFactura({ idPedido, subtotal, impuestos, total }, executor = pool) {
  const result = await executor.query(
    `INSERT INTO facturas (id_pedido, fecha_emision, subtotal, impuestos, total, estado)
       VALUES ($1, NOW(), $2, $3, $4, 'Emitida')
       RETURNING *`,
    [idPedido, subtotal, impuestos, total]
  );
  return result.rows[0];
}

async function findProductoForPdf(idZapato, executor = pool) {
  const result = await executor.query(
    'SELECT z.nombre, z.codigo, z.precio_venta FROM zapatos z WHERE z.id = $1',
    [idZapato]
  );
  return result.rows[0];
}

module.exports = {
  findClienteBasic,
  insertPedido,
  insertDetalle,
  decrementStock,
  insertFactura,
  findProductoForPdf,
};
