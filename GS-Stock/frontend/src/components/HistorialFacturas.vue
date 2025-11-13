<template>
  <div class="historial-facturas-container">
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>Cargando ventas despachadas...</p>
    </div>

    <div v-else-if="error" class="error-container">
      <div class="error-icon">!</div>
      <p>{{ error }}</p>
      <button @click="cargarFacturas" class="btn-retry">Reintentar</button>
    </div>

    <div v-else>
      <!-- BOTÓN ACTUALIZAR LISTA -->
      <div class="actions-section">
        <button class="action-button refresh-button" @click="cargarFacturas">
          Actualizar Lista
        </button>
      </div>

      <!-- FILTROS - MISMO ESTILO QUE SALES MANAGEMENT -->
      <div class="filter-section">
        <div class="filter-group">
          <label for="filter-date-historial">Filtrar por fecha:</label>
          <input 
            type="date" 
            id="filter-date-historial" 
            v-model="filters.date"
          />
        </div>
        <div class="filter-group">
          <label for="filter-client-historial">Filtrar por cliente:</label>
          <input 
            v-model="filters.client" 
            id="filter-client-historial"
            placeholder="Nombre del cliente"
          />
        </div>
        <div class="filter-buttons">
          <button class="filter-button" @click="applyFilters">Aplicar Filtros</button>
          <button class="filter-button reset" @click="resetFilters">Restablecer</button>
        </div>
      </div>

      <!-- TÍTULO CON CONTADOR -->
      <h2 class="list-title">Lista de Ventas Despachadas ({{ paginatedSales.length }})</h2>

      <div class="table-container">
        <!-- Reuse VentasTabla to keep consistent format -->
        <ventas-tabla
          :sales="paginatedSales"
          :estados-pedidos="estadosPedidos"
          :is-historial="true"
          @sale-selected="$emit('sale-selected', $event); $emit('factura-seleccionada', $event)"
          @status-updated="$emit('status-updated', $event)"
          @view-details="handleViewDetails"
          @download-envio="$emit('download-envio', $event); $emit('descargar-factura', $event)"
        />
      </div>

      <!-- PAGINACIÓN - MISMO ESTILO QUE SALES MANAGEMENT -->
      <div class="pagination" v-if="filteredSales.length > 0">
        <button @click="previousPage" :disabled="currentPage === 1" class="pagination-nav">‹</button>

        <div class="page-numbers">
          <button
            v-for="pageNum in displayedPageNumbers"
            :key="pageNum"
            @click="currentPage = pageNum"
            :class="{ active: currentPage === pageNum }"
          >
            {{ pageNum }}
          </button>
        </div>

        <button @click="nextPage" :disabled="currentPage === totalPages" class="pagination-nav">›</button>
      </div>
    </div>

    <!-- MODAL DE DETALLES - IGUAL QUE EN GESTIÓN DE VENTAS -->
    <div v-if="showDetailsModal" class="modal">
      <div class="modal-content details-modal">
        <span class="close" @click="showDetailsModal = false">&times;</span>
        <h2>Detalles de la Venta</h2>
        <div v-if="selectedSale" class="sale-details">
          <div class="detail-section">
            <h3>Información General</h3>
            <p><strong>ID Pedido:</strong> #{{ selectedSale.id }}</p>
            <p><strong>Cliente:</strong> {{ selectedSale.cliente_nombre }}</p>
            <p><strong>Vendedor:</strong> {{ selectedSale.vendedor_nombre }}</p>
            <p><strong>Fecha:</strong> {{ formatDate(selectedSale.fecha) }}</p>
            <p><strong>Estado:</strong> {{ selectedSale.estado_pedido }}</p>
            <p><strong>Línea de Producto:</strong> {{ selectedSale.tipo_linea_producto }}</p>
          </div>
          
          <div class="detail-section">
            <h3>Productos del Pedido</h3>
            <div v-if="loadingDetails" class="loading-products">
              Cargando productos...
            </div>
            <div v-else-if="saleProducts.length > 0" class="products-list">
              <div v-for="product in saleProducts" :key="product.id" class="product-item">
                <div class="product-header">
                  <h4>{{ product.codigo }} - {{ product.nombre }}</h4>
                  <span class="product-price">Q{{ formatCurrency(product.precio_par) }}</span>
                  <span class="product-linea" v-if="product.tipo_linea">{{ product.tipo_linea }}</span>
                </div>
                <div class="tallas-info">
                  <div v-for="talla in product.tallas" :key="talla.id" class="talla-item">
                    <span class="talla-detail">
                      <strong>Talla:</strong> EU {{ talla.talla_eu }} / US {{ talla.talla_us }}
                      <strong>Cantidad:</strong> {{ talla.cantidad }}
                      <strong>Subtotal:</strong> Q{{ formatCurrency(talla.cantidad * product.precio_par) }}
                    </span>
                  </div>
                </div>
                <div class="product-total">
                  <strong>Total Producto: Q{{ formatCurrency(product.subtotal) }}</strong>
                </div>
              </div>
            </div>
            <div v-else class="no-products">
              No se encontraron productos para este pedido
            </div>
          </div>
          
          <div class="detail-section">
            <h3>Totales</h3>
            <div class="totals-breakdown">
              <p><strong>Subtotal Productos:</strong> Q{{ formatCurrency(calculateProductsSubtotal()) }}</p>
              <p class="total-final"><strong>TOTAL PEDIDO:</strong> Q{{ formatCurrency(selectedSale.total) }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import '../styles/historialVentas.css';
import VentasTabla from '@/components/VentasTabla.vue';
import { ref, computed } from 'vue';

export default {
  name: 'HistorialVentas',
  components: { VentasTabla },
  props: {
    estadosPedidos: {
      type: Array,
      default: () => []
    }
  },
  setup(props, { emit }) {
    const facturas = ref([]);
    const loading = ref(false);
    const error = ref(null);
    const filters = ref({
      date: '',
      client: ''
    });

    // Estado para el modal de detalles
    const showDetailsModal = ref(false);
    const selectedSale = ref(null);
    const saleProducts = ref([]);
    const loadingDetails = ref(false);

    // Paginación
    const currentPage = ref(1);
    const perPage = ref(10);

    const mappedSales = computed(() => {
      // Filtrar solo ventas con estado Despachado
      // Usar la misma estructura que viene del endpoint /api/ventas/pedidos
      return facturas.value
        .filter(venta => {
          const estado = (venta.estado_pedido || '').toLowerCase();
          return estado === 'despachado';
        })
        .map(venta => ({
          id: venta.id,
          cliente_nombre: venta.cliente_nombre || 'N/A',
          empresa: venta.empresa || '',
          tipo_linea_producto: venta.tipo_linea_producto || '',
          vendedor_nombre: venta.vendedor_nombre || '',
          fecha: venta.fecha,
          estado_pedido: venta.estado_pedido || 'Pendiente',
          total: venta.total || 0
        }));
    });

    const filteredSales = computed(() => {
      let result = mappedSales.value;

      // Filtrar por fecha
      if (filters.value.date) {
        result = result.filter(sale => {
          const saleDate = new Date(sale.fecha).toISOString().split('T')[0];
          return saleDate === filters.value.date;
        });
      }

      // Filtrar por cliente
      if (filters.value.client) {
        const clientQuery = filters.value.client.toLowerCase();
        result = result.filter(sale => 
          sale.cliente_nombre?.toLowerCase().includes(clientQuery)
        );
      }

      return result;
    });

    // Ventas paginadas
    const paginatedSales = computed(() => {
      const start = (currentPage.value - 1) * perPage.value;
      const end = start + perPage.value;
      return filteredSales.value.slice(start, end);
    });

    // Total de páginas
    const totalPages = computed(() => {
      return Math.max(1, Math.ceil(filteredSales.value.length / perPage.value));
    });

    // Números de página a mostrar
    const displayedPageNumbers = computed(() => {
      const maxVisibleButtons = 5;
      const tp = totalPages.value;

      if (tp <= maxVisibleButtons) {
        return Array.from({ length: tp }, (_, i) => i + 1);
      }

      let start = Math.max(1, currentPage.value - Math.floor(maxVisibleButtons / 2));
      const end = Math.min(tp, start + maxVisibleButtons - 1);

      if (end === tp) {
        start = Math.max(1, tp - maxVisibleButtons + 1);
      }

      return Array.from({ length: end - start + 1 }, (_, i) => start + i);
    });

    const previousPage = () => {
      if (currentPage.value > 1) {
        currentPage.value--;
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };

    const nextPage = () => {
      if (currentPage.value < totalPages.value) {
        currentPage.value++;
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };

    const applyFilters = () => {
      // Los filtros se aplican automáticamente a través del computed
      console.log('Filtros aplicados:', filters.value);
      currentPage.value = 1; // Reset a primera página al filtrar
    };

    const resetFilters = () => {
      filters.value = {
        date: '',
        client: ''
      };
      currentPage.value = 1; // Reset a primera página
    };

    // Función para formatear fecha
    const formatDate = (dateString) => {
      if (!dateString) return 'N/A';
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    // Función para formatear moneda
    const formatCurrency = (amount) => {
      if (!amount && amount !== 0) return '0.00';
      return parseFloat(amount).toFixed(2);
    };

    // Función para calcular subtotal de productos
    const calculateProductsSubtotal = () => {
      return saleProducts.value.reduce((total, product) => {
        return total + (product.subtotal || 0);
      }, 0);
    };

    // Función para manejar la vista de detalles
    const handleViewDetails = async (sale) => {
      try {
        selectedSale.value = sale;
        showDetailsModal.value = true;
        loadingDetails.value = true;
        saleProducts.value = [];
        
        console.log('Cargando detalles del pedido:', sale.id);
        
        const token = localStorage.getItem('jwtToken');
        
        const response = await fetch(`/api/ventas/pedidos/${sale.id}/productos`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Productos del pedido cargados:', data);
        
        saleProducts.value = data.productos || [];
        loadingDetails.value = false;
        
      } catch (error) {
        console.error('Error al cargar detalles del pedido:', error);
        loadingDetails.value = false;
        // También emitir al padre por si acaso
        emit('view-details', sale);
        emit('ver-detalles', sale);
      }
    };

    const cargarFacturas = async () => {
      loading.value = true;
      error.value = null;
      try {
        const token = localStorage.getItem('jwtToken');
        if (!token) throw new Error('No has iniciado sesión');

        // USAR EL MISMO ENDPOINT QUE GESTIÓN DE VENTAS
        const res = await fetch('/api/ventas/pedidos', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Error al cargar ventas');
        }

        const data = await res.json();
        // API devuelve { data: [...] }
        facturas.value = data.data || [];
      } catch (e) {
        console.error('Error cargarFacturas', e);
        error.value = e.message || 'Error desconocido';
        facturas.value = [];
      } finally {
        loading.value = false;
      }
    };

    return {
      facturas,
      loading,
      error,
      filters,
      currentPage,
      perPage,
      mappedSales,
      filteredSales,
      paginatedSales,
      totalPages,
      displayedPageNumbers,
      showDetailsModal,
      selectedSale,
      saleProducts,
      loadingDetails,
      previousPage,
      nextPage,
      applyFilters,
      resetFilters,
      formatDate,
      formatCurrency,
      calculateProductsSubtotal,
      handleViewDetails,
      cargarFacturas
    };
  },
  mounted() {
    this.cargarFacturas();
  }
};
</script>

<style scoped>
/* Importar los mismos estilos de Sales Management */
@import '../styles/salesManagment.css';

/* Ajustes específicos para el contenedor de historial */
.historial-facturas-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 15px;
  box-sizing: border-box;
}

/* Forzar centrado de actions-section */
.actions-section {
  margin: 20px auto;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: min(800px, 100vw - 30px);
  gap: 0px;
  box-sizing: border-box;
}

.action-button {
  margin-bottom: 3px;
}

/* Forzar centrado de filter-section */
.filter-section {
  margin-bottom: 20px;
  margin-left: auto;
  margin-right: auto;
  width: 100%;
  max-width: min(800px, 100vw - 30px);
  display: flex;
  flex-direction: column;
  gap: 15px;
  padding: 20px;
  background-color: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #dee2e6;
  box-sizing: border-box;
}

/* Forzar centrado del título */
.list-title {
  margin: 20px auto;
  font-size: clamp(18px, 4vw, 20px);
  font-weight: bold;
  text-align: center;
  width: 100%;
  max-width: min(800px, 100vw - 30px);
  color: #333;
  word-wrap: break-word;
}

.loading-container,
.error-container {
  text-align: center;
  padding: 60px 20px;
  width: 100%;
  max-width: min(600px, 100vw - 30px);
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

.btn-retry {
  background-color: #dc3545;
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  margin-top: 15px;
}

.btn-retry:hover {
  background-color: #c82333;
}

.table-container {
  width: 100%;
  max-width: min(1200px, 100vw - 30px);
  margin: 0 auto;
}

/* Forzar centrado de paginación */
.pagination {
  margin: 20px auto;
  display: flex;
  gap: 4px;
  justify-content: center;
  align-items: center;
  width: 100%;
  max-width: min(800px, 100vw - 30px);
}

/* Estilos para el modal de detalles */
.modal {
  display: flex;
  position: fixed;
  z-index: 1000;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0,0,0,0.5);
  align-items: center;
  justify-content: center;
}

.modal-content {
  background-color: #fefefe;
  padding: 20px;
  border-radius: 8px;
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
}

.details-modal {
  padding: 30px;
}

.close {
  color: #aaa;
  float: right;
  font-size: 28px;
  font-weight: bold;
  position: absolute;
  right: 15px;
  top: 10px;
  cursor: pointer;
}

.close:hover {
  color: #000;
}

.sale-details {
  margin-top: 20px;
}

.detail-section {
  margin-bottom: 30px;
  padding: 20px;
  background-color: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #007bff;
}

.detail-section h3 {
  margin-top: 0;
  color: #333;
  border-bottom: 1px solid #dee2e6;
  padding-bottom: 10px;
}

.products-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.product-item {
  padding: 15px;
  background-color: white;
  border-radius: 6px;
  border: 1px solid #dee2e6;
}

.product-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  flex-wrap: wrap;
  gap: 10px;
}

.product-header h4 {
  margin: 0;
  color: #333;
}

.product-price {
  font-weight: bold;
  color: #28a745;
}

.product-linea {
  background-color: #e9ecef;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.9em;
}

.tallas-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 10px;
}

.talla-item {
  padding: 8px;
  background-color: #f8f9fa;
  border-radius: 4px;
}

.talla-detail {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
}

.product-total {
  text-align: right;
  padding-top: 10px;
  border-top: 1px solid #dee2e6;
  color: #333;
}

.totals-breakdown {
  text-align: right;
}

.total-final {
  font-size: 1.2em;
  color: #28a745;
  margin-top: 10px;
}

.loading-products {
  text-align: center;
  padding: 20px;
  color: #666;
}

.no-products {
  text-align: center;
  padding: 20px;
  color: #666;
  font-style: italic;
}

/* Responsive */
@media (min-width: 768px) and (max-width: 1024px) {
  .filter-section {
    flex-direction: row;
    align-items: flex-end;
    gap: 20px;
  }
  
  .filter-group {
    flex: 1;
    min-width: 200px;
  }
  
  .filter-buttons {
    flex-direction: row;
    margin-top: 0;
    align-items: flex-end;
    flex: 0 0 auto;
  }
  
  .filter-button {
    min-width: 120px;
    width: auto;
  }
}

@media (min-width: 1024px) {
  .filter-section {
    flex-direction: row;
    align-items: flex-end;
    gap: 20px;
  }
  
  .filter-group {
    flex: 1;
    min-width: 200px;
  }
  
  .filter-buttons {
    flex-direction: row;
    margin-top: 0;
    align-items: flex-end;
    flex: 0 0 auto;
  }
  
  .filter-button {
    min-width: 120px;
    width: auto;
  }
}

@media (max-width: 768px) {
  .modal-content {
    width: 95%;
    padding: 15px;
  }
  
  .details-modal {
    padding: 20px;
  }
  
  .product-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .talla-detail {
    flex-direction: column;
    gap: 5px;
  }
}
</style>
