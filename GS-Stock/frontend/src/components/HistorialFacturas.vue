<template>
  <div class="historial-facturas-container">
    <div class="historial-header">
      <h2>Historial de Facturas</h2>
      <div class="stats-summary" v-if="facturas.length > 0 && !loading">
        <div class="stat-item">
          <strong>{{ facturas.length }}</strong>
          <span>Facturas</span>
        </div>
        <div class="stat-item">
          <strong>Q{{ totalFacturado }}</strong>
          <span>Total Facturado</span>
        </div>
      </div>
    </div>

    <div class="filters-container">
      <div class="filters">
        <div class="filter-group">
          <label for="filtro-fecha">Fecha:</label>
          <input 
            type="date" 
            id="filtro-fecha"
            v-model="filtroFecha"
            @change="cargarFacturas"
            class="filter-input"
          >
        </div>
        
        <div class="filter-group">
          <label for="filtro-cliente">Cliente:</label>
          <input 
            type="text" 
            id="filtro-cliente"
            v-model="filtroCliente" 
            @input="debounceSearch"
            placeholder="Buscar por nombre del cliente"
            class="filter-input"
          >
        </div>
        
        <div class="filter-actions">
          <button @click="cargarFacturas" class="btn-filtrar" :disabled="loading">
            Filtrar
          </button>
          <button @click="resetearFiltros" class="btn-limpiar">
            Limpiar
          </button>
        </div>
      </div>

      <div class="info-filtros" v-if="(filtroFecha || filtroCliente) && !loading">
        <small>
          Mostrando {{ facturas.length }} facturas
          <span v-if="filtroFecha"> del {{ formatDate(filtroFecha) }}</span>
          <span v-if="filtroCliente"> con cliente "{{ filtroCliente }}"</span>
        </small>
      </div>
    </div>

    <div v-if="loading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>Cargando facturas...</p>
    </div>

    <div v-else-if="error" class="error-container">
      <div class="error-icon">!</div>
      <p>{{ error }}</p>
      <button @click="cargarFacturas" class="btn-retry">Reintentar</button>
    </div>

    <div v-else class="table-container">
      <div class="table-wrapper">
        <table class="facturas-table">
          <thead>
            <tr>
              <th>ID Factura</th>
              <th>Pedido</th>
              <th>Cliente</th>
              <th>Fecha</th>
              <th>Subtotal</th>
              <th>Impuestos</th>
              <th>Total</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr 
              v-for="factura in facturas" 
              :key="factura.id || factura.Id"
              class="factura-row"
              @click="seleccionarFactura(factura)"
              :class="{ 'selected': facturaSeleccionada?.id === factura.id }"
            >
              <td class="id-cell">
                <strong>#{{ factura.id || factura.Id }}</strong>
              </td>
              <td class="pedido-cell">
                <span class="pedido-badge">
                  Pedido #{{ factura.id_pedido || factura.Id_Pedido }}
                </span>
              </td>
              <td class="cliente-cell">
                <div class="cliente-info">
                  <strong>{{ factura.nombre_cliente }} {{ factura.apellido_cliente }}</strong>
                </div>
              </td>
              <td class="fecha-cell">
                {{ formatDate(factura.fecha_pedido) }}
              </td>
              <td class="subtotal-cell">
                Q{{ formatCurrency(factura.subtotal || factura.Subtotal) }}
              </td>
              <td class="impuestos-cell">
                Q{{ formatCurrency(factura.impuestos || factura.Impuestos) }}
              </td>
              <td class="total-cell">
                <strong>Q{{ formatCurrency(factura.total || factura.Total) }}</strong>
              </td>
              <td class="estado-cell">
                <span :class="getEstadoClass(factura.estado || factura.Estado)">
                  {{ factura.estado || factura.Estado || 'Pendiente' }}
                </span>
              </td>
              <td class="acciones-cell">
                <button 
                  @click.stop="verDetalles(factura)"
                  class="btn-accion ver-detalles"
                  title="Ver detalles"
                >
                  Ver
                </button>
                <button 
                  @click.stop="descargarFactura(factura)"
                  class="btn-accion descargar"
                  title="Descargar factura"
                >
                  PDF
                </button>
              </td>
            </tr>
            
            <tr v-if="facturas.length === 0 && !loading" class="no-data-row">
              <td colspan="9" class="no-data">
                <div class="no-data-content">
                  <div class="no-data-icon">Sin datos</div>
                  <p>No se encontraron facturas</p>
                  <small v-if="filtroFecha || filtroCliente">
                    Prueba ajustando los filtros de búsqueda
                  </small>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'HistorialFacturas',
  data() {
    return {
      facturas: [],
      filtroFecha: '',
      filtroCliente: '',
      loading: false,
      error: null,
      searchTimeout: null,
      facturaSeleccionada: null
    };
  },
  computed: {
    totalFacturado() {
      return this.facturas.reduce((total, factura) => {
        const monto = parseFloat(factura.total || factura.Total || 0);
        return total + monto;
      }, 0).toFixed(2);
    }
  },
  methods: {
    formatDate(dateString) {
      if (!dateString) return 'N/A';
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    },
    
    formatCurrency(amount) {
      if (!amount && amount !== 0) return '0.00';
      return parseFloat(amount).toFixed(2);
    },
    
    getEstadoClass(estado) {
      if (!estado) return 'estado-pendiente';
      
      const estadoLower = estado.toLowerCase();
      switch(estadoLower) {
        case 'pagada':
        case 'pagado':
        case 'completada':
          return 'estado-pagada';
        case 'pendiente':
        case 'procesando':
          return 'estado-pendiente';
        case 'cancelada':
        case 'cancelado':
        case 'anulada':
          return 'estado-cancelada';
        case 'vencida':
          return 'estado-vencida';
        default:
          return 'estado-default';
      }
    },
    
    debounceSearch() {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = setTimeout(() => {
        this.cargarFacturas();
      }, 500);
    },
    
    async cargarFacturas() {
      this.loading = true;
      this.error = null;
      
      try {
        const params = new URLSearchParams();
        if (this.filtroFecha) params.append('fecha', this.filtroFecha);
        if (this.filtroCliente.trim()) params.append('cliente', this.filtroCliente.trim());

        const token = localStorage.getItem('jwtToken');
        if (!token) {
          throw new Error('No has iniciado sesión');
        }

        const response = await fetch(`http://localhost:3000/api/facturas?${params.toString()}`, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        this.facturas = Array.isArray(data) ? data : [];
        
        console.log('Facturas cargadas:', this.facturas.length);
        
      } catch (err) {
        this.error = 'Error al cargar las facturas: ' + err.message;
        console.error('Error al cargar facturas:', err);
        this.facturas = [];
      } finally {
        this.loading = false;
      }
    },
    
    resetearFiltros() {
      this.filtroFecha = '';
      this.filtroCliente = '';
      this.facturaSeleccionada = null;
      this.cargarFacturas();
    },

    seleccionarFactura(factura) {
      this.facturaSeleccionada = factura;
      this.$emit('factura-seleccionada', factura);
    },

    verDetalles(factura) {
      console.log('Ver detalles de factura:', factura);
      this.$emit('ver-detalles', factura);
    },

    descargarFactura(factura) {
      console.log('Descargar factura:', factura);
      this.$emit('descargar-factura', factura);
    }
  },
  
  mounted() {
    this.cargarFacturas();
  },

  beforeUnmount() {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
  }
};
</script>

<style scoped>
.historial-facturas-container {
  width: 100%;
  padding: 20px;
  background-color: #f8f9fa;
  border-radius: 12px;
  margin-top: 20px;
}

.historial-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
  padding-bottom: 15px;
  border-bottom: 2px solid #dee2e6;
}

.historial-header h2 {
  color: #2c3e50;
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}

.stats-summary {
  display: flex;
  gap: 20px;
}

.stat-item {
  text-align: center;
  padding: 10px 15px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.stat-item strong {
  display: block;
  font-size: 18px;
  color: #28a745;
  font-weight: 700;
}

.stat-item span {
  font-size: 12px;
  color: #6c757d;
  text-transform: uppercase;
}

.filters-container {
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.filters {
  display: flex;
  gap: 15px;
  align-items: end;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 200px;
  flex: 1;
}

.filter-group label {
  font-weight: 600;
  color: #495057;
  font-size: 14px;
}

.filter-input {
  padding: 10px 12px;
  border: 2px solid #e9ecef;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.3s ease;
}

.filter-input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

.filter-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.btn-filtrar, .btn-limpiar, .btn-retry {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.btn-filtrar {
  background-color: #28a745;
  color: white;
}

.btn-filtrar:hover:not(:disabled) {
  background-color: #218838;
  transform: translateY(-1px);
}

.btn-filtrar:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

.btn-limpiar {
  background-color: #6c757d;
  color: white;
}

.btn-limpiar:hover {
  background-color: #5a6268;
  transform: translateY(-1px);
}

.btn-retry {
  background-color: #dc3545;
  color: white;
}

.btn-retry:hover {
  background-color: #c82333;
}

.info-filtros {
  margin-top: 15px;
  padding: 10px;
  background-color: #e3f2fd;
  border-radius: 6px;
  color: #1565c0;
  font-style: italic;
}

.loading-container, .error-container {
  text-align: center;
  padding: 60px 20px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-container {
  color: #dc3545;
}

.error-icon {
  font-size: 48px;
  margin-bottom: 15px;
  color: #dc3545;
  font-weight: bold;
}

.table-container {
  background-color: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}

.table-wrapper {
  overflow-x: auto;
}

.facturas-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 1000px;
}

.facturas-table th {
  background-color: #343a40;
  color: white;
  padding: 15px 12px;
  text-align: left;
  font-weight: 600;
  font-size: 14px;
  border-bottom: 2px solid #495057;
  position: sticky;
  top: 0;
  z-index: 10;
}

.facturas-table td {
  padding: 12px;
  border-bottom: 1px solid #dee2e6;
  vertical-align: middle;
}

.factura-row {
  cursor: pointer;
  transition: all 0.2s ease;
}

.factura-row:hover {
  background-color: #f8f9fa;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.factura-row.selected {
  background-color: #e3f2fd;
  border-left: 4px solid #2196f3;
}

.id-cell strong {
  color: #495057;
  font-size: 14px;
}

.pedido-badge {
  display: inline-block;
  padding: 4px 8px;
  background-color: #17a2b8;
  color: white;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
}

.cliente-info strong {
  color: #2c3e50;
  font-size: 14px;
}

.fecha-cell {
  color: #6c757d;
  font-size: 13px;
}

.subtotal-cell, .impuestos-cell {
  text-align: right;
  color: #495057;
  font-weight: 500;
}

.total-cell {
  text-align: right;
  color: #28a745;
  font-size: 15px;
}

.total-cell strong {
  font-weight: 700;
}

.acciones-cell {
  text-align: center;
  white-space: nowrap;
}

.btn-accion {
  background: none;
  border: 1px solid #dee2e6;
  padding: 6px 12px;
  margin: 0 2px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 12px;
  font-weight: 600;
  color: #333;
  background-color: #fff;
}

.ver-detalles:hover {
  background-color: #007bff;
  border-color: #007bff;
  color: white;
}

.descargar:hover {
  background-color: #28a745;
  border-color: #28a745;
  color: white;
}

.ver-detalles {
  color: #007bff;
  border-color: #007bff;
}

.descargar {
  color: #28a745;
  border-color: #28a745;
}

/* Estados */
.estado-pagada {
  background-color: #28a745;
  color: white;
  padding: 6px 12px;
  border-radius: 15px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.estado-pendiente {
  background-color: #ffc107;
  color: #212529;
  padding: 6px 12px;
  border-radius: 15px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.estado-cancelada {
  background-color: #dc3545;
  color: white;
  padding: 6px 12px;
  border-radius: 15px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.estado-vencida {
  background-color: #fd7e14;
  color: white;
  padding: 6px 12px;
  border-radius: 15px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.estado-default {
  background-color: #6c757d;
  color: white;
  padding: 6px 12px;
  border-radius: 15px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.no-data-row td {
  padding: 60px 20px;
}

.no-data-content {
  text-align: center;
  color: #6c757d;
}

.no-data-icon {
  font-size: 18px;
  margin-bottom: 15px;
  font-weight: bold;
  color: #adb5bd;
}

.no-data-content p {
  font-size: 18px;
  margin: 10px 0;
  font-weight: 500;
}

.no-data-content small {
  color: #adb5bd;
}

/* Responsive Design */
@media (max-width: 1200px) {
  .stats-summary {
    flex-direction: column;
    gap: 10px;
  }
  
  .filters {
    flex-direction: column;
    align-items: stretch;
  }
  
  .filter-group {
    min-width: unset;
  }
  
  .facturas-table {
    min-width: 900px;
  }
}

@media (max-width: 768px) {
  .historial-facturas-container {
    padding: 15px;
  }
  
  .historial-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }
  
  .stats-summary {
    width: 100%;
    flex-direction: row;
    justify-content: space-around;
  }
  
  .filters-container {
    padding: 15px;
  }
  
  .filter-actions {
    width: 100%;
    justify-content: space-between;
  }
  
  .facturas-table {
    min-width: 800px;
    font-size: 14px;
  }
  
  .facturas-table th,
  .facturas-table td {
    padding: 8px 6px;
  }
  
  .btn-accion {
    padding: 4px 8px;
    font-size: 11px;
  }
}

@media (max-width: 576px) {
  .historial-facturas-container {
    padding: 10px;
  }
  
  .historial-header h2 {
    font-size: 20px;
  }
  
  .stats-summary {
    flex-direction: column;
    gap: 8px;
  }
  
  .stat-item {
    padding: 8px 12px;
  }
  
  .stat-item strong {
    font-size: 16px;
  }
  
  .facturas-table {
    min-width: 700px;
    font-size: 12px;
  }
  
  .facturas-table th,
  .facturas-table td {
    padding: 6px 4px;
  }
  
  .loading-container,
  .error-container {
    padding: 40px 15px;
  }
  
  .no-data-row td {
    padding: 40px 15px;
  }
  
  .btn-filtrar,
  .btn-limpiar {
    padding: 8px 16px;
    font-size: 12px;
  }
}
</style>