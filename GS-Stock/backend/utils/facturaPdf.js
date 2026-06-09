// Generación del PDF de una factura. Función pura: recibe los datos y devuelve
// un Buffer con el PDF; no toca la base de datos ni Express.
const PDFDocument = require('pdfkit');

/**
 * @param {object} factura       Factura (id, fecha_emision, subtotal, impuestos, total).
 * @param {Array}  items         Items con { codigo, nombre, cantidad, precio_unitario }.
 * @param {object} clienteData   { nombre, empresa, nit, direccion, telefono }.
 * @returns {Promise<Buffer>}
 */
function generarFacturaPDF(factura, items, clienteData) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const buffers = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    try {
      // Encabezado — información de la empresa.
      doc.fontSize(18).font('Helvetica-Bold').text('IMPORTADORA GENSER S.A.', { align: 'center' });
      doc.fontSize(10).font('Helvetica').text('Guatemala, Guatemala', { align: 'center' });
      doc.text('Gracias por tu confianza', { align: 'center' });
      doc.moveDown(2);

      // Información de la factura.
      const fecha = new Date(factura.fecha_emision).toLocaleDateString('es-ES');
      doc.fontSize(12).font('Helvetica-Bold').text(`FACTURA N°: FAC-${factura.id}`, { align: 'right' });
      doc.fontSize(10).font('Helvetica').text(`Fecha: ${fecha}`, { align: 'right' });
      doc.moveDown(2);

      // Datos del cliente.
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

      // Tabla de productos.
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

      // Precio promedio como respaldo cuando un item no trae precio.
      const subtotalNum = parseFloat(factura.subtotal);
      const totalCantidad = items.reduce((sum, item) => sum + item.cantidad, 0);
      const precioPromedio = totalCantidad > 0 ? subtotalNum / totalCantidad : 0;

      items.forEach((item) => {
        let precio = item.precio_unitario || 0;
        if (precio === 0 && subtotalNum > 0) {
          precio = precioPromedio;
        }
        const totalItem = item.cantidad * precio;

        const descText = `${item.codigo || 'COD'} - ${item.nombre || 'Producto'}`;
        const descWidth = 240;
        const descHeight = doc.heightOfString(descText, { width: descWidth });
        const rowHeight = Math.max(20, Math.ceil(descHeight) + 6);

        // Salto de página reservando espacio para el pie.
        if (yPos + rowHeight > doc.page.height - 150) {
          doc.addPage();
          yPos = doc.page.margins.top || 50;
          drawTableHeader(yPos);
          yPos += 25;
        }

        doc.text(item.cantidad.toString(), 50, yPos, { width: 40, align: 'center' });
        doc.text(descText, colDescX, yPos, { width: descWidth });
        doc.text(`Q${precio.toFixed(2)}`, colPriceX, yPos, { width: 80, align: 'right' });
        doc.text(`Q${totalItem.toFixed(2)}`, colTotalX, yPos, { width: 80, align: 'right' });

        yPos += rowHeight;
      });

      // Totales.
      yPos += 10;
      doc.moveTo(350, yPos).lineTo(520, yPos).stroke();
      yPos += 15;

      const subtotalValue = parseFloat(factura.subtotal) || 0;
      const impuestosValue = parseFloat(factura.impuestos) || 0;
      const totalValue = parseFloat(factura.total) || 0;

      doc.text(`Subtotal: Q${subtotalValue.toFixed(2)}`, 350, yPos);
      yPos += 15;
      doc.text(`Impuestos: Q${impuestosValue.toFixed(2)}`, 350, yPos);
      yPos += 15;
      doc.font('Helvetica-Bold').text(`TOTAL: Q${totalValue.toFixed(2)}`, 350, yPos);

      // Pie de página.
      const pageBottom = doc.page.height - 100;
      doc.moveTo(50, pageBottom).lineTo(520, pageBottom).stroke();
      doc.fontSize(8).font('Helvetica').text('Gracias por su compra', { align: 'center' }, pageBottom + 20);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = { generarFacturaPDF };
