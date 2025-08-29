<template>
  <div class="historial-facturas-container">
    <div class="historial-header">
      <h2>Historial de Ventas Global</h2>
      <div class="stats-summary" v-if="facturas.length > 0 && !loading">
        <div class="stat-item">
          <strong>{{ facturas.length }}</strong>
          <span>Ventas Registradas</span>
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
        
        <div class="filter-group">
          <label for="filtro-linea">Línea de Producto:</label>
          <select 
            id="filtro-linea"
            v-model="filtroLinea"
            @change="cargarFacturas"
            class="filter-input"
          >
            <option value="">Todas las líneas</option>
            <option value="Linea Nacional">Línea Nacional</option>
            <option value="Linea Importadora">Línea Importadora</option>
          </select>
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

      <div class="info-filtros" v-if="(filtroFecha || filtroCliente || filtroLinea) && !loading">
        <small>
          Mostrando {{ facturas.length }} facturas
          <span v-if="filtroFecha"> del {{ formatDate(filtroFecha) }}</span>
          <span v-if="filtroCliente"> con cliente "{{ filtroCliente }}"</span>
          <span v-if="filtroLinea"> de {{ filtroLinea }}</span>
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
      <!-- Vista de tabla para pantallas grandes -->
      <div class="table-wrapper desktop-view">
        <table class="facturas-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Pedido</th>
              <th>Cliente</th>
              <th>Fecha</th>
              <th>Línea</th>
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
                  #{{ factura.id_pedido || factura.Id_Pedido }}
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
              <td class="linea-cell">
                <span class="linea-badge" :class="getLineaClass(factura.tipo_linea_nombre)">
                  {{ factura.tipo_linea_nombre || 'Sin Línea' }}
                </span>
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
              <td colspan="8" class="no-data">
                <div class="no-data-content">
                  <div class="no-data-icon">📄</div>
                  <p>No se encontraron facturas</p>
                  <small v-if="filtroFecha || filtroCliente || filtroLinea">
                    Prueba ajustando los filtros de búsqueda
                  </small>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Vista de cards para móviles -->
      <div class="cards-view mobile-view">
        <div 
          v-for="factura in facturas" 
          :key="factura.id || factura.Id"
          class="factura-card"
          @click="seleccionarFactura(factura)"
          :class="{ 'selected': facturaSeleccionada?.id === factura.id }"
        >
          <div class="card-header">
            <div class="card-id">
              <strong>Factura #{{ factura.id || factura.Id }}</strong>
              <span class="pedido-badge">
                Pedido #{{ factura.id_pedido || factura.Id_Pedido }}
              </span>
            </div>
            <span :class="getEstadoClass(factura.estado || factura.Estado)">
              {{ factura.estado || factura.Estado || 'Pendiente' }}
            </span>
          </div>
          
          <div class="card-body">
            <div class="card-row">
              <span class="card-label">Cliente:</span>
              <span class="card-value">{{ factura.nombre_cliente }} {{ factura.apellido_cliente }}</span>
            </div>
            
            <div class="card-row">
              <span class="card-label">Fecha:</span>
              <span class="card-value">{{ formatDate(factura.fecha_pedido) }}</span>
            </div>
            
            <div class="card-row">
              <span class="card-label">Línea:</span>
              <span class="linea-badge" :class="getLineaClass(factura.tipo_linea_nombre)">
                {{ factura.tipo_linea_nombre || 'Sin Línea' }}
              </span>
            </div>
            
            <div class="card-amounts">
              <div class="amount-item total">
                <span class="amount-label">Total:</span>
                <span class="amount-value">Q{{ formatCurrency(factura.total || factura.Total) }}</span>
              </div>
            </div>
          </div>
          
          <div class="card-actions">
            <button 
              @click.stop="verDetalles(factura)"
              class="btn-accion ver-detalles"
            >
              Ver Detalles
            </button>
            <button 
              @click.stop="descargarFactura(factura)"
              class="btn-accion descargar"
            >
              Descargar PDF
            </button>
          </div>
        </div>

        <div v-if="facturas.length === 0 && !loading" class="no-data-mobile">
          <div class="no-data-content">
            <div class="no-data-icon">📄</div>
            <p>No se encontraron facturas</p>
            <small v-if="filtroFecha || filtroCliente">
              Prueba ajustando los filtros de búsqueda
            </small>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import '../styles/historialVentas.css';
export default {
  name: 'HistorialFacturas',
  data() {
    return {
      facturas: [],
      filtroFecha: '',
      filtroCliente: '',
      filtroLinea: '',
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

    getLineaClass(tipoLinea) {
      if (!tipoLinea) return 'linea-sin-datos';
      
      const lineaLower = tipoLinea.toLowerCase();
      if (lineaLower.includes('nacional')) {
        return 'linea-nacional';
      } else if (lineaLower.includes('importadora')) {
        return 'linea-importadora';
      }
      return 'linea-default';
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
        if (this.filtroLinea) params.append('linea', this.filtroLinea);

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
      this.filtroLinea = '';
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