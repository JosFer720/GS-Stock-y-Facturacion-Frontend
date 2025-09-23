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

    <div v-else class="table-container">
      <!-- Reuse VentasTabla to keep consistent format -->
      <ventas-tabla
        :sales="mappedSales"
        :estados-pedidos="estadosPedidos"
        @sale-selected="$emit('sale-selected', $event); $emit('factura-seleccionada', $event)"
        @status-updated="$emit('status-updated', $event)"
        @view-details="$emit('view-details', $event); $emit('ver-detalles', $event)"
        @download-envio="$emit('download-envio', $event); $emit('descargar-factura', $event)"
      />
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
      error: null
    };
  },
  computed: {
    mappedSales() {
      // Map factura objects to the shape expected by VentasTabla
      return this.facturas.map(f => ({
        id: f.id || f.Id,
        id_pedido: f.id_pedido || f.Id_Pedido || f.pedido_id,
        cliente_nombre: `${f.nombre_cliente || f.nombre || ''}`.trim(),
        empresa: f.empresa || f.Empresa || '',
        tipo_linea_producto: f.tipo_linea_nombre || f.tipo_linea || f.tipo_linea_producto || '',
        vendedor_nombre: f.vendedor_nombre || f.vendedor || '',
        fecha: f.fecha_pedido || f.fecha || f.created_at || null,
        estado_pedido: f.estado || f.Estado || 'Pendiente',
        total: f.total || f.Total || 0
      }));
    }
  },
  methods: {
    async cargarFacturas() {
      this.loading = true;
      this.error = null;
      try {
        const token = localStorage.getItem('jwtToken');
        if (!token) throw new Error('No has iniciado sesión');

        const res = await fetch('http://localhost:3000/api/facturas', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Error al cargar facturas');
        }

        const data = await res.json();
        // API may return { data: [...] } or array directly
        this.facturas = Array.isArray(data) ? data : (data.data || []);
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