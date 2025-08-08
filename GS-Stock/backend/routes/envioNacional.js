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
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: 'A4',
                margins: {
                    top: 50,
                    bottom: 50,
                    left: 50,
                    right: 50
                }
            });

            const chunks = [];
            
            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => {
                const pdfBuffer = Buffer.concat(chunks);
                resolve({
                    pdfBuffer: pdfBuffer,
                    fileName: `envio_nacional_${datosEnvio.numero_envio}.pdf`,
                    success: true
                });
            });
            
            doc.on('error', (error) => {
                reject(error);
            });

            // Configuración de fuentes y colores
            const primaryColor = '#2c3e50';
            const secondaryColor = '#3498db'; // Azul para línea nacional
            
            // Header con logo y información de la empresa
            doc.fontSize(20)
               .fillColor(primaryColor)
               .text('ZAPATERIA', 50, 50, { width: 200 });

            // Marca de NACIONAL
            doc.fontSize(14)
               .fillColor(secondaryColor)
               .text('LÍNEA NACIONAL', 50, 75);

            // Información del envío en la esquina superior derecha
            doc.fontSize(12)
               .fillColor('#000000')
               .text('FECHA', 400, 50)
               .rect(450, 47, 100, 20)
               .stroke()
               .text(new Date().toLocaleDateString('es-ES'), 455, 52);

            doc.text('ENVIO #', 400, 80)
               .rect(450, 77, 100, 20)
               .stroke()
               .text(datosEnvio.numero_envio || '', 455, 82);

            // Logo GENSER en la esquina derecha
            doc.fontSize(16)
               .fillColor(primaryColor)
               .text('GENSER', 480, 120)
               .fontSize(8)
               .text('DISTRIBUIDORES AUTORIZADOS', 465, 140);

            // Información del cliente
            doc.fontSize(12)
               .fillColor('#000000')
               .text('CLIENTE', 50, 110);
            
            doc.rect(50, 127, 300, 20)
               .stroke()
               .text(datosEnvio.cliente_nombre || '', 55, 132);

            // Información del vendedor
            doc.text('VENDEDOR', 50, 160);
            doc.rect(50, 177, 540, 20)
               .stroke()
               .text(datosEnvio.vendedor_nombre || '', 55, 182);

            // Información del transporte
            doc.text('TRANSPORTE', 50, 210);
            doc.rect(50, 227, 540, 20)
               .stroke()
               .text(datosEnvio.transporte || 'Por definir', 55, 232);

            // Dirección
            doc.text('DIRECCIÓN:', 50, 260);
            doc.rect(50, 277, 540, 20)
               .stroke()
               .text(datosEnvio.cliente_direccion || '', 55, 282);

            // Tabla de productos
            const tableTop = 320;
            const col1X = 50;  // CANTIDAD
            const col2X = 100; // COLOR
            const col3X = 150; // ESTILO
            const col4X = 250; // DESCRIPCIÓN
            const col5X = 450; // PRECIO/U
            const col6X = 520; // TOTAL

            // Headers de la tabla
            doc.rect(col1X, tableTop, 50, 25)
               .rect(col2X, tableTop, 50, 25)
               .rect(col3X, tableTop, 100, 25)
               .rect(col4X, tableTop, 200, 25)
               .rect(col5X, tableTop, 70, 25)
               .rect(col6X, tableTop, 70, 25)
               .stroke();

            doc.fontSize(10)
               .text('CANTIDAD', col1X + 5, tableTop + 8)
               .text('COLOR', col2X + 10, tableTop + 8)
               .text('ESTILO', col3X + 30, tableTop + 8)
               .text('DESCRIPCIÓN', col4X + 70, tableTop + 8)
               .text('PRECIO/U', col5X + 10, tableTop + 8)
               .text('TOTAL', col6X + 20, tableTop + 8);

            // Filas de productos
            let currentY = tableTop + 25;
            const rowHeight = 25;
            let totalGeneral = 0;

            if (datosEnvio.productos && datosEnvio.productos.length > 0) {
                datosEnvio.productos.forEach((producto, index) => {
                    const subtotal = (producto.cantidad * producto.precio_unitario);
                    totalGeneral += subtotal;

                    doc.rect(col1X, currentY, 50, rowHeight)
                       .rect(col2X, currentY, 50, rowHeight)
                       .rect(col3X, currentY, 100, rowHeight)
                       .rect(col4X, currentY, 200, rowHeight)
                       .rect(col5X, currentY, 70, rowHeight)
                       .rect(col6X, currentY, 70, rowHeight)
                       .stroke();

                    doc.text(producto.cantidad.toString(), col1X + 15, currentY + 8)
                       .text('', col2X + 10, currentY + 8)
                       .text(producto.codigo || '', col3X + 5, currentY + 8)
                       .text(producto.nombre || '', col4X + 5, currentY + 8)
                       .text(`Q${producto.precio_unitario.toFixed(2)}`, col5X + 5, currentY + 8)
                       .text(`Q${subtotal.toFixed(2)}`, col6X + 5, currentY + 8);

                    currentY += rowHeight;
                });
            } else {
                // Filas vacías para mantener el formato
                for (let i = 0; i < 5; i++) {
                    doc.rect(col1X, currentY, 50, rowHeight)
                       .rect(col2X, currentY, 50, rowHeight)
                       .rect(col3X, currentY, 100, rowHeight)
                       .rect(col4X, currentY, 200, rowHeight)
                       .rect(col5X, currentY, 70, rowHeight)
                       .rect(col6X, currentY, 70, rowHeight)
                       .stroke();
                    currentY += rowHeight;
                }
            }

            // Sección de información adicional (lado derecho) - PARA NACIONAL
            const infoBoxX = 320;
            const infoBoxY = currentY + 20;
            const infoBoxWidth = 270;

            doc.rect(infoBoxX, infoBoxY, infoBoxWidth, 160)
               .stroke();

            doc.fontSize(10)
               .fillColor(secondaryColor)
               .text('LÍNEA NACIONAL - CONDICIONES ESTÁNDAR', infoBoxX + 10, infoBoxY + 5)
               .fillColor('#000000')
               .text('NOMBRE ____________________________', infoBoxX + 10, infoBoxY + 25)
               .text('FIRMA ______________________________', infoBoxX + 10, infoBoxY + 40)
               .text('REVISADO: ___________________________', infoBoxX + 10, infoBoxY + 55)
               .text('FECHA RECIBIDO: _____________________', infoBoxX + 10, infoBoxY + 70)
               .text('CARGO POR ENVÍO Q. __________________', infoBoxX + 10, infoBoxY + 85)
               .text('DESCUENTO NACIONAL', infoBoxX + 10, infoBoxY + 100)
               .text('DESCUENTO 0 A 30 DÍAS    -15%', infoBoxX + 20, infoBoxY + 115)
               .text('DESCUENTO 31 A 60 DÍAS   -10%', infoBoxX + 20, infoBoxY + 130)
               .text('DESCUENTO MÁS DE 60 DÍAS  -5%', infoBoxX + 20, infoBoxY + 145);

            doc.text('CARGO POR CHEQUE RECHAZADO Q. 75.00', infoBoxX + 10, infoBoxY + 165);

            // Total
            doc.fontSize(12)
               .fillColor('#000000')
               .text('TOTAL', 450, currentY + 200)
               .rect(520, currentY + 195, 70, 25)
               .stroke()
               .text(`Q${(datosEnvio.total || totalGeneral).toFixed(2)}`, 525, currentY + 202);

            // Nota especial para línea nacional
            doc.fontSize(10)
               .fillColor(secondaryColor)
               .text('* PRODUCTO NACIONAL - GARANTÍA ESTÁNDAR DE FÁBRICA', 50, currentY + 240)
               .text('* ENTREGA ESTIMADA: 1-3 DÍAS HÁBILES', 50, currentY + 255);

            // IMPORTANTE: Finalizar el documento para generar el buffer
            doc.end();

        } catch (error) {
            reject(error);
        }
    });
}

// POST - Crear envío nacional - CORREGIDO
router.post('/', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const { pedido_id, transporte, fecha_entrega_estimada, observaciones } = req.body;
        
        console.log('📦 Creando envío nacional para pedido:', pedido_id);
        
        if (!pedido_id) {
            return res.status(400).json({
                success: false,
                error: 'El ID del pedido es requerido'
            });
        }
        
        // QUERY CORREGIDA: Buscar pedidos de línea NACIONAL
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
            WHERE p.Id = $1 AND tlp.nombre = 'Linea Nacional'
            LIMIT 1
        `;
        
        const pedidoResult = await client.query(pedidoQuery, [pedido_id]);
        
        if (pedidoResult.rows.length === 0) {
            console.log('❌ Pedido no encontrado o no es línea nacional');
            return res.status(404).json({
                success: false,
                error: 'Pedido no encontrado o no pertenece a línea nacional'
            });
        }
        
        const datosPedido = pedidoResult.rows[0];
        console.log('✅ Datos del pedido:', datosPedido);
        
        // Generar número de envío
        const numeroEnvio = generarNumeroEnvio('NAL');
        
        // QUERY CORREGIDA: Obtener productos del pedido
        const productosQuery = `
            SELECT 
                dp.Cantidad,
                z.Codigo,
                z.Nombre,
                COALESCE(t.Talla_EU, 'N/A') as talla_eu,
                COALESCE(t.Talla_US, 'N/A') as talla_us,
                COALESCE(
                    dp.Precio_Unitario, 
                    z.precio_par,
                    100.00
                ) as precio_unitario
            FROM Detalle_Pedidos dp
            INNER JOIN Zapatos z ON dp.Id_Zapato = z.Id
            LEFT JOIN Zapatos_Tallas zt ON z.Id = zt.Id_Zapato
            LEFT JOIN Tallas t ON zt.Id_Talla = t.Id
            WHERE dp.Id_Pedido = $1
        `;
        
        const productosResult = await client.query(productosQuery, [pedido_id]);
        console.log('✅ Productos encontrados:', productosResult.rows.length);
        
        // Crear registro de envío
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
            fecha_entrega_estimada || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 días por defecto para nacional
            transporte || 'Por definir',
            numeroEnvio,
            numeroEnvio,
            observaciones || ''
        ]);
        
        const nuevoEnvio = envioResult.rows[0];
        console.log('✅ Envío creado:', nuevoEnvio.id);
        
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
        
        console.log('📄 Generando PDF...');
        
        // Generar PDF
        const pdfResult = await crearPDFEnvioNacional(datosEnvio);
        
        await client.query('COMMIT');
        
        console.log('✅ Envío nacional creado exitosamente');
        
        // Enviar el PDF como descarga directa
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${pdfResult.fileName}"`);
        res.setHeader('Content-Length', pdfResult.pdfBuffer.length);
        
        // Enviar el buffer del PDF directamente
        res.send(pdfResult.pdfBuffer);
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error al crear envío nacional:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            details: error.message
        });
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