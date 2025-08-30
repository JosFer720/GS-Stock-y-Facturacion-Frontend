<template>
  <div class="pagos-table">
    <!-- Filtros -->
    <div class="table-filters">
      <div class="filter-group">
        <label>Buscar por cliente:</label>
        <input 
          type="text" 
          v-model="localFilters.cliente" 
          placeholder="Nombre del cliente..."
        />
      </div>
      
      <div class="filter-group">
        <label>Buscar fecha de pago:</label>
        <input 
          type="date" 
          v-model="localFilters.fechaPago" 
        />
      </div>
      
      <button class="clear-filters-btn" @click="clearFilters">
        Limpiar filtros
      </button>
    </div>
    
    <!-- Tabla -->
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Cliente</th>
            <th>Pedido #</th>
            <th>Vendedor</th>
            <th>Total Pedido Original</th>
            <th>Saldo Pendiente</th>
            <th>Estado Pago</th>
            <th>Método de Pago</th>
            <th>Monto Pagado</th>
            <th>Vuelto</th>
            <th>Fecha de Pago</th>
            <th>Observaciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="12" class="loading-row">
              Cargando pagos...
            </td>
          </tr>
          
          <tr v-else-if="filteredData.length === 0">
            <td colspan="12" class="no-data-row">
              No se encontraron pagos
            </td>
          </tr>
          
          <tr v-else v-for="pago in filteredData" :key="pago.id">
            <td>{{ pago.id }}</td>
            <td>
              {{ pago.cliente_nombre || '' }} {{ pago.cliente_apellido || '' }}
              <span v-if="pago.empresa" class="empresa-tag">({{ pago.empresa }})</span>
            </td>
            <td>#{{ pago.id_pedido }}</td>
            <td>{{ pago.vendedor_nombre || 'N/A' }}</td>
            <td>Q{{ formatCurrency(pago.pedido_original_total) }}</td>
            <td>Q{{ formatCurrency(pago.remaining_balance) }}</td>
            <td>
              <span 
                class="status-badge"
                :class="pago.estado_pago === 'pagado' ? 'status-paid' : 'status-pending'"
              >
                {{ pago.estado_pago || 'N/A' }}
              </span>
            </td>
            <td>{{ pago.metodo_pago || 'N/A' }}</td>
            <td>Q{{ formatCurrency(pago.monto_pagado) }}</td>
            <td>{{ pago.vuelto ? 'Q' + formatCurrency(pago.vuelto) : '-' }}</td>
            <td>{{ formatDate(pago.fecha_de_pago) }}</td>
            <td>{{ pago.observaciones || '-' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue';

export default {
  name: 'PagosTable',
  props: {
    data: {
      type: Array,
      required: true
    },
    loading: {
      type: Boolean,
      default: false
    },
    filters: {
      type: Object,
      required: true
    }
  },
  emits: ['update:filters', 'clear-filters'],
  setup(props, { emit }) {
    const localFilters = ref({ ...props.filters });
    
    watch(localFilters, (newFilters) => {
      emit('update:filters', newFilters);
    }, { deep: true });
    
    const filteredData = computed(() => {
      let result = props.data;

      if (localFilters.value.cliente) {
        const clienteQuery = localFilters.value.cliente.toLowerCase();
        result = result.filter(pago => {
          const nombreCompleto = `${pago.cliente_nombre || ''} ${pago.cliente_apellido || ''}`.toLowerCase();
          const empresa = pago.empresa?.toLowerCase() || '';
          return nombreCompleto.includes(clienteQuery) || empresa.includes(clienteQuery);
        });
      }

      if (localFilters.value.fechaPago) {
        result = result.filter(pago => {
          if (!pago.fecha_de_pago) return false;
          const fechaPago = new Date(pago.fecha_de_pago).toISOString().split('T')[0];
          return fechaPago === localFilters.value.fechaPago;
        });
      }

      return result;
    });
    
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
    
    const clearFilters = () => {
      localFilters.value = {
        cliente: '',
        fechaPago: ''
      };
      emit('clear-filters');
    };
    
    return {
      localFilters,
      filteredData,
      formatDate,
      formatCurrency,
      clearFilters
    };
  }
}
</script>



<style scoped>
.pagos-table {
  width: 100%;
}

.table-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  margin-bottom: 20px;
  align-items: end;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 150px;
}

.filter-group label {
  font-size: 12px;
  font-weight: 600;
  color: #495057;
}

.filter-group input {
  padding: 8px 12px;
  border: 2px solid #e9ecef;
  border-radius: 4px;
  font-size: 14px;
  transition: border-color 0.2s ease;
}

.filter-group input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

.clear-filters-btn {
  background-color: #6c757d;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  height: fit-content;
  transition: background-color 0.2s ease;
}

.clear-filters-btn:hover {
  background-color: #5a6268;
}

.table-container {
  width: 100%;
  overflow-x: auto;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  min-width: 1000px;
}

th {
  background-color: #f8f9fa;
  padding: 12px 8px;
  text-align: left;
  font-weight: 600;
  color: #495057;
  border-bottom: 2px solid #dee2e6;
  white-space: nowrap;
}

td {
  padding: 12px 8px;
  border-bottom: 1px solid #e9ecef;
  color: #212529;
  vertical-align: middle;
}

tr:hover {
  background-color: #f8f9fa;
}

.loading-row,
.no-data-row {
  text-align: center;
  padding: 30px;
  color: #6c757d;
  font-style: italic;
}

.empresa-tag {
  background-color: #e3f2fd;
  color: #1976d2;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  margin-left: 5px;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  text-transform: capitalize;
}

.status-paid {
  background-color: #d4edda;
  color: #155724;
}

.status-pending {
  background-color: #fff3cd;
  color: #856404;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .table-filters {
    flex-direction: column;
    align-items: stretch;
  }
  
  .filter-group {
    min-width: unset;
  }
  
  th, td {
    padding: 8px 4px;
    font-size: 12px;
  }
  
  table {
    min-width: 800px;
  }
}

@media (max-width: 480px) {
  th, td {
    padding: 6px 3px;
    font-size: 11px;
  }
  
  .empresa-tag {
    font-size: 10px;
    padding: 1px 6px;
  }
  
  .status-badge {
    font-size: 10px;
    padding: 2px 6px;
  }
}
</style>