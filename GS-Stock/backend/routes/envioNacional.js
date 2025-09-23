const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const PDFDocument = require('pdfkit');
const authenticateToken = require('../middleware/auth');

const pool = new Pool({
  user: process.env.DB_USER || 'admin',
  host: process.env.DB_HOST || 'postgres',
  database: process.env.DB_NAME || 'mydb',
  password: process.env.DB_PASSWORD || 'secret',
  port: process.env.DB_PORT || 5432,
});

// Función para generar número de envío
function generarNumeroEnvio(tipo = 'NAL') {
    const fecha = new Date();
    const year = fecha.getFullYear().toString().slice(-2);
    const month = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const day = fecha.getDate().toString().padStart(2, '0');
    const timestamp = Date.now().toString().slice(-6);
    
    return `${tipo}${year}${month}${day}${timestamp}`;
}

// Función para crear PDF de envío nacional
async function crearPDFEnvioNacional(datosEnvio) {
  const PDFDocument = require('pdfkit');

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      });

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        resolve({
          pdfBuffer,
          fileName: `envio_nacional_${datosEnvio.numero_envio}.pdf`,
          success: true
        });
      });
      doc.on('error', reject);

      const primaryColor = '#2c3e50';
      const secondaryColor = '#3498db';

      // Encabezado
      doc.fontSize(20).fillColor(primaryColor).text('ZAPATERIA', 50, 50, { width: 200 });
      doc.fontSize(14).fillColor(secondaryColor).text('LÍNEA NACIONAL', 50, 75);

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
      const fieldLabelOffset = 0; // label drawn at fieldY
      const fieldPadding = 5;

      // Helper to draw a labeled box that grows with content
      const drawLabeledBox = (label, text, boxWidth) => {
        doc.fontSize(12).fillColor('#000').text(label, fieldX, fieldY + fieldLabelOffset);
        const content = String(text || '');
        const contentWidth = boxWidth - (fieldPadding * 2);
        // Use same font size as set (12)
        const textHeight = content ? doc.heightOfString(content, { width: contentWidth }) : doc.heightOfString(' ', { width: contentWidth });
        const boxHeight = Math.max(20, Math.ceil(textHeight + (fieldPadding * 2)));
        const rectY = fieldY + 17;
        doc.rect(fieldX, rectY, boxWidth, boxHeight).stroke();
        doc.fontSize(12).fillColor('#000').text(content, fieldX + fieldPadding, rectY + fieldPadding, { width: contentWidth });
        // advance fieldY for the next field (spacing 10)
        fieldY = rectY + boxHeight + 10;
      };

      // CLIENTE (narrow)
      drawLabeledBox('CLIENTE', datosEnvio.cliente_nombre || '', 300);

  // VENDEDOR (full width) - use usable width based on page size (landscape)
  const vendedorLabelY = fieldY;
  doc.fontSize(12).fillColor('#000').text('VENDEDOR', fieldX, vendedorLabelY);
  // compute vendedor box using page measurements
  const pageUsableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const vendedorContent = String(datosEnvio.vendedor_nombre || '');
  const vendedorContentWidth = pageUsableWidth - (fieldX - doc.page.margins.left) - (fieldPadding * 2);
  const vendedorTextHeight = vendedorContent ? doc.heightOfString(vendedorContent, { width: vendedorContentWidth }) : doc.heightOfString(' ', { width: vendedorContentWidth });
  const vendedorBoxHeight = Math.max(20, Math.ceil(vendedorTextHeight + (fieldPadding * 2)));
  const vendedorRectY = vendedorLabelY + 17;
  doc.rect(fieldX, vendedorRectY, vendedorContentWidth + (fieldPadding * 2), vendedorBoxHeight).stroke();
  doc.fontSize(12).fillColor('#000').text(vendedorContent, fieldX + fieldPadding, vendedorRectY + fieldPadding, { width: vendedorContentWidth });
  fieldY = vendedorRectY + vendedorBoxHeight + 10;

      // TRANSPORTE
      drawLabeledBox('TRANSPORTE', datosEnvio.transporte || 'Por definir', 540);

      // DIRECCIÓN
      drawLabeledBox('DIRECCIÓN:', datosEnvio.cliente_direccion || '', 540);

    // Tabla productos (sin “cuadro de información” adicional)
    const tableTop = Math.max(fieldY + 20, 320);
    // compute column widths based on usable page width
    const pageUsableWidth2 = doc.page.width - doc.page.margins.left - doc.page.margins.right - (fieldX - doc.page.margins.left);
    const col1W = 60; // CANTIDAD
    const col2W = 60; // COLOR
    const col3W = 120; // ESTILO
    const col5W = 80; // PRECIO/U
    const col6W = 80; // TOTAL
    const col4W = Math.max(120, pageUsableWidth2 - (col1W + col2W + col3W + col5W + col6W)); // DESCRIPCIÓN gets remaining

    const col1X = fieldX;
    const col2X = col1X + col1W;
    const col3X = col2X + col2W;
    const col4X = col3X + col3W;
    const col5X = col4X + col4W;
    const col6X = col5X + col5W;

    // Headers
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

    // Filas: calcular altura dinámica por fila para ajustarse al contenido
    let currentY = tableTop + 25;
      let totalGeneral = 0;

      const pageBottom = doc.page.height - doc.page.margins.bottom;

      if (datosEnvio.productos?.length) {
        datosEnvio.productos.forEach((p) => {
          const subtotal = (p.cantidad * p.precio_unitario) || 0;
          totalGeneral += subtotal;

          // calcular altura necesaria para la descripción
          const descText = String(p.nombre || '');
          const descWidth = 200 - (fieldPadding * 2);
          const descHeight = doc.heightOfString(descText, { width: descWidth, align: 'left' });
          const minRowHeight = 25;
          const rowHeightDynamic = Math.max(minRowHeight, Math.ceil(descHeight + fieldPadding * 2));

          // Salto de página si es necesario
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
        // placeholder rows
        const placeholderRows = 5;
        const placeholderRowHeight = 25;
        for (let i = 0; i < placeholderRows; i++) {
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

    // Total (simple)
    const totalY = currentY + 20;
    doc.fontSize(12).fillColor('#000')
      .text('TOTAL', 450, totalY)
      .rect(520, totalY - 5, 70, 25).stroke()
      .text(`Q${Number((datosEnvio.total ?? totalGeneral)).toFixed(2)}`, 525, totalY);

      // Nota
    doc.fontSize(10).fillColor(secondaryColor)
      .text('* ENTREGA ESTIMADA: 1-3 DÍAS HÁBILES', 50, totalY + 40);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// POST - Crear envío nacional - CORREGIDO
router.post('/', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { pedido_id, transporte, fecha_entrega_estimada, observaciones } = req.body;
    if (!pedido_id) {
      return res.status(400).json({ success: false, error: 'El ID del pedido es requerido' });
    }

    // FLEXIBLE: detectar Línea Nacional sin depender de acentos/espacios/mayúsculas
    const pedidoQuery = `
        SELECT 
            p.*,
            c.nombre || ' ' || c.apellido AS cliente_nombre,
            COALESCE(
                (SELECT d.direccion
                    FROM Direcciones d
                    JOIN Cliente_Direcciones cd ON d.Id = cd.Id_Direccion
                    WHERE cd.Id_Cliente = c.Id
                    LIMIT 1),
                'Sin dirección'
            ) AS cliente_direccion,
            /* vendedor directo desde Usuarios usando p.Id_Vendedor */
            COALESCE(
                (SELECT u.nombre || ' ' || u.apellido
                    FROM Usuarios u
                    WHERE u.Id = p.Id_Vendedor
                    LIMIT 1),
                'Sin vendedor'
            ) AS vendedor_nombre,
            p.total AS total_pedido,
            tlp.nombre AS tipo_linea_nombre
        FROM Pedidos p
        JOIN Clientes c ON p.Id_Cliente = c.Id
        JOIN Tipos_Linea_Producto tlp ON p.Id_Tipo_Linea_Producto = tlp.Id
        WHERE p.Id = $1
            AND LOWER(TRIM(tlp.nombre)) LIKE '%nacional%'
        LIMIT 1
    `;

    const pedidoResult = await client.query(pedidoQuery, [pedido_id]);
    if (pedidoResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Pedido no encontrado o no pertenece a línea nacional'
      });
    }

    const datosPedido = pedidoResult.rows[0];

    // Número de envío
    const numeroEnvio = (function generarNumeroEnvio(tipo = 'NAL') {
      const fecha = new Date();
      const year = fecha.getFullYear().toString().slice(-2);
      const month = (fecha.getMonth() + 1).toString().padStart(2, '0');
      const day = fecha.getDate().toString().padStart(2, '0');
      const timestamp = Date.now().toString().slice(-6);
      return `${tipo}${year}${month}${day}${timestamp}`;
    })();

    // Productos (alineado con importadora: respeta dp.Id_Talla)
    const productosQuery = `
        SELECT 
            dp.Cantidad,
            z.Codigo,
            z.Nombre,
            COALESCE(t.Talla_EU::text, 'N/A') AS talla_eu,
            COALESCE(t.Talla_US::text, 'N/A') AS talla_us,
            COALESCE(dp.Precio_Unitario, z.precio_par, 100.00) AS precio_unitario
        FROM Detalle_Pedidos dp
        JOIN Zapatos z ON dp.Id_Zapato = z.Id
        LEFT JOIN Zapatos_Tallas zt 
            ON z.Id = zt.Id_Zapato 
        AND dp.Id_Talla = zt.Id_Talla
        LEFT JOIN Tallas t ON zt.Id_Talla = t.Id
        WHERE dp.Id_Pedido = $1
    `;

    const productosResult = await client.query(productosQuery, [pedido_id]);

    // Insertar Envío
    const insertEnvioQuery = `
      INSERT INTO Envios (
        Id_Pedidos, Fecha_Envio, Fecha_Entrega_Estimada, Transporte,
        Id_Estado_Envio, Numero_De_Envio, Numero_Envio_Display, Observaciones
      )
      VALUES ($1, $2, $3, $4, 1, $5, $6, $7)
      RETURNING *
    `;
    const envioResult = await client.query(insertEnvioQuery, [
      pedido_id,
      new Date(),
      fecha_entrega_estimada || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      transporte || 'Por definir',
      numeroEnvio,
      numeroEnvio,
      observaciones || ''
    ]);

    // Datos para PDF
    const datosEnvio = {
      numero_envio: numeroEnvio,
      cliente_nombre: datosPedido.cliente_nombre,
      cliente_direccion: datosPedido.cliente_direccion,
      vendedor_nombre: datosPedido.vendedor_nombre,
      transporte: transporte || 'Por definir',
      total: parseFloat(datosPedido.total_pedido || 0),
      productos: productosResult.rows.map(p => ({
        cantidad: p.cantidad,
        codigo: p.codigo,
        nombre: `${p.nombre} - EU ${p.talla_eu || 'N/A'}`,
        precio_unitario: parseFloat(p.precio_unitario || 0)
      }))
    };

    // Generar PDF
    const pdfResult = await crearPDFEnvioNacional(datosEnvio);

    await client.query('COMMIT');

    // Descargar PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${pdfResult.fileName}"`);
    res.setHeader('Content-Length', pdfResult.pdfBuffer.length);
    res.setHeader('Cache-Control', 'no-cache');
    res.send(pdfResult.pdfBuffer);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error al crear envío nacional:', error);
    if (res.headersSent) return res.end();
    res.status(500).json({ success: false, error: 'Error interno del servidor', details: error.message });
  } finally {
    client.release();
  }
});

// GET - Obtener todos los envíos nacionales
router.get('/', authenticateToken, async (req, res) => {
    try {
        const query = `
            SELECT 
                e.*,
                p.Id_Cliente,
                c.nombre || ' ' || c.apellido as cliente_nombre,
                COALESCE(
                    (SELECT u.nombre || ' ' || u.apellido
                     FROM Vendedores v
                     INNER JOIN Usuarios u ON v.Id_Usuarios = u.Id
                     WHERE v.Id = p.Id_Vendedor
                     LIMIT 1),
                    'Sin vendedor'
                ) as vendedor_nombre,
                tlp.nombre as tipo_linea_nombre,
                p.total as total_pedido,
                ep.Estado as estado_pedido
            FROM Envios e
            INNER JOIN Pedidos p ON e.Id_Pedidos = p.Id
            INNER JOIN Clientes c ON p.Id_Cliente = c.Id
            LEFT JOIN Estados_Pedidos ep ON p.Id_Estado_Pedido = ep.Id
            LEFT JOIN Tipos_Linea_Producto tlp ON p.Id_Tipo_Linea_Producto = tlp.Id
            WHERE LOWER(tlp.nombre) LIKE '%nacional%'
            ORDER BY e.Fecha_Envio DESC
        `;
        
        const result = await pool.query(query);
        
        res.json({
            success: true,
            message: 'Envíos nacionales obtenidos correctamente',
            data: result.rows
        });
        
    } catch (error) {
        console.error('Error al obtener envíos nacionales:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

module.exports = router;