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

<style scoped>
.sales-table-container {
  width: 100%;
  overflow-x: auto;
  background-color: #f8f9fa;
  border-radius: 8px;
  padding: 10px;
}

.no-data-message {
  text-align: center;
  padding: 60px 20px;
  color: #6c757d;
  font-style: italic;
  font-size: 18px;
  background-color: white;
  border-radius: 8px;
  border: 2px dashed #dee2e6;
}

.table-wrapper {
  width: 100%;
  overflow-x: auto;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  background-color: white;
}

.sales-table {
  width: 100%;
  border-collapse: collapse;
  background-color: white;
  min-width: 1000px;
}

.sales-table th,
.sales-table td {
  padding: 12px 10px;
  text-align: left;
  border-bottom: 1px solid #dee2e6;
  vertical-align: middle;
}

.sales-table th {
  background-color: #343a40;
  color: white;
  font-weight: 600;
  font-size: 14px;
  border-bottom: 2px solid #495057;
  position: sticky;
  top: 0;
  z-index: 10;
}

.sales-table tbody tr {
  cursor: pointer;
  transition: all 0.2s ease;
}

.sales-table tbody tr:hover {
  background-color: #f8f9fa;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.selected-row {
  background-color: #e3f2fd !important;
  border-left: 4px solid #2196F3;
}

.selected-row:hover {
  background-color: #e3f2fd !important;
}

.id-cell {
  font-weight: bold;
  color: #495057;
  font-size: 14px;
  width: 80px;
}

.cliente-cell {
  min-width: 150px;
}

.cliente-info strong {
  color: #2c3e50;
  font-size: 14px;
}

.empresa-cell {
  min-width: 120px;
}

.empresa-badge {
  display: inline-block;
  padding: 4px 8px;
  background-color: #6c757d;
  color: white;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
}

.vendedor-cell {
  min-width: 130px;
  color: #495057;
  font-weight: 500;
}

.fecha-cell {
  min-width: 120px;
  color: #6c757d;
  font-size: 13px;
}

.metodo-cell {
  min-width: 100px;
}

.metodo-badge {
  display: inline-block;
  padding: 4px 8px;
  background-color: #17a2b8;
  color: white;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 500;
}

.estado-cell {
  min-width: 130px;
}

.total-cell {
  min-width: 100px;
  text-align: right;
  color: #28a745;
  font-size: 15px;
}

.actions-cell {
  width: 60px;
  text-align: center;
}

.action-btn {
  background: none;
  border: 1px solid #dee2e6;
  padding: 6px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
}

.details-btn:hover {
  background-color: #007bff;
  border-color: #007bff;
  color: white;
}

.status-select {
  padding: 6px 10px;
  border-radius: 15px;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid transparent;
  cursor: pointer;
  background-color: white;
  min-width: 110px;
  text-align: center;
}

.status-select:focus {
  outline: none;
  box-shadow: 0 0 5px rgba(0, 123, 255, 0.3);
}

.status-completed {
  background-color: #28a745;
  color: white;
}

.status-pending {
  background-color: #ffc107;
  color: #212529;
}

.status-cancelled {
  background-color: #dc3545;
  color: white;
}

.status-processing {
  background-color: #007bff;
  color: white;
}

.status-default {
  background-color: #6c757d;
  color: white;
}

@media (max-width: 1200px) {
  .sales-table {
    min-width: 900px;
  }
  
  .sales-table th,
  .sales-table td {
    padding: 10px 8px;
    font-size: 13px;
  }
}

@media (max-width: 768px) {
  .sales-table-container {
    padding: 5px;
  }
  
  .sales-table {
    min-width: 800px;
  }
  
  .sales-table th,
  .sales-table td {
    padding: 8px 6px;
    font-size: 12px;
  }
  
  .cliente-cell,
  .vendedor-cell {
    min-width: 100px;
  }
  
  .empresa-cell {
    min-width: 80px;
  }
}

@media (max-width: 576px) {
  .sales-table {
    font-size: 11px;
    min-width: 700px;
  }
  
  .sales-table th,
  .sales-table td {
    padding: 6px 4px;
  }
  
  .no-data-message {
    font-size: 16px;
    padding: 40px 15px;
  }
}
</style>