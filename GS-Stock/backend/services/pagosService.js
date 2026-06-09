// Servicio de Pagos: consultas de saldos y registro de pagos con cálculo de
// saldo restante y vuelto (transacción).
// NOTA: las validaciones de negocio se lanzan como Error y el controlador las
// responde como 500 con el mensaje, preservando el contrato original (podría
// mejorarse a 400 en una iteración futura).
const pool = require('../db');
const repo = require('../repositories/pagosRepository');

async function getClientesPendientes() {
  return repo.findClientesPendientes();
}

async function getPedidosCliente(clienteId) {
  return repo.findPedidosPendientesByCliente(clienteId);
}

async function registerPayment(body) {
  const { id_pedido, id_metodo_pago, monto_pagado, observaciones } = body;

  if (!monto_pagado || monto_pagado <= 0) {
    throw new Error('El monto pagado debe ser mayor a cero');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const order = await repo.findPedidoForPago(id_pedido, client);
    if (!order) {
      throw new Error('Pedido no encontrado');
    }

    const originalTotal = parseFloat(order.total);
    if (originalTotal <= 0 && order.id_pedido_estado_pago === 2) {
      throw new Error('Este pedido ya ha sido pagado completamente');
    }

    // Saldo actual = saldo del último pago, o el total original si no hay pagos.
    const latestBalance = await repo.findLatestBalance(id_pedido, client);
    const currentBalance = latestBalance !== undefined ? parseFloat(latestBalance) : originalTotal;

    if (monto_pagado > currentBalance) {
      throw new Error(
        `El monto ingresado (Q${monto_pagado.toFixed(2)}) excede el saldo pendiente (Q${currentBalance.toFixed(2)})`
      );
    }

    let vuelto = 0;
    let newBalance = currentBalance - monto_pagado;
    if (newBalance < 0) {
      vuelto = Math.abs(newBalance);
      newBalance = 0;
    }

    const payment = await repo.insertPago(
      {
        idPedido: id_pedido,
        totalPedido: newBalance,
        idMetodo: id_metodo_pago,
        montoPagado: monto_pagado,
        vuelto: vuelto > 0 ? vuelto : null,
        observaciones,
      },
      client
    );

    const paymentStatus = newBalance <= 0 ? 2 : 1;
    await repo.updateEstadoPago(paymentStatus, id_pedido, client);

    await client.query('COMMIT');

    return {
      payment,
      newBalance,
      paymentStatus: paymentStatus === 2 ? 'pagado' : 'pendiente',
      vuelto: vuelto > 0 ? vuelto : 0,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function getHistorial() {
  return repo.findHistorial();
}

module.exports = {
  getClientesPendientes,
  getPedidosCliente,
  registerPayment,
  getHistorial,
};
