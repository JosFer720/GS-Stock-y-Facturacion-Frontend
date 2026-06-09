// Servicio de Productos: validaciones y transacciones de alta/modificación/
// borrado de zapatos (con sus tallas e inventario). Lanza ServiceError (400/404).
const pool = require('../db');
const repo = require('../repositories/productosRepository');
const ServiceError = require('../utils/ServiceError');

const ID_USUARIO_FALLBACK = 1;

function tallasValidas(tallas) {
  return tallas.every(
    (item) => item.id_talla && typeof item.stock === 'number' && item.stock >= 0
  );
}

function sumTallas(tallas) {
  return tallas.reduce((total, item) => total + item.stock, 0);
}

function mapTallas(tallas) {
  return tallas.map((t) => ({ id_talla: t.id_talla, stock: t.stock }));
}

async function addProducto(body, userId) {
  const { codigo, nombre, id_tipo_de_zapato, precio_par, tallas, estado } = body;

  if (!codigo || !nombre || !id_tipo_de_zapato || precio_par === undefined || !tallas || !estado) {
    throw new ServiceError(400, {
      error: 'Se requieren los campos: codigo, nombre, id_tipo_de_zapato, precio_par, tallas y estado',
    });
  }
  if (!/^[A-Za-z0-9]+$/.test(codigo)) {
    throw new ServiceError(400, {
      error: 'El código debe ser alfanumérico (solo letras y números, sin espacios ni símbolos)',
    });
  }
  if (typeof precio_par !== 'number' || precio_par < 0) {
    throw new ServiceError(400, { error: 'El precio por par debe ser un número mayor o igual a 0' });
  }
  if (!Array.isArray(tallas) || tallas.length === 0) {
    throw new ServiceError(400, { error: 'Se requiere un array de tallas con su stock correspondiente' });
  }
  if (!tallasValidas(tallas)) {
    throw new ServiceError(400, { error: 'Cada talla debe incluir id_talla y stock (número no negativo)' });
  }

  if (await repo.findIdByCodigo(codigo)) {
    throw new ServiceError(400, { error: 'El código de producto ya existe' });
  }

  const idUsuario = userId || ID_USUARIO_FALLBACK;
  const cantidadTotal = sumTallas(tallas);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const zapatoId = await repo.insertZapato(
      { codigo, nombre, idTipoDeZapato: id_tipo_de_zapato, precioPar: precio_par },
      client
    );

    for (const t of tallas) {
      await repo.insertZapatoTalla(zapatoId, t.id_talla, t.stock, client);
    }

    await repo.insertInventario(
      { cantidad: cantidadTotal, idZapatos: zapatoId, idUsuarios: idUsuario, estado },
      client
    );

    await client.query('COMMIT');

    return {
      id: zapatoId,
      codigo,
      nombre,
      id_tipo_de_zapato,
      precio_par: parseFloat(precio_par),
      cantidad_total: cantidadTotal,
      tallas_agregadas: tallas.length,
      tallas: mapTallas(tallas),
      estado,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function updateProducto(id, body, userId) {
  const { codigo, nombre, id_tipo_de_zapato, precio_par, tallas, estado } = body;

  if (!codigo || !nombre || !id_tipo_de_zapato || precio_par === undefined || !tallas || !estado) {
    throw new ServiceError(400, {
      error: 'Se requieren los campos: codigo, nombre, id_tipo_de_zapato, precio_par, tallas y estado',
    });
  }
  if (typeof precio_par !== 'number' || precio_par < 0) {
    throw new ServiceError(400, { error: 'El precio por par debe ser un número mayor o igual a 0' });
  }
  if (!Array.isArray(tallas) || tallas.length === 0) {
    throw new ServiceError(400, { error: 'Se requiere un array de tallas con su stock correspondiente' });
  }
  if (!tallasValidas(tallas)) {
    throw new ServiceError(400, { error: 'Cada talla debe incluir id_talla y stock (número no negativo)' });
  }

  const producto = await repo.findIdCodigoById(id);
  if (!producto) {
    throw new ServiceError(404, { error: 'Producto no encontrado' });
  }
  if (codigo !== producto.codigo && (await repo.findIdByCodigoExcluding(codigo, id))) {
    throw new ServiceError(400, { error: 'El nuevo código ya está en uso por otro producto' });
  }

  const idUsuario = userId || ID_USUARIO_FALLBACK;
  const cantidadTotal = sumTallas(tallas);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await repo.updateZapato(
      id,
      { codigo, nombre, idTipoDeZapato: id_tipo_de_zapato, precioPar: precio_par },
      client
    );
    await repo.deleteZapatoTallas(id, client);
    for (const t of tallas) {
      await repo.insertZapatoTalla(id, t.id_talla, t.stock, client);
    }

    const inventario = await repo.findLatestInventario(id, client);
    if (inventario) {
      await repo.updateInventarioCantidadEstado(inventario.id, cantidadTotal, estado, idUsuario, client);
    } else {
      await repo.insertInventario(
        { cantidad: cantidadTotal, idZapatos: id, idUsuarios: idUsuario, estado },
        client
      );
    }

    await client.query('COMMIT');

    return {
      id: parseInt(id, 10),
      codigo,
      nombre,
      id_tipo_de_zapato,
      precio_par: parseFloat(precio_par),
      cantidad_total: cantidadTotal,
      tallas_actualizadas: tallas.length,
      tallas: mapTallas(tallas),
      estado,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function updatePrecio(id, body) {
  const { precio_par } = body;

  if (precio_par === undefined) {
    throw new ServiceError(400, { error: 'Se requiere el campo precio_par' });
  }
  if (typeof precio_par !== 'number' || precio_par < 0) {
    throw new ServiceError(400, { error: 'El precio por par debe ser un número mayor o igual a 0' });
  }

  const producto = await repo.findIdPrecioById(id);
  if (!producto) {
    throw new ServiceError(404, { error: 'Producto no encontrado' });
  }
  const precioAnterior = producto.precio_par;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await repo.updateZapatoPrecio(id, precio_par, client);
    await client.query('COMMIT');

    return {
      id: parseInt(id, 10),
      precio_anterior: parseFloat(precioAnterior || 0),
      precio_nuevo: parseFloat(precio_par),
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function updateEstado(id, body, userId) {
  const { estado } = body;

  if (!estado) {
    throw new ServiceError(400, { error: 'Se requiere el campo estado' });
  }
  if (!(await repo.existsById(id))) {
    throw new ServiceError(404, { error: 'Producto no encontrado' });
  }

  const idUsuario = userId || ID_USUARIO_FALLBACK;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const inventario = await repo.findLatestInventario(id, client);
    if (inventario) {
      await repo.updateInventarioEstado(inventario.id, estado, idUsuario, client);
    } else {
      await repo.insertInventario(
        { cantidad: 0, idZapatos: id, idUsuarios: idUsuario, estado },
        client
      );
    }

    await client.query('COMMIT');
    return { id: parseInt(id, 10), estado };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function updateStock(id, body, userId) {
  const { id_talla, stock } = body;

  if (!id_talla || stock === undefined) {
    throw new ServiceError(400, { error: 'Se requieren los campos id_talla y stock' });
  }
  if (stock < 0) {
    throw new ServiceError(400, { error: 'El stock no puede ser negativo' });
  }
  if (!(await repo.existsById(id))) {
    throw new ServiceError(404, { error: 'Producto no encontrado' });
  }

  const idUsuario = userId || ID_USUARIO_FALLBACK;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const tallaExistente = await repo.findZapatoTalla(id, id_talla, client);
    let stockAnterior = 0;
    if (tallaExistente) {
      stockAnterior = tallaExistente.stock;
      await repo.updateZapatoTallaStock(stock, id, id_talla, client);
    } else {
      await repo.insertZapatoTalla(id, id_talla, stock, client);
    }

    const totalStock = await repo.sumStock(id, client);

    const inventario = await repo.findLatestInventario(id, client);
    if (inventario) {
      await repo.updateInventarioCantidad(inventario.id, totalStock, idUsuario, client);
    } else {
      await repo.insertInventario(
        { cantidad: totalStock, idZapatos: id, idUsuarios: idUsuario, estado: 'Disponible' },
        client
      );
    }

    await client.query('COMMIT');

    return {
      id: parseInt(id, 10),
      id_talla,
      stock_anterior: stockAnterior,
      stock_nuevo: stock,
      stock_total: totalStock,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function deleteProducto(id) {
  if (!(await repo.existsById(id))) {
    throw new ServiceError(404, { error: 'Producto no encontrado' });
  }
  if (await repo.existsInPedidos(id)) {
    throw new ServiceError(400, {
      error: 'No se puede eliminar el producto porque está asociado a pedidos',
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await repo.deleteZapatoTallas(id, client);
    await repo.deleteInventarios(id, client);
    await repo.deleteZapato(id, client);
    await client.query('COMMIT');

    return { id: parseInt(id, 10) };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  addProducto,
  updateProducto,
  updatePrecio,
  updateEstado,
  updateStock,
  deleteProducto,
};
