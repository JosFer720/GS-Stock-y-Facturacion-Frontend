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
          @view-details="$emit('view-details', $event); $emit('ver-detalles', $event)"
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
      previousPage,
      nextPage,
      applyFilters,
      resetFilters,
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
</style>