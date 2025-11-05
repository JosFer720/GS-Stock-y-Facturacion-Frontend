/**
 * Genera un HTML imprimible con la información del cliente y lo abre para imprimir como PDF
 * @param {Object} client - Objeto cliente con todos sus datos
 * @param {Array} accountsReceivable - Array de cuentas por cobrar del cliente
 * @returns {void} Abre ventana de impresión
 */
export function generateClientPDF(client, accountsReceivable = []) {
  try {
    const htmlContent = buildClientHTML(client, accountsReceivable);
    
    // Crear una nueva ventana
    const printWindow = window.open('', '', 'width=800,height=600');
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Esperar a que se cargue el contenido
    printWindow.onload = function() {
      printWindow.print();
    };
    
    return true;
  } catch (error) {
    console.error('Error generando PDF:', error);
    throw error;
  }
}

/**
 * Construye el HTML del documento del cliente
 * @param {Object} client - Datos del cliente
 * @param {Array} accountsReceivable - Cuentas por cobrar
 * @returns {string} HTML formateado
 */
function buildClientHTML(client, accountsReceivable = []) {
  const currentDate = new Date().toLocaleString('es-ES');
  
  const direccionesHTML = client.direcciones && client.direcciones.length > 0
    ? client.direcciones
        .map((dir, idx) => `<li>${idx + 1}. ${dir.direccion || '-'}</li>`)
        .join('')
    : '<li>Sin direcciones registradas</li>';
  
  const telefonosHTML = client.telefonos && client.telefonos.length > 0
    ? client.telefonos
        .map((tel, idx) => `<li>${idx + 1}. ${tel.telefono || '-'}</li>`)
        .join('')
    : '<li>Sin teléfonos registrados</li>';
  
  let tablaCuentasHTML = '';
  let totalPendiente = 0;
  
  if (accountsReceivable && accountsReceivable.length > 0) {
    const filas = accountsReceivable
      .map((pedido, idx) => {
        const saldoPendiente = parseFloat(pedido.saldo_pendiente || 0);
        totalPendiente += saldoPendiente;
        return `
          <tr style="background-color: ${idx % 2 === 0 ? '#f9f9f9' : '#ffffff'};">
            <td style="padding: 8px; border: 1px solid #ddd;">${pedido.id}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${formatDate(pedido.fecha)}</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">Q${formatCurrency(pedido.total_original || pedido.total)}</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">Q${formatCurrency(saldoPendiente)}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${pedido.estado_pago || 'Pendiente'}</td>
          </tr>
        `;
      })
      .join('');
    
    tablaCuentasHTML = `
      <h2 style="color: #333; font-size: 18px; margin-top: 20px; margin-bottom: 10px;">CUENTAS POR COBRAR (PENDIENTES)</h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead>
          <tr style="background-color: #2980b9; color: white;">
            <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">Pedido</th>
            <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">Fecha</th>
            <th style="padding: 12px; border: 1px solid #ddd; text-align: right;">Total</th>
            <th style="padding: 12px; border: 1px solid #ddd; text-align: right;">Saldo Pte.</th>
            <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">Estado</th>
          </tr>
        </thead>
        <tbody>
          ${filas}
        </tbody>
      </table>
      <div style="text-align: right; font-size: 16px; font-weight: bold; color: #c0392b; margin-bottom: 20px;">
        TOTAL PENDIENTE: Q${formatCurrency(totalPendiente)}
      </div>
    `;
  } else {
    tablaCuentasHTML = `
      <h2 style="color: #333; font-size: 18px; margin-top: 20px; margin-bottom: 10px;">CUENTAS POR COBRAR (PENDIENTES)</h2>
      <p style="color: #666;">No hay cuentas por cobrar pendientes</p>
    `;
  }
  
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Cliente - ${client.nombre} ${client.apellido}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          background-color: #f5f5f5;
          padding: 20px;
        }
        .container {
          max-width: 900px;
          margin: 0 auto;
          background-color: white;
          padding: 40px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        .header {
          text-align: center;
          border-bottom: 3px solid #2980b9;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .header h1 {
          color: #2980b9;
          font-size: 28px;
          margin-bottom: 5px;
        }
        .section {
          margin-bottom: 30px;
        }
        .section-title {
          background-color: #34495e;
          color: white;
          padding: 12px 15px;
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 15px;
          border-left: 4px solid #2980b9;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 20px;
        }
        .info-item {
          padding: 10px 0;
          border-bottom: 1px solid #ecf0f1;
        }
        .info-label {
          font-weight: bold;
          color: #2980b9;
          margin-bottom: 5px;
        }
        .info-value {
          color: #555;
        }
        ul {
          margin-left: 20px;
          color: #555;
        }
        ul li {
          margin-bottom: 8px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th {
          background-color: #2980b9;
          color: white;
          padding: 12px;
          text-align: left;
          font-weight: bold;
        }
        td {
          padding: 10px 12px;
          border: 1px solid #ecf0f1;
        }
        tr:nth-child(even) {
          background-color: #f9f9f9;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #ecf0f1;
          text-align: center;
          color: #888;
          font-size: 12px;
        }
        .total-pendiente {
          text-align: right;
          font-size: 18px;
          font-weight: bold;
          color: #c0392b;
          margin: 20px 0;
          padding: 15px;
          background-color: #fadbd8;
          border-left: 4px solid #c0392b;
        }
        @media print {
          body {
            background-color: white;
            padding: 0;
          }
          .container {
            box-shadow: none;
            max-width: 100%;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>INFORMACIÓN DEL CLIENTE</h1>
          <p style="color: #888; font-size: 14px;">Documento generado el ${currentDate}</p>
        </div>
        
        <div class="section">
          <div class="section-title">DATOS PERSONALES</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Nombre Completo:</div>
              <div class="info-value">${client.nombre || '-'} ${client.apellido || '-'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">ID Cliente:</div>
              <div class="info-value">${client.id}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Empresa:</div>
              <div class="info-value">${client.empresa || '-'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">NIT:</div>
              <div class="info-value">${client.nit || '-'}</div>
            </div>
          </div>
        </div>
        
        <div class="section">
          <div class="section-title">DIRECCIONES</div>
          <ul>${direccionesHTML}</ul>
        </div>
        
        <div class="section">
          <div class="section-title">TELÉFONOS</div>
          <ul>${telefonosHTML}</ul>
        </div>
        
        ${tablaCuentasHTML}
        
        <div class="footer">
          <p>Este documento fue generado automáticamente por el sistema GS-Stock</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Formatea una fecha al formato dd/mm/yyyy
 * @param {string} dateString - Fecha en formato ISO
 * @returns {string} Fecha formateada
 */
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Formatea un número como moneda
 * @param {number} amount - Cantidad a formatear
 * @returns {string} Cantidad formateada
 */
function formatCurrency(amount) {
  if (!amount && amount !== 0) return '0.00';
  return parseFloat(amount).toFixed(2);
}
