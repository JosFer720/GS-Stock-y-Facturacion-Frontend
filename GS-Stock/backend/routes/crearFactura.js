const express = require('express');
const router = express.Router();
const { Pool } = require('pg'); 
const auth = require('../middleware/auth');
const PDFDocument = require('pdfkit');

const pool = new Pool({
  user: process.env.DB_USER || 'admin',
  host: process.env.DB_HOST || 'postgres',
  database: process.env.DB_NAME || 'mydb',
  password: process.env.DB_PASSWORD || 'secret',
  port: process.env.DB_PORT || 5432,
});

// Crear nueva factura y generar PDF
router.post('/crear-factura', auth, async (req, res) => {
// Reemplaza la validación básica actual con esta versión mejorada
const { 
  id_cliente, 
  id_metodo_pago, 
  nit, 
  items, 
  subtotal, 
  direccion_facturacion,
  telefono_cliente,
  total,
  id_usuario 
} = req.body;

// Validación básica mejorada
console.log('Datos recibidos:', {
  id_cliente,
  id_metodo_pago,
  nit,
  items,
  subtotal,
  direccion_facturacion,
  telefono_cliente,
  total,
  id_usuario
});

if (!id_cliente || !id_metodo_pago || !items || !Array.isArray(items) || items.length === 0) {
  console.error('Error de validación: campos obligatorios faltantes');
  return res.status(400).json({ 
    success: false,
    error: 'Faltan campos obligatorios o items inválidos',
    received: {
      id_cliente: !!id_cliente,
      id_metodo_pago: !!id_metodo_pago,
      items: items ? items.length : 0
    }
  });
}

if (!subtotal || !total || !id_usuario) {
  console.error('Error de validación: montos o usuario faltantes');
  return res.status(400).json({ 
    success: false,
    error: 'Faltan montos o usuario',
    received: {
      subtotal: !!subtotal,
      total: !!total,
      id_usuario: !!id_usuario
    }
  });
}

// Validar que cada item tenga los campos necesarios
for (let i = 0; i < items.length; i++) {
  const item = items[i];
  if (!item.id_zapato || !item.cantidad) {
    console.error(`Error en item ${i}:`, item);
    return res.status(400).json({
      success: false,
      error: `Item ${i + 1} incompleto: falta id_zapato o cantidad`,
      item_error: item
    });
  }
  
  // Convertir a números si vienen como strings
  items[i].id_zapato = parseInt(item.id_zapato);
  items[i].cantidad = parseInt(item.cantidad);
  
  if (isNaN(items[i].id_zapato) || isNaN(items[i].cantidad)) {
    return res.status(400).json({
      success: false,
      error: `Item ${i + 1} tiene valores no numéricos`,
      item_error: item
    });
  }
}

  try {
    await pool.query('BEGIN');

    // 1. Obtener datos del cliente
    const clienteQuery = `
      SELECT nombre, apellido, empresa
      FROM clientes 
      WHERE id = $1
    `;
    const clienteResult = await pool.query(clienteQuery, [id_cliente]);
    
    if (clienteResult.rows.length === 0) {
      throw new Error('Cliente no encontrado');
    }
    
    const cliente = clienteResult.rows[0];



    // 3. Crear pedido
    const pedidoQuery = `
      INSERT INTO pedidos (
        id_cliente, 
        id_estado_pedido, 
        id_vendedor, 
        id_metodo_de_pago, 
        fecha, 
        subtotal, 
        total,
        id_pedido_estado_pago
      )
      VALUES ($1, 1, $2, $3, NOW(), $4, $5, 1)
      RETURNING id;
    `;
    const pedidoResult = await pool.query(pedidoQuery, [
      id_cliente,
      id_usuario,
      id_metodo_pago,
      subtotal,
      total
    ]);
    const id_pedido = pedidoResult.rows[0].id;

    // 4. Agregar items al pedido y actualizar inventario
    for (const item of items) {
      // Insertar detalle del pedido
      await pool.query(`
        INSERT INTO detalle_pedidos (cantidad, id_zapato, id_pedido)
        VALUES ($1, $2, $3);
      `, [item.cantidad, item.id_zapato, id_pedido]);

      // Actualizar inventario
      const updateResult = await pool.query(`
        UPDATE zapatos_tallas
        SET stock = stock - $1
        WHERE id_zapato = $2
        RETURNING stock;
      `, [item.cantidad, item.id_zapato]);

      if (updateResult.rows.length === 0) {
        throw new Error(`No se pudo actualizar el inventario para el producto ${item.id_zapato}`);
      }
    }

    // 5. Crear factura
    const impuestos = parseFloat(total) - parseFloat(subtotal);
    const facturaQuery = `
      INSERT INTO facturas (
        id_pedido, 
        fecha_emision, 
        subtotal, 
        impuestos, 
        total, 
        estado
      )
      VALUES ($1, NOW(), $2, $3, $4, 'Emitida')
      RETURNING *;
    `;
    const facturaResult = await pool.query(facturaQuery, [
      id_pedido,
      subtotal,
      impuestos,
      total
    ]);
    const factura = facturaResult.rows[0];

    // 6. Obtener detalles de productos para el PDF
    const itemsConDetalles = [];
    for (const item of items) {
      console.log(`Buscando producto con ID: ${item.id_zapato}`);
      
      const productoQuery = `
        SELECT z.nombre, z.codigo, z.precio_venta
        FROM zapatos z
        WHERE z.id = $1
      `;
      
      try {
        const productoResult = await pool.query(productoQuery, [item.id_zapato]);
        
        if (productoResult.rows.length === 0) {
          console.error(`Producto con ID ${item.id_zapato} no encontrado`);
          // En lugar de fallar, usar valores por defecto
          itemsConDetalles.push({
            ...item,
            nombre: `Producto ID: ${item.id_zapato}`,
            codigo: `COD-${item.id_zapato}`,
            precio_unitario: 0 // Será calculado desde subtotal/total
          });
        } else {
          const producto = productoResult.rows[0];
          console.log(`Producto encontrado:`, producto);
          
          itemsConDetalles.push({
            ...item,
            nombre: producto.nombre || `Producto ${item.id_zapato}`,
            codigo: producto.codigo || `COD-${item.id_zapato}`,
            precio_unitario: producto.precio_venta || 0
          });
        }
      } catch (queryError) {
        console.error(`Error en consulta de producto ${item.id_zapato}:`, queryError);
        // Usar valores por defecto en caso de error
        itemsConDetalles.push({
          ...item,
          nombre: `Producto ID: ${item.id_zapato}`,
          codigo: `COD-${item.id_zapato}`,
          precio_unitario: 0
        });
      }
    }

    console.log('Items con detalles preparados:', itemsConDetalles);

    // 7. Generar PDF usando los items con detalles
    const pdfBuffer = await generarPDF(
      factura, 
      itemsConDetalles,  // Usar los items con detalles
      {
        nombre: `${cliente.nombre} ${cliente.apellido}`,
        empresa: cliente.empresa || '',
        nit: nit || 'CF',
        direccion: direccion_facturacion || 'Sin dirección',
        telefono: telefono_cliente || 'Sin teléfono'
      }
    );

    await pool.query('COMMIT');

    // Enviar respuesta con PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=factura_${factura.id}.pdf`);
    res.send(pdfBuffer);

  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error al crear factura:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error al crear la factura',
      details: error.message 
    });
  }
});

// Función mejorada para generar PDF
// Reemplaza la función generarPDF completa con esta versión:
async function generarPDF(factura, items, clienteData) {
  return new Promise((resolve, reject) => {
    console.log('Iniciando generación de PDF con:', {
      factura: factura.id,
      items: items.length,
      cliente: clienteData.nombre
    });
    
    const doc = new PDFDocument({ margin: 50 });
    const buffers = [];
    
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(buffers);
      console.log('PDF generado, tamaño:', pdfBuffer.length);
      resolve(pdfBuffer);
    });
    doc.on('error', (error) => {
      console.error('Error generando PDF:', error);
      reject(error);
    });
    
    try {
      // Encabezado - Información de la empresa
      doc.fontSize(18).font('Helvetica-Bold').text('IMPORTADORA GENSER S.A.', { align: 'center' });
      doc.fontSize(10).font('Helvetica').text('Guatemala, Guatemala', { align: 'center' });
      doc.text('Gracias por tu confianza', { align: 'center' });
      doc.moveDown(2);
      
      // Información de la factura
      const fecha = new Date(factura.fecha_emision).toLocaleDateString('es-ES');
      doc.fontSize(12).font('Helvetica-Bold').text(`FACTURA N°: FAC-${factura.id}`, { align: 'right' });
      doc.fontSize(10).font('Helvetica').text(`Fecha: ${fecha}`, { align: 'right' });
      doc.moveDown(2);
      
      // Datos del cliente
      doc.fontSize(12).font('Helvetica-Bold').text('FACTURAR A:');
      doc.fontSize(10).font('Helvetica');
      doc.text(`Cliente: ${clienteData.nombre}`);
      if (clienteData.empresa) {
        doc.text(`Empresa: ${clienteData.empresa}`);
      }
      doc.text(`NIT: ${clienteData.nit}`);
      doc.text(`Dirección: ${clienteData.direccion}`);
      doc.text(`Teléfono: ${clienteData.telefono}`);
      doc.moveDown(2);
      
      // Tabla de productos
      const tableTop = doc.y;
      const tableLeft = 50;
      const colDescX = 100;
      const colPriceX = 350;
      const colTotalX = 450;

      const drawTableHeader = (y) => {
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Cant.', tableLeft, y);
        doc.text('Descripción', colDescX, y);
        doc.text('Precio Unit.', colPriceX, y);
        doc.text('Total', colTotalX, y);
        doc.moveTo(tableLeft, y + 15).lineTo(520, y + 15).stroke();
      };

      drawTableHeader(tableTop);

      let yPos = tableTop + 25;
      doc.font('Helvetica');
      
      // Calcular precio unitario basado en subtotal si no hay precios
      const subtotalNum = parseFloat(factura.subtotal);
      const totalCantidad = items.reduce((sum, item) => sum + item.cantidad, 0);
      const precioPromedio = totalCantidad > 0 ? subtotalNum / totalCantidad : 0;
      
      // Items de productos
      items.forEach((item, index) => {
        let precio = item.precio_unitario || 0;
        if (precio === 0 && subtotalNum > 0) {
          precio = precioPromedio;
        }
        const total_item = item.cantidad * precio;

        const descText = `${item.codigo || 'COD'} - ${item.nombre || 'Producto'}`;
        const descWidth = 240; // same width used previously
        const descHeight = doc.heightOfString(descText, { width: descWidth });
        const rowHeight = Math.max(20, Math.ceil(descHeight) + 6);

        // Verificar si necesitamos una nueva página (reserve space for footer)
        if (yPos + rowHeight > doc.page.height - 150) {
          doc.addPage();
          yPos = doc.page.margins.top || 50;
          drawTableHeader(yPos);
          yPos += 25;
        }

        console.log(`Item ${index + 1}:`, {
          cantidad: item.cantidad,
          nombre: item.nombre,
          precio,
          total: total_item,
          rowHeight
        });

        doc.text(item.cantidad.toString(), 50, yPos, { width: 40, align: 'center' });
        doc.text(descText, colDescX, yPos, { width: descWidth });
        doc.text(`Q${precio.toFixed(2)}`, colPriceX, yPos, { width: 80, align: 'right' });
        doc.text(`Q${total_item.toFixed(2)}`, colTotalX, yPos, { width: 80, align: 'right' });

        yPos += rowHeight;
      });
      
      // Línea separadora antes de totales
      yPos += 10;
      doc.moveTo(350, yPos).lineTo(520, yPos).stroke();
      yPos += 15;
      
      // Totales
      const subtotalValue = parseFloat(factura.subtotal) || 0;
      const impuestosValue = parseFloat(factura.impuestos) || 0;
      const totalValue = parseFloat(factura.total) || 0;
      
      doc.text(`Subtotal: Q${subtotalValue.toFixed(2)}`, 350, yPos);
      yPos += 15;
      doc.text(`Impuestos: Q${impuestosValue.toFixed(2)}`, 350, yPos);
      yPos += 15;
      doc.font('Helvetica-Bold').text(`TOTAL: Q${totalValue.toFixed(2)}`, 350, yPos);
      
      // Pie de página
      const pageBottom = doc.page.height - 100;
      doc.moveTo(50, pageBottom).lineTo(520, pageBottom).stroke();
      doc.fontSize(8).font('Helvetica').text('Gracias por su compra', { align: 'center' }, pageBottom + 20);
      
      console.log('Finalizando documento PDF...');
      doc.end();
    } catch (error) {
      console.error('Error en generación PDF:', error);
      reject(error);
    }
  });
}

module.exports = router;