// Generación del PDF de un envío nacional (A4 horizontal). Recibe los datos del
// envío y resuelve con { pdfBuffer, fileName, success }.
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

function crearPDFEnvioNacional(datosEnvio) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
      });

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => {
        resolve({
          pdfBuffer: Buffer.concat(chunks),
          fileName: `envio_nacional_${datosEnvio.numero_envio}.pdf`,
          success: true,
        });
      });
      doc.on('error', reject);

      const primaryColor = '#2c3e50';
      const secondaryColor = '#3498db';

      // Encabezado
      doc.fontSize(20).fillColor(primaryColor).text('ZAPATERIA', 50, 50, { width: 200 });
      doc.fontSize(14).fillColor(secondaryColor).text('LÍNEA NACIONAL', 50, 75);

      // Logo GENSER (esquina superior derecha).
      const pageWidth = doc.page.width;
      const margin = doc.page.margins.top || 50;
      const logoX = pageWidth - doc.page.margins.right - 160;
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
          doc.image(logoPath, logoX, logoY, { width: 140, align: 'right' });
        } else {
          doc.fontSize(14).fillColor('#000000').text('GENSER', logoX + 20, logoY + 5);
          doc.fontSize(8).text('DISTRIBUIDORES AUTORIZADOS', logoX - 10, logoY + 25, { width: 170, align: 'center' });
        }
      } catch {
        doc.fontSize(14).fillColor('#000000').text('GENSER', logoX + 20, logoY + 5);
        doc.fontSize(8).text('DISTRIBUIDORES AUTORIZADOS', logoX - 10, logoY + 25, { width: 170, align: 'center' });
      }

      // Fecha y número
      doc.fontSize(12).fillColor('#000')
        .text('FECHA', 400, 50)
        .rect(450, 47, 100, 20).stroke()
        .text(new Date().toLocaleDateString('es-ES'), 455, 52);

      doc.text('ENVIO #', 400, 80)
        .rect(450, 77, 100, 20).stroke()
        .text(datosEnvio.numero_envio || '', 455, 82);

      // Marca
      doc.fontSize(16).fillColor(primaryColor).text('GENSER', 480, 120)
        .fontSize(8).text('DISTRIBUIDORES AUTORIZADOS', 465, 140);

      // Cliente / Vendedor / Transporte / Dirección
      doc.fontSize(12).fillColor('#000');
      const fieldX = 50;
      let fieldY = 110;
      const fieldLabelOffset = 0;
      const fieldPadding = 5;

      const drawLabeledBox = (label, text, boxWidth) => {
        doc.fontSize(12).fillColor('#000').text(label, fieldX, fieldY + fieldLabelOffset);
        const content = String(text || '');
        const contentWidth = boxWidth - fieldPadding * 2;
        const textHeight = content
          ? doc.heightOfString(content, { width: contentWidth })
          : doc.heightOfString(' ', { width: contentWidth });
        const boxHeight = Math.max(20, Math.ceil(textHeight + fieldPadding * 2));
        const rectY = fieldY + 17;
        doc.rect(fieldX, rectY, boxWidth, boxHeight).stroke();
        doc.fontSize(12).fillColor('#000').text(content, fieldX + fieldPadding, rectY + fieldPadding, { width: contentWidth });
        fieldY = rectY + boxHeight + 10;
      };

      drawLabeledBox('CLIENTE', datosEnvio.cliente_nombre || '', 300);

      const vendedorLabelY = fieldY;
      doc.fontSize(12).fillColor('#000').text('VENDEDOR', fieldX, vendedorLabelY);
      const pageUsableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const vendedorContent = String(datosEnvio.vendedor_nombre || '');
      const vendedorContentWidth = pageUsableWidth - (fieldX - doc.page.margins.left) - fieldPadding * 2;
      const vendedorTextHeight = vendedorContent
        ? doc.heightOfString(vendedorContent, { width: vendedorContentWidth })
        : doc.heightOfString(' ', { width: vendedorContentWidth });
      const vendedorBoxHeight = Math.max(20, Math.ceil(vendedorTextHeight + fieldPadding * 2));
      const vendedorRectY = vendedorLabelY + 17;
      doc.rect(fieldX, vendedorRectY, vendedorContentWidth + fieldPadding * 2, vendedorBoxHeight).stroke();
      doc.fontSize(12).fillColor('#000').text(vendedorContent, fieldX + fieldPadding, vendedorRectY + fieldPadding, { width: vendedorContentWidth });
      fieldY = vendedorRectY + vendedorBoxHeight + 10;

      drawLabeledBox('TRANSPORTE', datosEnvio.transporte || 'Por definir', 540);
      drawLabeledBox('DIRECCIÓN:', datosEnvio.cliente_direccion || '', 540);

      // Tabla productos
      const tableTop = Math.max(fieldY + 20, 320);
      const pageUsableWidth2 = doc.page.width - doc.page.margins.left - doc.page.margins.right - (fieldX - doc.page.margins.left);
      const col1W = 60;
      const col2W = 60;
      const col3W = 120;
      const col5W = 80;
      const col6W = 80;
      const col4W = Math.max(120, pageUsableWidth2 - (col1W + col2W + col3W + col5W + col6W));

      const col1X = fieldX;
      const col2X = col1X + col1W;
      const col3X = col2X + col2W;
      const col4X = col3X + col3W;
      const col5X = col4X + col4W;
      const col6X = col5X + col5W;

      doc.rect(col1X, tableTop, col1W, 25)
        .rect(col2X, tableTop, col2W, 25)
        .rect(col3X, tableTop, col3W, 25)
        .rect(col4X, tableTop, col4W, 25)
        .rect(col5X, tableTop, col5W, 25)
        .rect(col6X, tableTop, col6W, 25)
        .stroke();

      doc.fontSize(10)
        .text('CANTIDAD', col1X + 5, tableTop + 8)
        .text('COLOR', col2X + 10, tableTop + 8)
        .text('ESTILO', col3X + 10, tableTop + 8)
        .text('DESCRIPCIÓN', col4X + 5, tableTop + 8)
        .text('PRECIO/U', col5X + 5, tableTop + 8)
        .text('TOTAL', col6X + 5, tableTop + 8);

      let currentY = tableTop + 25;
      let totalGeneral = 0;
      const pageBottom = doc.page.height - doc.page.margins.bottom;

      if (datosEnvio.productos?.length) {
        datosEnvio.productos.forEach((p) => {
          const subtotal = p.cantidad * p.precio_unitario || 0;
          totalGeneral += subtotal;

          const descText = String(p.nombre || '');
          const descWidth = 200 - fieldPadding * 2;
          const descHeight = doc.heightOfString(descText, { width: descWidth, align: 'left' });
          const rowHeightDynamic = Math.max(25, Math.ceil(descHeight + fieldPadding * 2));

          if (currentY + rowHeightDynamic + 80 > pageBottom) {
            doc.addPage();
            currentY = doc.page.margins.top;
          }

          doc.rect(col1X, currentY, 50, rowHeightDynamic)
            .rect(col2X, currentY, 50, rowHeightDynamic)
            .rect(col3X, currentY, 100, rowHeightDynamic)
            .rect(col4X, currentY, 200, rowHeightDynamic)
            .rect(col5X, currentY, 70, rowHeightDynamic)
            .rect(col6X, currentY, 70, rowHeightDynamic)
            .stroke();

          doc.fontSize(10)
            .text(String(p.cantidad ?? ''), col1X + 5, currentY + fieldPadding, { width: 50 - fieldPadding * 2, align: 'center' })
            .text('', col2X + 5, currentY + fieldPadding, { width: 50 - fieldPadding * 2 })
            .text(p.codigo || '', col3X + 5, currentY + fieldPadding, { width: 100 - fieldPadding * 2 })
            .text(descText, col4X + 5, currentY + fieldPadding, { width: 200 - fieldPadding * 2 })
            .text(`Q${Number(p.precio_unitario || 0).toFixed(2)}`, col5X + 5, currentY + fieldPadding, { width: 70 - fieldPadding * 2, align: 'right' })
            .text(`Q${subtotal.toFixed(2)}`, col6X + 5, currentY + fieldPadding, { width: 70 - fieldPadding * 2, align: 'right' });

          currentY += rowHeightDynamic;
        });
      } else {
        const placeholderRowHeight = 25;
        for (let i = 0; i < 5; i++) {
          doc.rect(col1X, currentY, 50, placeholderRowHeight)
            .rect(col2X, currentY, 50, placeholderRowHeight)
            .rect(col3X, currentY, 100, placeholderRowHeight)
            .rect(col4X, currentY, 200, placeholderRowHeight)
            .rect(col5X, currentY, 70, placeholderRowHeight)
            .rect(col6X, currentY, 70, placeholderRowHeight)
            .stroke();
          currentY += placeholderRowHeight;
        }
      }

      const totalY = currentY + 20;
      doc.fontSize(12).fillColor('#000')
        .text('TOTAL', 450, totalY)
        .rect(520, totalY - 5, 70, 25).stroke()
        .text(`Q${Number(datosEnvio.total ?? totalGeneral).toFixed(2)}`, 525, totalY);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { crearPDFEnvioNacional };
