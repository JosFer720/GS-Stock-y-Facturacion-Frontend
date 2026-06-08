// Servicio de Inventario: cálculo de estado según stock, transacciones de
// alta/actualización de zapatos, desactivación y armado del listado.
const pool = require('../db');
const repo = require('../repositories/inventarioRepository');

const ZAPATO_UPDATABLE_FIELDS = ['codigo', 'nombre', 'id_tipo_de_zapato', 'precio_par'];

// ─── Reglas de estado (puras) ───────────────────────────────────────────

function calcularEstadoAutomatico(stockTotal) {
  return stockTotal <= 0 ? 'Agotado' : 'Disponible';
}

// El estado manual "No Disponible" se respeta; en otro caso se calcula por stock.
function determinarEstadoFinal(estadoManual, stockTotal) {
  if (estadoManual === 'No Disponible') {
    return 'No Disponible';
  }
  return calcularEstadoAutomatico(stockTotal);
}

// ─── Lecturas / shaping ─────────────────────────────────────────────────

async function getInventario() {
  const rows = await repo.findInventarioCompleto();

  return rows.map((row) => {
    const stockTotal = parseInt(row.stock_total_tallas || 0, 10);
    const estadoManual = row.estado_inventario_manual || 'Disponible';
    const estadoFinal = determinarEstadoFinal(estadoManual, stockTotal);

    return {
      id: row.id,
      codigo: row.codigo,
      nombre: row.nombre,
      precio_par: parseFloat(row.precio_par || 0),
      tipo_zapato: { id: row.id_tipo_de_zapato, nombre: row.tipo_zapato },
      tipo_linea_producto: { id: row.id_tipo_linea_producto, nombre: row.tipo_linea_producto },
      inventario_general: {
        cantidad: row.inventario_general || 0,
        estado: estadoManual,
        estado_final: estadoFinal,
        fecha_ingreso: row.fecha_de_ingreso,
      },
      tallas_disponibles: row.tallas_disponibles || [],
      resumen_stock: {
        stock_total: stockTotal,
        tallas_con_stock: parseInt(row.tallas_con_stock || 0, 10),
        tallas_agotadas:
          (row.tallas_disponibles?.length || 0) - parseInt(row.tallas_con_stock || 0, 10),
      },
    };
  });
}

async function getTiposLineaProducto() {
  return repo.findTiposLineaActivos();
}

// ─── Alta de zapato (transacción) ───────────────────────────────────────

async function addZapato(zapatoData) {
  const { codigo, nombre, id_tipo_de_zapato, precio_par, id_tipo_linea_producto, estado, tallas } =
    zapatoData;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const newZapato = await repo.insertZapato(
      { codigo, nombre, idTipoDeZapato: id_tipo_de_zapato, precioPar: precio_par || 0.0 },
      client
    );

    const stockTotal = tallas ? tallas.reduce((sum, t) => sum + (t.stock || 0), 0) : 0;
    const estadoFinal = estado !== 'No Disponible' ? calcularEstadoAutomatico(stockTotal) : estado;
    const estadoInventarioId = await repo.findEstadoInventarioId(estadoFinal, client);

    await repo.insertInventario(
      {
        cantidad: 0,
        idZapatos: newZapato.id,
        idUsuarios: 1,
        idEstadoInventario: estadoInventarioId,
        idTipoLineaProducto: id_tipo_linea_producto,
      },
      client
    );

    if (tallas && tallas.length > 0) {
      for (const talla of tallas) {
        await repo.insertZapatoTalla(newZapato.id, talla.id_talla, talla.stock || 0, client);
      }
    }

    await client.query('COMMIT');
    return newZapato;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ─── Actualización de zapato (transacción) ──────────────────────────────

async function updateZapato(zapatoId, updateData) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Campos directos del zapato.
    const zapatoFields = {};
    for (const key of ZAPATO_UPDATABLE_FIELDS) {
      if (key in updateData) {
        zapatoFields[key] = updateData[key];
      }
    }
    await repo.updateZapatoFields(zapatoId, zapatoFields, client);

    // Tallas (actualizar o insertar).
    if (updateData.tallas && updateData.tallas.length > 0) {
      for (const talla of updateData.tallas) {
        const existe = await repo.existsZapatoTalla(zapatoId, talla.id_talla, client);
        if (existe) {
          await repo.updateZapatoTallaStock(talla.stock || 0, zapatoId, talla.id_talla, client);
        } else {
          await repo.insertZapatoTalla(zapatoId, talla.id_talla, talla.stock || 0, client);
        }
      }
    }

    // Stock total tras actualizar las tallas.
    const stockTotal = await repo.sumStockByZapato(zapatoId, client);

    // Campos de inventario.
    const inventarioFields = {};
    if (updateData.id_tipo_linea_producto) {
      inventarioFields.id_tipo_linea_producto = updateData.id_tipo_linea_producto;
    }

    // Determinar estado final.
    let estadoFinal = 'Disponible';
    if (updateData.estado !== undefined && updateData.estado !== null) {
      const estadoEnviado = String(updateData.estado).trim();
      if (estadoEnviado === 'No Disponible') {
        estadoFinal = 'No Disponible';
      } else if (estadoEnviado === 'Disponible' || estadoEnviado === 'Agotado') {
        estadoFinal = calcularEstadoAutomatico(stockTotal);
      } else {
        estadoFinal = estadoEnviado;
      }
    } else {
      estadoFinal = calcularEstadoAutomatico(stockTotal);
    }

    const estadoId = await repo.findEstadoInventarioId(estadoFinal, client);
    if (!estadoId) {
      throw new Error(`No se encontró el ID para el estado "${estadoFinal}"`);
    }
    inventarioFields.id_estado_inventario = estadoId;

    await repo.updateInventarioFields(zapatoId, inventarioFields, client);

    await client.query('COMMIT');

    return repo.findZapatoConEstado(zapatoId, client);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ─── Desactivación ──────────────────────────────────────────────────────

async function deactivateProduct(zapatoId) {
  const noDisponibleId = await repo.findEstadoInventarioId('No Disponible');
  await repo.setEstadoInventario(noDisponibleId, zapatoId);
}

module.exports = {
  getInventario,
  getTiposLineaProducto,
  addZapato,
  updateZapato,
  deactivateProduct,
};
