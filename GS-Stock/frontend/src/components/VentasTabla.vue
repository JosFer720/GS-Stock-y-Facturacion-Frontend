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
            <th>Vendedor</th>
            <th>Fecha</th>
            <th>Método Pago</th>
            <th>Productos</th>
            <th>Estado</th>
            <th>Subtotal</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          <tr 
            v-for="sale in sales" 
            :key="sale.pedido_id"
            :class="{ 'selected-row': selectedSale && selectedSale.pedido_id === sale.pedido_id }"
            @click="selectSale(sale)"
          >
            <td>{{ sale.pedido_id }}</td>
            <td>{{ sale.cliente }}</td>
            <td>{{ sale.vendedor }}</td>
            <td>{{ formatDate(sale.fecha) }}</td>
            <td>{{ sale.metodo_pago }}</td>
            <td>
              <div class="products-list">
                <div 
                  v-for="(product, index) in sale.productos" 
                  :key="index"
                  class="product-item"
                >
                  {{ product.zapato }} ({{ product.cantidad }})
                </div>
              </div>
            </td>
            <td>
              <select 
                v-model="sale.estado_pedido"
                @change="updateOrderStatus(sale)"
                class="status-select"
                :class="getStatusClass(sale.estado_pedido)"
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
            <td>${{ formatCurrency(sale.subtotal) }}</td>
            <td class="total-cell">${{ formatCurrency(sale.total) }}</td>
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
  emits: ['sale-selected', 'status-updated'],
  setup(props, { emit }) {
    const selectedSale = ref(null);

    const selectSale = (sale) => {
      selectedSale.value = sale;
      emit('sale-selected', sale);
    };

    const updateOrderStatus = async (sale) => {
      try {
        emit('status-updated', {
          pedido_id: sale.pedido_id,
          nuevo_estado: sale.estado_pedido
        });
      } catch (error) {
        console.error('Error al actualizar estado:', error);
      }
    };

    const formatDate = (dateString) => {
      if (!dateString) return 'N/A';
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    };

    const formatCurrency = (amount) => {
      if (!amount) return '0.00';
      return parseFloat(amount).toFixed(2);
    };

    const getStatusClass = (status) => {
      switch (status?.toLowerCase()) {
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
      formatDate,
      formatCurrency,
      getStatusClass
    };
  }
}
</script>

<style scoped>
.sales-table-container {
  width: 100%;
  overflow-x: auto;
}

.no-data-message {
  text-align: center;
  padding: 40px 20px;
  color: #666;
  font-style: italic;
  font-size: 16px;
}

.table-wrapper {
  width: 100%;
  overflow-x: auto;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.sales-table {
  width: 100%;
  border-collapse: collapse;
  background-color: white;
  min-width: 800px;
}

.sales-table th,
.sales-table td {
  padding: 12px 8px;
  text-align: left;
  border-bottom: 1px solid #ddd;
  vertical-align: top;
}

.sales-table th {
  background-color: #f8f9fa;
  font-weight: bold;
  color: #333;
  font-size: 14px;
  border-bottom: 2px solid #dee2e6;
  position: sticky;
  top: 0;
  z-index: 10;
}

.sales-table tbody tr {
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.sales-table tbody tr:hover {
  background-color: #f5f5f5;
}

.selected-row {
  background-color: #e3f2fd !important;
  border-left: 4px solid #2196F3;
}

.selected-row:hover {
  background-color: #e3f2fd !important;
}

.products-list {
  max-width: 200px;
}

.product-item {
  font-size: 13px;
  margin-bottom: 2px;
  padding: 2px 4px;
  background-color: #f8f9fa;
  border-radius: 3px;
  display: inline-block;
  margin-right: 4px;
}

.total-cell {
  font-weight: bold;
  color: #2e7d32;
}

/* Status badges */
.status-completed {
  background-color: #4caf50;
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
}

.status-pending {
  background-color: #ff9800;
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
}

.status-cancelled {
  background-color: #f44336;
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
}

.status-processing {
  background-color: #2196f3;
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
}

.status-default {
  background-color: #9e9e9e;
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
}

/* Responsive design */
@media (max-width: 768px) {
  .sales-table th,
  .sales-table td {
    padding: 8px 4px;
    font-size: 13px;
  }
  
  .products-list {
    max-width: 150px;
  }
  
  .product-item {
    font-size: 11px;
  }
}

@media (max-width: 576px) {
  .sales-table {
    font-size: 12px;
  }
  
  .sales-table th,
  .sales-table td {
    padding: 6px 3px;
  }
  
  .products-list {
    max-width: 120px;
  }
}

.status-select {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
  border: 1px solid #ddd;
  cursor: pointer;
  background-color: white;
}

.status-completed {
  background-color: #4caf50;
  color: white;
}

.status-pending {
  background-color: #ff9800;
  color: white;
}

.status-cancelled {
  background-color: #f44336;
  color: white;
}

.status-processing {
  background-color: #2196f3;
  color: white;
}

.status-default {
  background-color: #9e9e9e;
  color: white;
}
</style>