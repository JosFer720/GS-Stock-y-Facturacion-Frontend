const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const PDFDocument = require('pdfkit');
const authenticateToken = require('../middleware/auth');
const path = require('path');
const fs = require('fs');

const pool = new Pool({
  user: process.env.DB_USER || 'admin',
  host: process.env.DB_HOST || 'postgres',
  database: process.env.DB_NAME || 'mydb',
  password: process.env.DB_PASSWORD || 'secret',
  port: process.env.DB_PORT || 5432,
});

// Función para generar número de envío importadora
function generarNumeroEnvio(tipo = 'IMP') {
    const fecha = new Date();
    const year = fecha.getFullYear().toString().slice(-2);
    const month = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const day = fecha.getDate().toString().padStart(2, '0');
    const timestamp = Date.now().toString().slice(-6);
    
    return `${tipo}${year}${month}${day}${timestamp}`;
}

// Función para crear PDF de envío importadora con diseño exacto
async function crearPDFEnvioImportadora(datosEnvio) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: 'A4',
                layout: 'landscape', // Cambiar a horizontal
                margins: {
                    top: 30,
                    bottom: 30,
                    left: 30,
                    right: 30
                }
            });

            const chunks = [];
            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => {
                const pdfBuffer = Buffer.concat(chunks);
                resolve({
                    pdfBuffer: pdfBuffer,
                    fileName: `envio_importadora_${datosEnvio.numero_envio}.pdf`,
                    success: true
                });
            });

            doc.on('error', (error) => {
                reject(error);
            });

            const pageWidth = 841.89; // A4 landscape width in points
            const pageHeight = 595.28; // A4 landscape height in points
            const margin = 30;

            const logoX = pageWidth - 180; // Posición en esquina superior derecha
            const logoY = margin;

            try {
                // Buscar primero en backend/public/images (disponible en contenedor)
                const logoBackendPath = path.join(__dirname, '..', 'public', 'images', 'logo-without-back-letters.png');
                const logoFrontendPath = path.join(__dirname, '..', '..', 'frontend', 'src', 'assets', 'images', 'logo-without-back-letters.png');
                let logoPath = null;

                if (fs.existsSync(logoBackendPath)) {
                    logoPath = logoBackendPath;
                } else if (fs.existsSync(logoFrontendPath)) {
                    logoPath = logoFrontendPath;
                }

                if (logoPath) {
                    doc.image(logoPath, logoX, logoY, {
                        width: 150,
                        align: 'right'
                    });
                    console.log('✅ Logo cargado desde:', logoPath);
                } else {
                    // Texto alternativo si no encuentra el logo
                    doc.fontSize(14).fillColor('#000000').text('GENSER', logoX + 40, logoY + 5);
                    doc.fontSize(8).text('COMERCIALIZADORA E IMPORTADORA', logoX - 10, logoY + 25, { width: 170, align: 'center' });
                    console.log('⚠️ Logo no encontrado, usando texto alternativo');
                }
            } catch (error) {
                doc.fontSize(14).fillColor('#000000').text('GENSER', logoX + 40, logoY + 5);
                doc.fontSize(8).text('COMERCIALIZADORA E IMPORTADORA', logoX - 10, logoY + 25, { width: 170, align: 'center' });
                console.log('⚠️ Error cargando logo:', error.message);
            }

            // --- Header Fields (ZAPATERIA, FECHA, ENVIO #) ---
            const headerY = margin;
            const headerBoxWidth = 350;
            const headerBoxHeight = 25;
            const fieldPadding = 5;

            // ZAPATERIA
            doc.fontSize(10).text('ZAPATERIA', margin, headerY);
            doc.rect(margin, headerY + 15, headerBoxWidth, headerBoxHeight).stroke();
            doc.fontSize(10).text(datosEnvio.zapateria_nombre || '', margin + fieldPadding, headerY + 15 + fieldPadding, { width: headerBoxWidth - (fieldPadding * 2), align: 'left' });

            // FECHA and ENVIO #
            doc.fontSize(10).text('FECHA', 400, headerY);
            doc.rect(400, headerY + 15, 120, headerBoxHeight).stroke();
            doc.fontSize(10).text(new Date().toLocaleDateString('es-ES'), 400 + fieldPadding, headerY + 15 + fieldPadding, { width: 110, align: 'center' });

            doc.fontSize(10).text('ENVIO #', 530, headerY);
            doc.rect(530, headerY + 15, 120, headerBoxHeight).stroke();
            doc.fontSize(10).text(datosEnvio.numero_envio || '', 530 + fieldPadding, headerY + 15 + fieldPadding, { width: 110, align: 'center' });

            // --- CLIENTE and VENDEDOR ---
            const clientY = headerY + 65;
            doc.fontSize(10).text('CLIENTE', margin, clientY);
            doc.rect(margin, clientY + 15, headerBoxWidth, headerBoxHeight).stroke();
            doc.fontSize(10).text(datosEnvio.cliente_nombre || '', margin + fieldPadding, clientY + 15 + fieldPadding, { width: headerBoxWidth - (fieldPadding * 2), align: 'left' });

            doc.fontSize(10).text('VENDEDOR', 400, clientY);
            doc.rect(400, clientY + 15, 300, headerBoxHeight).stroke();
            doc.fontSize(10).text(datosEnvio.vendedor_nombre || '', 400 + fieldPadding, clientY + 15 + fieldPadding, { width: 250, align: 'left' });

            // --- TRANSPORTE and DIRECCION ---
            const transportY = clientY + 65;
            doc.fontSize(10).text('TRANSPORTE', margin, transportY);
            doc.rect(margin, transportY + 15, headerBoxWidth, headerBoxHeight).stroke();
            doc.fontSize(10).text(datosEnvio.transporte || 'Por definir', margin + fieldPadding, transportY + 15 + fieldPadding, { width: headerBoxWidth - (fieldPadding * 2), align: 'left' });

            doc.fontSize(10).text('DIRECCION:', 400, transportY);
            doc.rect(400, transportY + 15, 300, headerBoxHeight).stroke();
            doc.fontSize(10).text(datosEnvio.cliente_direccion || '', 400 + fieldPadding, transportY + 15 + fieldPadding, { width: 250, align: 'left' });

            // --- Product Table ---
            const tableTop = transportY + 65;
            const tableWidth = pageWidth - 2 * margin;
            const col1W = 60;   // CANTIDAD
            const col2W = 60;   // COLOR
            const col3W = 80;   // ESTILO  
            const col4W = 350;  // DESCRIPCION
            const col5W = 85;   // PRECIO/U
            const col6W = 85;   // TOTAL

            const col1X = margin;
            const col2X = col1X + col1W;
            const col3X = col2X + col2W;
            const col4X = col3X + col3W;
            const col5X = col4X + col4W;
            const col6X = col5X + col5W;

            // Headers
            doc.rect(col1X, tableTop, col1W, 20).stroke();
            doc.rect(col2X, tableTop, col2W, 20).stroke();
            doc.rect(col3X, tableTop, col3W, 20).stroke();
            doc.rect(col4X, tableTop, col4W, 20).stroke();
            doc.rect(col5X, tableTop, col5W, 20).stroke();
            doc.rect(col6X, tableTop, col6W, 20).stroke();

            doc.fontSize(9)
               .fillColor('#000000')
               .text('CANTIDAD', col1X, tableTop + 6, { width: col1W, align: 'center' })
               .text('COLOR', col2X, tableTop + 6, { width: col2W, align: 'center' })
               .text('ESTILO', col3X, tableTop + 6, { width: col3W, align: 'center' })
               .text('DESCRIPCION', col4X, tableTop + 6, { width: col4W, align: 'center' })
               .text('PRECIO/U', col5X, tableTop + 6, { width: col5W, align: 'center' })
               .text('TOTAL', col6X, tableTop + 6, { width: col6W, align: 'center' });

            // Build rows dynamically to fit description
            const contentY = tableTop + 20;
            let currentY = contentY;
            const pageBottom = doc.page.height - doc.page.margins.bottom;

            if (datosEnvio.productos && datosEnvio.productos.length > 0) {
                datosEnvio.productos.forEach((p) => {
                    const desc = String(p.nombre || '');
                    const descHeight = doc.heightOfString(desc, { width: col4W - 10 });
                    const minRow = 25;
                    const rowH = Math.max(minRow, Math.ceil(descHeight + 10));

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
                // placeholder rows
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

            // --- Cuadro de información dentro de la columna de DESCRIPCION ---
            const infoBoxX = col4X + 20; 
            const infoBoxY = currentY + 20; // position after table rows
            const infoBoxWidth = col4W - 40;
            // Calculate dynamic height needed for info box content
            const infoLines = [
                'NOMBRE ___________________________________',
                'FIRMA _____________________________________',
                'REVISADO:_________________________________',
                'FECHA RECIBIDO: __________________________',
                'CARGO POR ENVÍO Q.________________________',
                'GUÍA No.__________________________________'
            ];
            const infoTextHeight = infoLines.reduce((acc, line) => acc + doc.heightOfString(line, { width: infoBoxWidth - 20 }), 0);
            const infoBoxHeight = Math.max(80, Math.ceil(infoTextHeight + 20));
            // Ensure it fits in the page
            if (infoBoxY + infoBoxHeight + 120 > pageBottom) {
                doc.addPage();
                // recompute positions on new page
            }
            doc.rect(infoBoxX, infoBoxY, infoBoxWidth, infoBoxHeight).stroke();

            let infoY = infoBoxY + 8;
            doc.fontSize(8).fillColor('#000000');
            infoLines.forEach((line) => {
                doc.text(line, infoBoxX + 10, infoY, { width: infoBoxWidth - 20 });
                infoY += doc.heightOfString(line, { width: infoBoxWidth - 20 }) + 6;
            });

            // Discount lines
            doc.fontSize(7).text('DESCUENTO 0 A 30 DÍAS -15%', infoBoxX + 15, infoY, { width: infoBoxWidth - 30 });
            infoY += doc.heightOfString('DESCUENTO 0 A 30 DÍAS -15%', { width: infoBoxWidth - 30 }) + 4;
            doc.text('DESCUENTO 31 A 60 DÍAS -10%', infoBoxX + 15, infoY, { width: infoBoxWidth - 30 });

            // --- TOTAL Box ---
            const totalBoxWidth = col6W;
            const totalBoxHeight = 25;
            const totalBoxX = col6X;
            const totalBoxY = infoBoxY + infoBoxHeight + 10;

            doc.fontSize(10).fillColor('#000000').text('TOTAL', totalBoxX, totalBoxY - 15, { width: totalBoxWidth, align: 'center' });
            doc.rect(totalBoxX, totalBoxY, totalBoxWidth, totalBoxHeight).stroke();
            doc.fillColor('#000000').fontSize(12).text(`Q${(datosEnvio.total).toFixed(2)}`, totalBoxX, totalBoxY + 8, { width: totalBoxWidth, align: 'center' });

            doc.end();

        } catch (error) {
            reject(error);
        }
    });
}

// POST - Crear nuevo envío de importadora y generar PDF
router.post('/', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const { pedido_id, transporte, fecha_entrega_estimada, observaciones } = req.body;
        
        console.log('📦 Creando envío importadora para pedido:', pedido_id);
        
        if (!pedido_id) {
            return res.status(400).json({
                success: false,
                error: 'El ID del pedido es requerido'
            });
        }
        
        // Query para buscar pedidos de línea IMPORTADORA
        const pedidoQuery = `
            SELECT 
                p.*,
                c.nombre || ' ' || c.apellido as cliente_nombre,
                COALESCE(
                    (SELECT d.direccion 
                    FROM Direcciones d 
                    INNER JOIN Cliente_Direcciones cd ON d.Id = cd.Id_Direccion 
                    WHERE cd.Id_Cliente = c.Id 
                    LIMIT 1), 
                    'Sin dirección'
                ) as cliente_direccion,
                COALESCE(
                    (SELECT u.nombre || ' ' || u.apellido
                    FROM Vendedores v
                    INNER JOIN Usuarios u ON v.Id_Usuarios = u.Id
                    WHERE v.Id = p.Id_Vendedor
                    LIMIT 1),
                    'Sin vendedor'
                ) as vendedor_nombre,
                p.total as total_pedido,
                tlp.nombre as tipo_linea_nombre
            FROM Pedidos p
            INNER JOIN Clientes c ON p.Id_Cliente = c.Id
            INNER JOIN Tipos_Linea_Producto tlp ON p.Id_Tipo_Linea_Producto = tlp.Id
            WHERE p.Id = $1 AND LOWER(TRIM(tlp.nombre)) LIKE '%importadora%'
            LIMIT 1
        `;
        
        const pedidoResult = await client.query(pedidoQuery, [pedido_id]);
        
        if (pedidoResult.rows.length === 0) {
            console.log('❌ Pedido no encontrado o no es línea importadora');
            return res.status(404).json({
                success: false,
                error: 'Pedido no encontrado o no pertenece a línea importadora'
            });
        }
        
        const datosPedido = pedidoResult.rows[0];
        console.log('✅ Datos del pedido encontrados:', datosPedido.cliente_nombre);
        
        // Generar número de envío
        const numeroEnvio = generarNumeroEnvio('IMP');
        
        // Obtener productos del pedido
        const productosQuery = `
        SELECT 
            dp.Cantidad,
            z.Codigo,
            z.Nombre,
            COALESCE(t.Talla_EU, 0) as talla_eu,
            COALESCE(t.Talla_US, 0) as talla_us,
            COALESCE(dp.Precio_Unitario, z.precio_par, 100.00) as precio_unitario
        FROM Detalle_Pedidos dp
        INNER JOIN Zapatos z ON dp.Id_Zapato = z.Id
        LEFT JOIN Zapatos_Tallas zt ON z.Id = zt.Id_Zapato AND dp.Id_Talla = zt.Id_Talla
        LEFT JOIN Tallas t ON zt.Id_Talla = t.Id
        WHERE dp.Id_Pedido = $1
    `;
        
        const productosResult = await client.query(productosQuery, [pedido_id]);
        console.log('✅ Productos encontrados:', productosResult.rows.length);
        
        // Crear registro de envío en la base de datos
        const insertEnvioQuery = `
            INSERT INTO Envios (
                Id_Pedidos, 
                Fecha_Envio, 
                Fecha_Entrega_Estimada, 
                Transporte, 
                Id_Estado_Envio, 
                Numero_De_Envio,
                Numero_Envio_Display,
                Observaciones
            ) VALUES ($1, $2, $3, $4, 1, $5, $6, $7)
            RETURNING *
        `;
        
        const envioResult = await client.query(insertEnvioQuery, [
            pedido_id,
            new Date(),
            fecha_entrega_estimada || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            transporte || 'Por definir',
            numeroEnvio,
            numeroEnvio,
            observaciones || 'Generado automáticamente'
        ]);
        
        console.log('✅ Envío registrado en BD con ID:', envioResult.rows[0].id);
        
        // Preparar datos para el PDF
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
        
        console.log('📄 Generando PDF con datos:', {
            numero_envio: datosEnvio.numero_envio,
            cliente: datosEnvio.cliente_nombre,
            productos: datosEnvio.productos.length
        });
        
        // Generar PDF
        const pdfResult = await crearPDFEnvioImportadora(datosEnvio);
        
        await client.query('COMMIT');
        
        console.log('✅ PDF generado exitosamente, tamaño:', pdfResult.pdfBuffer.length, 'bytes');
        
        // Configurar headers correctos para descarga de PDF
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${pdfResult.fileName}"`);
        res.setHeader('Content-Length', pdfResult.pdfBuffer.length);
        res.setHeader('Cache-Control', 'no-cache');
        
        // Enviar el PDF directamente
        res.send(pdfResult.pdfBuffer);
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error completo:', error);
        
        // Si ya se enviaron headers, no podemos enviar JSON
        if (res.headersSent) {
            console.error('❌ Headers ya enviados, cerrando conexión');
            res.end();
            return;
        }
        
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            details: error.message
        });
    } finally {
        client.release();
    }
});

// GET - Obtener todos los envíos de importadora
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
            WHERE LOWER(tlp.nombre) LIKE '%importadora%'
            ORDER BY e.Fecha_Envio DESC
        `;
        
        const result = await pool.query(query);
        
        res.json({
            success: true,
            message: 'Envíos de importadora obtenidos correctamente',
            data: result.rows
        });
        
    } catch (error) {
        console.error('Error al obtener envíos de importadora:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

module.exports = router;