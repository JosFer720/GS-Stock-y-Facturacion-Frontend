<template>
  <div class="historial-facturas-container">
    <h2>Historial de Facturas</h2>

    <div class="filters">
      <input 
        type="text" 
        v-model="filtroCliente" 
        @input="debounceSearch"
        placeholder="Buscar por cliente"
      >
      <button @click="cargarFacturas" class="btn-filtrar">
        <i class="fas fa-filter"></i> Filtrar
      </button>
      <button @click="resetearFiltros" class="btn-limpiar">
        <i class="fas fa-redo"></i> Limpiar
      </button>
    </div>

    <div v-if="loading" class="loading">
      Cargando facturas...
    </div>

    <div v-else-if="error" class="error">
      {{ error }}
    </div>

    <table v-else>
      <thead>
        <tr>
          <th>ID</th>
          <th>Pedido</th>
          <th>Cliente</th>
          <th>Subtotal</th>
          <th>Impuestos</th>
          <th>Total</th>
          <th>Estado</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="factura in facturas" :key="factura.id">
          <td>{{ factura.id || factura.Id }}</td>
          <td>{{ factura.id_pedido || factura.Id_Pedido }}</td>
          <td>{{ factura.nombre_cliente }} {{ factura.apellido_cliente }}</td>
          <td>${{ formatMonto(factura.subtotal || factura.Subtotal) }}</td>
          <td>${{ formatMonto(factura.impuestos || factura.Impuestos) }}</td>
          <td>${{ formatMonto(factura.total || factura.Total) }}</td>
          <td>
            <span :class="getEstadoClass(factura.estado || factura.Estado)">
              {{ factura.estado || factura.Estado }}
            </span>
          </td>
        </tr>
        <tr v-if="facturas.length === 0 && !loading">
          <td colspan="7" class="no-data">No se encontraron facturas</td>
        </tr>
      </tbody>
    </table>

    <div class="info-filtros" v-if="filtroCliente && !loading">
      <small>
        Mostrando {{ facturas.length }} facturas
        <span v-if="filtroCliente"> con cliente "{{ filtroCliente }}"</span>
      </small>
    </div>
  </div>
</template>

<script>
export default {
  name: 'HistorialFacturas',
  data() {
    return {
      facturas: [],
      filtroCliente: '',
      loading: false,
      error: null,
      searchTimeout: null
    };
  },
  methods: {
    formatMonto(monto) {
      return parseFloat(monto || 0).toFixed(2);
    },
    getEstadoClass(estado) {
      const estadoLower = estado?.toLowerCase();
      switch(estadoLower) {
        case 'pagada':
        case 'pagado':
          return 'estado-pagada';
        case 'pendiente':
          return 'estado-pendiente';
        case 'cancelada':
        case 'cancelado':
          return 'estado-cancelada';
        default:
          return '';
      }
    },
    debounceSearch() {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = setTimeout(() => {
        this.cargarFacturas();
      }, 500);
    },
    async cargarFacturas() {
      this.loading = true;
      this.error = null;
      
      try {
        const params = new URLSearchParams();
        if (this.filtroCliente.trim()) params.append('cliente', this.filtroCliente.trim());

        const token = localStorage.getItem('jwtToken');
        const response = await fetch(`http://localhost:3000/api/facturas?${params.toString()}`, {
          headers: { 
            'Authorization': `Bearer ${token}` 
          }
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al obtener facturas');
        }

        const data = await response.json();
        this.facturas = data;
        
        console.log('Facturas recibidas:', data.length);
        
      } catch (err) {
        this.error = 'Error al cargar las facturas: ' + err.message;
        console.error('Error:', err);
      } finally {
        this.loading = false;
      }
    },
    resetearFiltros() {
      this.filtroCliente = '';
      this.cargarFacturas();
    }
  },
  mounted() {
    this.cargarFacturas();
  }
};
</script>

<style scoped>
.historial-facturas-container {
  width: 100%;
  margin-top: 30px;
}

h2 {
  color: #333;
  margin-bottom: 20px;
}

table {
  width: 100%;
  border-collapse: collapse;
  background-color: white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  border-radius: 8px;
  overflow: hidden;
}

th, td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

th {
  background-color: #f8f9fa;
  font-weight: 600;
  color: #333;
}

tbody tr:hover {
  background-color: #f8f9fa;
}

.filters {
  margin-bottom: 20px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}

.filters input {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  flex: 1;
  max-width: 300px;
}

.filters button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.btn-filtrar {
  background-color: #4CAF50;
  color: white;
}

.btn-filtrar:hover {
  background-color: #45a049;
}

.btn-limpiar {
  background-color: #6c757d;
  color: white;
}

.btn-limpiar:hover {
  background-color: #5a6268;
}

.loading, .error, .no-data {
  text-align: center;
  padding: 20px;
  color: #666;
}

.error {
  color: #dc3545;
}

.estado-pagada {
  background-color: #4caf50;
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
}

.estado-pendiente {
  background-color: #ff9800;
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
}

.estado-cancelada {
  background-color: #f44336;
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
}

.info-filtros {
  margin-top: 10px;
  color: #666;
  font-style: italic;
}

@media (max-width: 768px) {
  .filters {
    flex-direction: column;
  }
  
  .filters input,
  .filters button {
    width: 100%;
  }
  
  table {
    font-size: 14px;
  }
  
  th, td {
    padding: 8px;
  }
}
</style>