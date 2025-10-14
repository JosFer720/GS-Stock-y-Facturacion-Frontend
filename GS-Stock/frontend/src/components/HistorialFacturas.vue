<template>
  <div class="historial-facturas-container">
    <div class="historial-header">
      <h2>Historial Ventas</h2>
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

    <div v-else>
      <!-- FILTROS -->
      <div class="filters-container">
        <div class="filters">
          <div class="filter-group">
            <label for="filter-date-historial">Filtrar por fecha:</label>
            <input 
              type="date" 
              id="filter-date-historial" 
              v-model="filters.date"
              class="filter-input"
            />
          </div>
          <div class="filter-group">
            <label for="filter-client-historial">Filtrar por cliente:</label>
            <input 
              v-model="filters.client" 
              id="filter-client-historial"
              placeholder="Nombre del cliente"
              class="filter-input"
            />
          </div>
          <div class="filter-actions">
            <button class="btn-filtrar" @click="applyFilters">Aplicar Filtros</button>
            <button class="btn-limpiar" @click="resetFilters">Restablecer</button>
          </div>
        </div>
      </div>

      <div class="table-container">
        <!-- Reuse VentasTabla to keep consistent format -->
        <ventas-tabla
          :sales="filteredSales"
          :estados-pedidos="estadosPedidos"
          :is-historial="true"
          @sale-selected="$emit('sale-selected', $event); $emit('factura-seleccionada', $event)"
          @status-updated="$emit('status-updated', $event)"
          @view-details="$emit('view-details', $event); $emit('ver-detalles', $event)"
          @download-envio="$emit('download-envio', $event); $emit('descargar-factura', $event)"
        />
      </div>
    </div>
  </div>
</template>

<script>
import '../styles/historialVentas.css';
import VentasTabla from '@/components/VentasTabla.vue';

export default {
  name: 'HistorialVentas',
  components: { VentasTabla },
  props: {
    estadosPedidos: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      facturas: [],
      loading: false,
      error: null,
      filters: {
        date: '',
        client: ''
      }
    };
  },
  computed: {
    mappedSales() {
      // Filtrar solo ventas con estado Despachado
      // Usar la misma estructura que viene del endpoint /api/ventas/pedidos
      return this.facturas
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
    },
    filteredSales() {
      let result = this.mappedSales;

      // Filtrar por fecha
      if (this.filters.date) {
        result = result.filter(sale => {
          const saleDate = new Date(sale.fecha).toISOString().split('T')[0];
          return saleDate === this.filters.date;
        });
      }

      // Filtrar por cliente
      if (this.filters.client) {
        const clientQuery = this.filters.client.toLowerCase();
        result = result.filter(sale => 
          sale.cliente_nombre?.toLowerCase().includes(clientQuery)
        );
      }

      return result;
    }
  },
  methods: {
    applyFilters() {
      // Los filtros se aplican automáticamente a través del computed
      console.log('Filtros aplicados:', this.filters);
    },
    resetFilters() {
      this.filters = {
        date: '',
        client: ''
      };
    },
    async cargarFacturas() {
      this.loading = true;
      this.error = null;
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
        this.facturas = data.data || [];
      } catch (e) {
        console.error('Error cargarFacturas', e);
        this.error = e.message || 'Error desconocido';
        this.facturas = [];
      } finally {
        this.loading = false;
      }
    }
  },
  mounted() {
    this.cargarFacturas();
  }
};
</script>