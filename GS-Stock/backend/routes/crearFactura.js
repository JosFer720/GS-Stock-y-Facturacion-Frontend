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
  const { 
    id_cliente, 
    id_metodo_pago, 
    nit, 
    items, 
    subtotal, 
    total,
    id_usuario 
  } = req.body;

  // Validación básica
  if (!id_cliente || !id_metodo_pago || !items || !subtotal || !total || !id_usuario) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  try {
    await pool.query('BEGIN');

    // 1. Crear pedido
    const pedidoQuery = `
      INSERT INTO pedidos (
        id_cliente, 
        id_estado_pedido, 
        id_vendedor, 
        id_metodo_de_pago, 
        fecha, 
        subtotal, 
        total
      )
      VALUES ($1, 1, $2, $3, NOW(), $4, $5)
      RETURNING id;
    `;
    const pedidoResult = await pool.query(pedidoQuery, [
      id_cliente,
      id_usuario, // id_vendedor = usuario autenticado
      id_metodo_pago,
      subtotal,
      total
    ]);
    const id_pedido = pedidoResult.rows[0].id;

    // 2. Agregar items al pedido
    for (const item of items) {
      await pool.query(`
        INSERT INTO detalle_pedidos (cantidad, id_zapato, id_pedido)
        VALUES ($1, $2, $3);
      `, [item.cantidad, item.id_zapato, id_pedido]);

      // Actualizar inventario
      await pool.query(`
        UPDATE zapatos_tallas
        SET stock = stock - $1
        WHERE id_zapato = $2;
      `, [item.cantidad, item.id_zapato]);
    }

    // 3. Crear factura
    const impuestos = total - subtotal;
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

    // 4. Generar PDF
    const pdfBuffer = await generarPDF(factura, items, nit);
    
    await pool.query('COMMIT');

    // Enviar respuesta con PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=factura_${factura.id}.pdf`);
    res.send(pdfBuffer);

  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error al crear factura:', error);
    res.status(500).json({ error: 'Error al crear la factura' });
  }
});

// Función para generar PDF
async function generarPDF(factura, items, nit) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const buffers = [];
    
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    
    // Encabezado
    doc.fontSize(20).text('FACTURA', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Número: FAC-${factura.id}`);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`);
    doc.text(`NIT: ${nit || 'CF'}`);
    doc.moveDown();
    
    // Detalle de productos
    doc.fontSize(14).text('Detalle de Productos:');
    items.forEach(item => {
      doc.text(`${item.nombre} - ${item.cantidad} x $${item.precio_unitario} = $${item.total}`);
    });
    doc.moveDown();
    
    // Totales
    doc.fontSize(14).text(`Subtotal: $${factura.subtotal}`);
    doc.text(`Impuestos: $${factura.impuestos}`);
    doc.text(`Total: $${factura.total}`, { underline: true });
    
    doc.end();
  });
}

module.exports = router;