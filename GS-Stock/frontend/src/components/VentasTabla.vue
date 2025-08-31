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
            <th>Vendedor</th>
            <th>Fecha</th>
            <th>Método Pago</th>
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
            <td class="vendedor-cell">{{ sale.vendedor_nombre || 'N/A' }}</td>
            <td class="fecha-cell">{{ formatDate(sale.fecha) }}</td>
            <td class="metodo-cell">
              <span class="metodo-badge">{{ sale.metodo_pago || 'N/A' }}</span>
            </td>
            <td class="estado-cell">
              <select 
                v-model="sale.estado_pedido"
                @change="updateOrderStatus(sale)"
                class="status-select"
                :class="getStatusClass(sale.estado_pedido)"
                @click.stop
              >
                <option 
                  v-for="estado in estadosPedidos" 
                  :key="estado.id" 
                  :value="estado.estado"
                >
                  {{ estado.estado }}
                </option>
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
    }
  },
  emits: ['sale-selected', 'status-updated', 'view-details'],
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
      emit('view-details', sale);
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
      
      switch (status.toLowerCase()) {
        case 'completado':
        case 'entregado':
          return 'status-completed';
        case 'en bodega':
        case 'pendiente':
          return 'status-pending';
        case 'cancelado':
          return 'status-cancelled';
        case 'procesando':
        case 'empacado':
        case 'en ruta':
          return 'status-processing';
        default:
          return 'status-default';
      }
    };

    return {
      selectedSale,
      selectSale,
      updateOrderStatus,
      viewDetails,
      formatDate,
      formatCurrency,
      getStatusClass
    };
  }
}
</script>

<style scoped src="./styles/ventasTable.css">

</style>