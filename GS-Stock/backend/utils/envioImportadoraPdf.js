// Generación del PDF de un envío importadora (A4 horizontal). Recibe los datos
// del envío y resuelve con { pdfBuffer, fileName, success }.
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

function crearPDFEnvioImportadora(datosEnvio) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margins: { top: 30, bottom: 30, left: 30, right: 30 },
      });

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => {
        resolve({
          pdfBuffer: Buffer.concat(chunks),
          fileName: `envio_importadora_${datosEnvio.numero_envio}.pdf`,
          success: true,
        });
      });
      doc.on('error', reject);

      const pageWidth = 841.89; // A4 landscape width (pt)
      const margin = 30;

      const logoX = pageWidth - 180;
      const logoY = margin;

      try {
        const logoBackendPath = path.join(__dirname, '..', 'public', 'images', 'logo-without-back-letters.png');
        const logoFrontendPath = path.join(__dirname, '..', '..', 'frontend', 'src', 'assets', 'images', 'logo-without-back-letters.png');
        let logoPath = null;
        if (fs.existsSync(logoBackendPath)) {
          logoPath = logoBackendPath;
        } else if (fs.existsSync(logoFrontendPath)) {
          logoPath = logoFrontendPath;
        }

        if (logoPath) {
          doc.image(logoPath, logoX, logoY, { width: 150, align: 'right' });
        } else {
          doc.fontSize(14).fillColor('#000000').text('GENSER', logoX + 40, logoY + 5);
          doc.fontSize(8).text('COMERCIALIZADORA E IMPORTADORA', logoX - 10, logoY + 25, { width: 170, align: 'center' });
        }
      } catch {
        doc.fontSize(14).fillColor('#000000').text('GENSER', logoX + 40, logoY + 5);
        doc.fontSize(8).text('COMERCIALIZADORA E IMPORTADORA', logoX - 10, logoY + 25, { width: 170, align: 'center' });
      }

      // Header Fields (ZAPATERIA, FECHA, ENVIO #)
      const headerY = margin;
      const headerBoxWidth = 350;
      const headerBoxHeight = 25;
      const fieldPadding = 5;

      doc.fontSize(10).text('ZAPATERIA', margin, headerY);
      doc.rect(margin, headerY + 15, headerBoxWidth, headerBoxHeight).stroke();
      doc.fontSize(10).text(datosEnvio.zapateria_nombre || '', margin + fieldPadding, headerY + 15 + fieldPadding, { width: headerBoxWidth - fieldPadding * 2, align: 'left' });

      doc.fontSize(10).text('FECHA', 400, headerY);
      doc.rect(400, headerY + 15, 120, headerBoxHeight).stroke();
      doc.fontSize(10).text(new Date().toLocaleDateString('es-ES'), 400 + fieldPadding, headerY + 15 + fieldPadding, { width: 110, align: 'center' });

      doc.fontSize(10).text('ENVIO #', 530, headerY);
      doc.rect(530, headerY + 15, 120, headerBoxHeight).stroke();
      doc.fontSize(10).text(datosEnvio.numero_envio || '', 530 + fieldPadding, headerY + 15 + fieldPadding, { width: 110, align: 'center' });

      // CLIENTE y VENDEDOR
      const clientY = headerY + 65;
      doc.fontSize(10).text('CLIENTE', margin, clientY);
      doc.rect(margin, clientY + 15, headerBoxWidth, headerBoxHeight).stroke();
      doc.fontSize(10).text(datosEnvio.cliente_nombre || '', margin + fieldPadding, clientY + 15 + fieldPadding, { width: headerBoxWidth - fieldPadding * 2, align: 'left' });

      doc.fontSize(10).text('VENDEDOR', 400, clientY);
      doc.rect(400, clientY + 15, 300, headerBoxHeight).stroke();
      doc.fontSize(10).text(datosEnvio.vendedor_nombre || '', 400 + fieldPadding, clientY + 15 + fieldPadding, { width: 250, align: 'left' });

      // TRANSPORTE y DIRECCION
      const transportY = clientY + 65;
      doc.fontSize(10).text('TRANSPORTE', margin, transportY);
      doc.rect(margin, transportY + 15, headerBoxWidth, headerBoxHeight).stroke();
      doc.fontSize(10).text(datosEnvio.transporte || 'Por definir', margin + fieldPadding, transportY + 15 + fieldPadding, { width: headerBoxWidth - fieldPadding * 2, align: 'left' });

      doc.fontSize(10).text('DIRECCION:', 400, transportY);
      doc.rect(400, transportY + 15, 300, headerBoxHeight).stroke();
      doc.fontSize(10).text(datosEnvio.cliente_direccion || '', 400 + fieldPadding, transportY + 15 + fieldPadding, { width: 250, align: 'left' });

      // Tabla de productos
      const tableTop = transportY + 65;
      const col1W = 60;
      const col2W = 60;
      const col3W = 80;
      const col4W = 350;
      const col5W = 85;
      const col6W = 85;

      const col1X = margin;
      const col2X = col1X + col1W;
      const col3X = col2X + col2W;
      const col4X = col3X + col3W;
      const col5X = col4X + col4W;
      const col6X = col5X + col5W;

      doc.rect(col1X, tableTop, col1W, 20).stroke();
      doc.rect(col2X, tableTop, col2W, 20).stroke();
      doc.rect(col3X, tableTop, col3W, 20).stroke();
      doc.rect(col4X, tableTop, col4W, 20).stroke();
      doc.rect(col5X, tableTop, col5W, 20).stroke();
      doc.rect(col6X, tableTop, col6W, 20).stroke();

      doc.fontSize(9).fillColor('#000000')
        .text('CANTIDAD', col1X, tableTop + 6, { width: col1W, align: 'center' })
        .text('COLOR', col2X, tableTop + 6, { width: col2W, align: 'center' })
        .text('ESTILO', col3X, tableTop + 6, { width: col3W, align: 'center' })
        .text('DESCRIPCION', col4X, tableTop + 6, { width: col4W, align: 'center' })
        .text('PRECIO/U', col5X, tableTop + 6, { width: col5W, align: 'center' })
        .text('TOTAL', col6X, tableTop + 6, { width: col6W, align: 'center' });

      let currentY = tableTop + 20;
      const pageBottom = doc.page.height - doc.page.margins.bottom;

      if (datosEnvio.productos && datosEnvio.productos.length > 0) {
        datosEnvio.productos.forEach((p) => {
          const desc = String(p.nombre || '');
          const descHeight = doc.heightOfString(desc, { width: col4W - 10 });
          const rowH = Math.max(25, Math.ceil(descHeight + 10));

          if (currentY + rowH + 60 > pageBottom) {
            doc.addPage();
            currentY = doc.page.margins.top;
          }

          doc.rect(col1X, currentY, col1W, rowH).stroke();
          doc.rect(col2X, currentY, col2W, rowH).stroke();
          doc.rect(col3X, currentY, col3W, rowH).stroke();
          doc.rect(col4X, currentY, col4W, rowH).stroke();
          doc.rect(col5X, currentY, col5W, rowH).stroke();
          doc.rect(col6X, currentY, col6W, rowH).stroke();

          doc.fontSize(10)
            .text(String(p.cantidad || ''), col1X + 5, currentY + 5, { width: col1W - 10, align: 'center' })
            .text('', col2X + 5, currentY + 5, { width: col2W - 10 })
            .text(p.codigo || '', col3X + 5, currentY + 5, { width: col3W - 10 })
            .text(desc, col4X + 5, currentY + 5, { width: col4W - 10 })
            .text(`Q${(p.precio_unitario || 0).toFixed(2)}`, col5X + 5, currentY + 5, { width: col5W - 10, align: 'right' })
            .text(`Q${((p.cantidad || 0) * (p.precio_unitario || 0)).toFixed(2)}`, col6X + 5, currentY + 5, { width: col6W - 10, align: 'right' });

          currentY += rowH;
        });
      } else {
        for (let i = 0; i < 4; i++) {
          const ph = 25;
          doc.rect(col1X, currentY, col1W, ph).stroke();
          doc.rect(col2X, currentY, col2W, ph).stroke();
          doc.rect(col3X, currentY, col3W, ph).stroke();
          doc.rect(col4X, currentY, col4W, ph).stroke();
          doc.rect(col5X, currentY, col5W, ph).stroke();
          doc.rect(col6X, currentY, col6W, ph).stroke();
          currentY += ph;
        }
      }

      // Cuadro de información dentro de la columna de DESCRIPCION
      const infoBoxX = col4X + 20;
      const infoBoxY = currentY + 20;
      const infoBoxWidth = col4W - 40;
      const infoLines = [
        'NOMBRE ___________________________________',
        'FIRMA _____________________________________',
        'REVISADO:_________________________________',
        'FECHA RECIBIDO: __________________________',
        'CARGO POR ENVÍO Q.________________________',
        'GUÍA No.__________________________________',
      ];
      const infoTextHeight = infoLines.reduce(
        (acc, line) => acc + doc.heightOfString(line, { width: infoBoxWidth - 20 }),
        0
      );
      const infoBoxHeight = Math.max(80, Math.ceil(infoTextHeight + 20));
      if (infoBoxY + infoBoxHeight + 120 > pageBottom) {
        doc.addPage();
      }
      doc.rect(infoBoxX, infoBoxY, infoBoxWidth, infoBoxHeight).stroke();

      let infoY = infoBoxY + 8;
      doc.fontSize(8).fillColor('#000000');
      infoLines.forEach((line) => {
        doc.text(line, infoBoxX + 10, infoY, { width: infoBoxWidth - 20 });
        infoY += doc.heightOfString(line, { width: infoBoxWidth - 20 }) + 6;
      });

      doc.fontSize(7).text('DESCUENTO 0 A 30 DÍAS -15%', infoBoxX + 15, infoY, { width: infoBoxWidth - 30 });
      infoY += doc.heightOfString('DESCUENTO 0 A 30 DÍAS -15%', { width: infoBoxWidth - 30 }) + 4;
      doc.text('DESCUENTO 31 A 60 DÍAS -10%', infoBoxX + 15, infoY, { width: infoBoxWidth - 30 });

      // Caja TOTAL
      const totalBoxWidth = col6W;
      const totalBoxHeight = 25;
      const totalBoxX = col6X;
      const totalBoxY = infoBoxY + infoBoxHeight + 10;

      doc.fontSize(10).fillColor('#000000').text('TOTAL', totalBoxX, totalBoxY - 15, { width: totalBoxWidth, align: 'center' });
      doc.rect(totalBoxX, totalBoxY, totalBoxWidth, totalBoxHeight).stroke();
      doc.fillColor('#000000').fontSize(12).text(`Q${datosEnvio.total.toFixed(2)}`, totalBoxX, totalBoxY + 8, { width: totalBoxWidth, align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = { crearPDFEnvioImportadora };
