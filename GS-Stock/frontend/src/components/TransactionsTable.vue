<template>
  <div class="transactions-table">
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
        <label>Fecha desde:</label>
        <input 
          type="date" 
          v-model="localFilters.fechaDesde" 
        />
      </div>
      
      <div class="filter-group">
        <label>Fecha hasta:</label>
        <input 
          type="date" 
          v-model="localFilters.fechaHasta" 
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
            <th>Fecha</th>
            <th>Cliente</th>
            
            <!-- columnas para pagos -->
            <th v-if="type === 'pagos'">Vendedor</th>
            <th v-if="type === 'pagos'">Monto</th>
            <th v-if="type === 'pagos'">Método</th>

            <!-- columnas para devoluciones -->
            <th v-if="type === 'devoluciones'">Teléfono</th>
            <th v-if="type === 'devoluciones'">Código</th>
            <th v-if="type === 'devoluciones'">Producto</th>
            <th v-if="type === 'devoluciones'">Talla</th>
            <th v-if="type === 'devoluciones'">Unidades</th>
            <th v-if="type === 'devoluciones'">Motivo</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td :colspan="type === 'pagos' ? 5 : 7" class="loading-row">
              Cargando datos...
            </td>
          </tr>
          
          <tr v-else-if="data.length === 0">
            <td :colspan="type === 'pagos' ? 5 : 7" class="no-data-row">
              No se encontraron {{ type === 'pagos' ? 'pagos' : 'devoluciones' }}
            </td>
          </tr>
          
          <tr v-else v-for="item in data" :key="getRowKey(item)">
            <td>{{ formatDate(item.fecha) }}</td>
            <td>
              {{ item.cliente_nombre || '' }}
              <span v-if="item.cliente_empresa" class="empresa-badge">({{ item.cliente_empresa }})</span>
            </td>
            
            <!-- pagos -->
            <td v-if="type === 'pagos'">{{ item.vendedor_nombre || 'N/A' }}</td>
            <td v-if="type === 'pagos'">Q{{ formatCurrency(item.monto) }}</td>
            <td v-if="type === 'pagos'">{{ item.metodo_pago || 'N/A' }}</td>
            
            <!-- devoluciones -->
            <td v-if="type === 'devoluciones'">{{ item.cliente_telefono || 'N/A' }}</td>
            <td v-if="type === 'devoluciones'">
              <span class="codigo-badge">{{ item.codigo || 'N/A' }}</span>
            </td>
            <td v-if="type === 'devoluciones'" class="producto-cell">
              {{ item.nombre_zapato || 'N/A' }}
            </td>
            <td v-if="type === 'devoluciones'">
              <span class="talla-badge">{{ item.talla_eu ? item.talla_eu + ' EU' : 'N/A' }}</span>
              <span v-if="item.talla_us" class="talla-secondary"> / {{ item.talla_us }} US</span>
            </td>
            <td v-if="type === 'devoluciones'" class="text-center">{{ item.unidades || 0 }}</td>
            <td v-if="type === 'devoluciones'" class="motivo-cell">
              {{ item.motivo || 'Sin motivo especificado' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>


<script>
import { ref, watch } from 'vue';

export default {
  name: 'TransactionsTable',
  props: {
    type: {
      type: String,
      required: true,
      validator: value => ['pagos', 'devoluciones'].includes(value)
    },
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
    
    const getRowKey = (item) => {
      // Para devoluciones, usar combinación de devolucion_id y codigo para key única
      if (props.type === 'devoluciones') {
        return `${item.devolucion_id || item.id}-${item.codigo || ''}-${Math.random()}`;
      }
      return item.id;
    };
    
    const clearFilters = () => {
      localFilters.value = {
        cliente: '',
        fechaDesde: '',
        fechaHasta: ''
      };
      emit('clear-filters');
    };
    
    return {
      localFilters,
      formatDate,
      formatCurrency,
      getRowKey,
      clearFilters
    };
  }
}
</script>

<style scoped>
.transactions-table {
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
}

.clear-filters-btn:hover {
  background-color: #5a6268;
}

.table-container {
  width: 100%;
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

th {
  background-color: #f8f9fa;
  padding: 12px 8px;
  text-align: left;
  font-weight: 600;
  color: #495057;
  border-bottom: 2px solid #dee2e6;
}

td {
  padding: 12px 8px;
  border-bottom: 1px solid #e9ecef;
  color: #212529;
}

.loading-row,
.no-data-row {
  text-align: center;
  padding: 30px;
  color: #6c757d;
  font-style: italic;
}

.empresa-badge {
  display: inline-block;
  margin-left: 5px;
  font-size: 11px;
  color: #6c757d;
  font-style: italic;
}

.codigo-badge {
  display: inline-block;
  background-color: #e7f3ff;
  color: #0066cc;
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: 600;
  font-size: 13px;
}

.talla-badge {
  display: inline-block;
  background-color: #f0f0f0;
  color: #333;
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: 500;
  font-size: 12px;
}

.motivo-cell {
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.motivo-cell:hover {
  white-space: normal;
  overflow: visible;
}

.producto-cell {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
}

.producto-cell:hover {
  white-space: normal;
  overflow: visible;
}

.talla-secondary {
  font-size: 11px;
  color: #6c757d;
  font-weight: normal;
  margin-left: 4px;
}

.text-center {
  text-align: center;
  font-weight: 600;
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
  
  .codigo-badge,
  .talla-badge {
    font-size: 11px;
    padding: 3px 6px;
  }
}
</style>