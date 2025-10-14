<template>
  <div class="sales-table-container">
    <div v-if="sales.length === 0" class="no-data-message">
      No hay ventas para mostrar
    </div>
    <div v-else class="table-wrapper">
      <table class="sales-table">
        <thead>
          <tr>
            <th>ID Pedido</th>
            <th>Cliente</th>
            <th>Empresa</th>
            <th>Línea</th>
            <th>Vendedor</th>
            <th>Fecha</th>
            <th>Estado</th>
            <th>Total</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr 
            v-for="sale in sales" 
            :key="sale.id"
            :class="{ 'selected-row': selectedSale && selectedSale.id === sale.id }"
            @click="selectSale(sale)"
          >
            <td class="id-cell">#{{ sale.id }}</td>
            <td class="cliente-cell">
              <div class="cliente-info">
                <strong>{{ sale.cliente_nombre || 'N/A' }}</strong>
              </div>
            </td>
            <td class="empresa-cell">
              <span class="empresa-badge">{{ sale.empresa || 'Sin empresa' }}</span>
            </td>
            <td class="linea-cell">{{ sale.tipo_linea_producto || 'N/D' }}</td>
            <td class="vendedor-cell">{{ sale.vendedor_nombre || 'N/A' }}</td>
            <td class="fecha-cell">{{ formatDate(sale.fecha) }}</td>
            <td class="estado-cell">
              <!-- Si es historial, solo mostrar el estado sin permitir cambios -->
              <span v-if="isHistorial" class="status-badge" :class="getStatusClass(sale.estado_pedido)">
                {{ sale.estado_pedido }}
              </span>
              <!-- Si NO es historial, mostrar select solo con Pendiente y Despachado -->
              <select 
                v-else
                v-model="sale.estado_pedido"
                @change="updateOrderStatus(sale)"
                class="status-select"
                :class="getStatusClass(sale.estado_pedido)"
                @click.stop
              >
                <option value="Pendiente">Pendiente</option>
                <option value="Despachado">Despachado</option>
              </select>
            </td>
            <td class="total-cell">
              <strong>Q{{ formatCurrency(sale.total) }}</strong>
            </td>
            <td class="actions-cell">
              <button 
                @click.stop="viewDetails(sale)"
                class="action-btn details-btn"
                title="Ver detalles"
              >
                👁️
              </button>
              <button
                @click.stop="downloadEnvio(sale)"
                class="action-btn pdf-btn"
                title="Generar PDF de Envío"
              >
                📄
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>
import { ref, defineEmits } from 'vue';

export default {
  name: 'VentasTabla',
  props: {
    sales: {
      type: Array,
      required: true,
      default: () => []
    },
    estadosPedidos: {
      type: Array,
      required: true,
      default: () => []
    },
    // Nueva prop para indicar si es el historial (solo lectura)
    isHistorial: {
      type: Boolean,
      default: false
    }
  },
  emits: ['sale-selected', 'status-updated', 'view-details', 'download-envio'],
  setup(props, { emit }) {
    const selectedSale = ref(null);

    const selectSale = (sale) => {
      selectedSale.value = sale;
      emit('sale-selected', sale);
    };

    const updateOrderStatus = async (sale) => {
      try {
        emit('status-updated', {
          pedido_id: sale.id, 
          nuevo_estado: sale.estado_pedido
        });
      } catch (error) {
        console.error('Error al actualizar estado:', error);
      }
    };

    const viewDetails = (sale) => {
      console.log('Ver detalles de venta:', sale.id);
      emit('view-details', sale);
    };

    const downloadEnvio = (sale) => {
      // Emit to parent to handle PDF generation/download
      emit('download-envio', sale);
    };

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

    const formatCurrency = (amount) => {
      if (!amount && amount !== 0) return '0.00';
      return parseFloat(amount).toFixed(2);
    };

    const getStatusClass = (status) => {
      if (!status) return 'status-default';
      
      const statusLower = status.toLowerCase();
      
      switch (statusLower) {
        case 'pendiente':
          return 'status-pending';
        case 'despachado':
          return 'status-completed';
        default:
          return 'status-default';
      }
    };

    return {
      selectedSale,
      selectSale,
      updateOrderStatus,
      viewDetails,
      downloadEnvio,
      formatDate,
      formatCurrency,
      getStatusClass
    };
  }
}
</script>

<style scoped src="./styles/ventasTable.css">

</style>