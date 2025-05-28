<template>
  <div class="sales-management-container">
    <header-component />

    <div class="content-section">
      <div class="page-title">Gestión de Ventas</div>

      <div class="actions-section">
        <button class="action-button add-button" @click="openAddSaleModal">
          Agregar Venta
        </button>
        <button class="action-button view-button" @click="viewSaleDetails" :disabled="!selectedSale">
          Ver Detalles
        </button>
        <button class="action-button refresh-button" @click="fetchSales">
          Actualizar Lista
        </button>
      </div>

      <div class="filter-section">
        <div class="filter-group">
          <label for="filter-date">Filtrar por fecha:</label>
          <input 
            type="date" 
            id="filter-date" 
            v-model="filters.date"
          />
        </div>
        <div class="filter-group">
          <label for="filter-client">Filtrar por cliente:</label>
          <input 
            v-model="filters.client" 
            id="filter-client"
            placeholder="Nombre del cliente"
          />
        </div>
        <div class="filter-buttons">
          <button class="filter-button" @click="applyFilters">Aplicar Filtros</button>
          <button class="filter-button reset" @click="resetFilters">Restablecer</button>
        </div>
      </div>

      <h2 class="list-title">Lista de Ventas Registradas ({{ filteredSales.length }})</h2>

      <div v-if="loading" class="loading-indicator">
        Cargando ventas...
      </div>
      
      <div v-if="error" class="error-message">
        {{ error }}
      </div>

      <ventas-tabla
        v-if="!loading && !error"
        :sales="filteredSales"
        @sale-selected="handleSaleSelection"
      />
    </div>

    <!-- Modal para agregar venta -->
    <div v-if="showAddSaleModal" class="modal">
      <div class="modal-content">
        <span class="close" @click="showAddSaleModal = false">&times;</span>
        <h2>Agregar Nueva Venta</h2>
        <form @submit.prevent="addSale">
  <div class="form-group">
    <label for="empresa_cliente">Empresa del Cliente:</label>
    <div style="display: flex; gap: 10px;">
      <input 
        type="text" 
        id="empresa_cliente" 
        v-model="newSale.empresa_cliente" 
        placeholder="Nombre de la empresa"
        :disabled="buscandoCliente"
      >
      <button 
        type="button" 
        @click="buscarClientePorEmpresa"
        :disabled="buscandoCliente"
        class="search-button"
      >
        {{ buscandoCliente ? 'Buscando...' : 'Buscar' }}
      </button>
    </div>
  </div>

  <div v-if="clienteEncontrado && mostrarConfirmacionCliente" class="cliente-confirmacion">
    <p><strong>¿El cliente responsable es:</strong></p>
    <p>{{ clienteEncontrado.nombre }} {{ clienteEncontrado.apellido }}</p>
    <p><small>Empresa: {{ clienteEncontrado.empresa }}</small></p>
    <div style="display: flex; gap: 10px; margin-top: 10px;">
      <button type="button" @click="confirmarCliente" class="confirm-button">Confirmar</button>
      <button type="button" @click="cancelarCliente" class="cancel-button">Cancelar</button>
    </div>
  </div>

  <div class="form-group">
    <label for="id_vendedor">ID Vendedor:</label>
    <input 
      type="number" 
      id="id_vendedor" 
      v-model="newSale.id_vendedor" 
      required
      min="1"
    >
  </div>

  <div class="form-group">
    <label for="id_metodo_pago">ID Método de Pago:</label>
    <input 
      type="number" 
      id="id_metodo_pago" 
      v-model="newSale.id_metodo_pago" 
      required
      min="1"
    >
  </div>

  <div class="productos-section">
    <label>Productos:</label>
    <div 
      v-for="(producto, index) in newSale.productos" 
      :key="index"
      class="producto-item"
    >
      <input 
        type="number" 
        placeholder="ID Zapato"
        v-model="producto.id_zapato" 
        required
        min="1"
      >
      <input 
        type="number" 
        placeholder="Cantidad"
        v-model="producto.cantidad" 
        required
        min="1"
      >
      <button 
        type="button" 
        @click="eliminarProducto(index)"
        v-if="newSale.productos.length > 1"
        class="remove-product-button"
      >
        ✕
      </button>
    </div>
    <button type="button" @click="agregarProducto" class="add-product-button">
      + Agregar Producto
    </button>
  </div>

  <div class="form-group">
    <label for="subtotal">Subtotal:</label>
    <input 
      type="number" 
      id="subtotal" 
      v-model="newSale.subtotal" 
      required
      min="0"
      step="0.01"
    >
  </div>

  <div class="form-group">
    <label for="total">Total:</label>
    <input 
      type="number" 
      id="total" 
      v-model="newSale.total" 
      required
      min="0"
      step="0.01"
    >
  </div>

  <button type="submit" class="submit-button" :disabled="!newSale.id_cliente">
    Guardar Venta
  </button>
</form>
      </div>
    </div>

    <!-- Modal para ver detalles de venta -->
    <div v-if="showDetailsModal" class="modal">
      <div class="modal-content details-modal">
        <span class="close" @click="showDetailsModal = false">&times;</span>
        <h2>Detalles de la Venta</h2>
        <div v-if="selectedSale" class="sale-details">
          <div class="detail-section">
            <h3>Información General</h3>
            <div class="detail-row">
              <strong>ID Pedido:</strong> {{ selectedSale.pedido_id }}
            </div>
            <div class="detail-row">
              <strong>Cliente:</strong> {{ selectedSale.cliente }}
            </div>
            <div class="detail-row">
              <strong>Vendedor:</strong> {{ selectedSale.vendedor }}
            </div>
            <div class="detail-row">
              <strong>Fecha:</strong> {{ formatDate(selectedSale.fecha) }}
            </div>
            <div class="detail-row">
              <strong>Estado:</strong> 
              <span :class="getStatusClass(selectedSale.estado_pedido)">
                {{ selectedSale.estado_pedido }}
              </span>
            </div>
            <div class="detail-row">
              <strong>Método de Pago:</strong> {{ selectedSale.metodo_pago }}
            </div>
          </div>
          
          <div class="detail-section">
            <h3>Productos</h3>
            <div class="products-detail">
              <div 
                v-for="(product, index) in selectedSale.productos" 
                :key="index"
                class="product-detail-item"
              >
                <div class="product-name">{{ product.zapato }}</div>
                <div class="product-quantity">Cantidad: {{ product.cantidad }}</div>
              </div>
            </div>
          </div>
          
          <div class="detail-section">
            <h3>Totales</h3>
            <div class="totals-section">
              <div class="detail-row">
                <strong>Subtotal:</strong> ${{ formatCurrency(selectedSale.subtotal) }}
              </div>
              <div class="detail-row total-row">
                <strong>Total:</strong> ${{ formatCurrency(selectedSale.total) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal para mensajes -->
    <modal-message 
      :show="showMessageModal"
      :title="messageTitle"
      :message="messageContent"
      :type="messageType"
      @close="hideMessage"
    />
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import VentasTabla from '@/components/VentasTabla.vue';
import HeaderComponent from '@/components/HeaderComponent.vue';
import ModalMessage from '@/components/ModalMessage.vue';
import { useRouter } from 'vue-router';

export default {
  name: 'SalesManagementView',
  components: {
    VentasTabla,
    HeaderComponent,
    ModalMessage
  },
  setup() {
    const router = useRouter();
    const sales = ref([]);
    const loading = ref(true);
    const error = ref(null);
    const selectedSale = ref(null);
    const showDetailsModal = ref(false);
    const showAddSaleModal = ref(false);
    const showMessageModal = ref(false);
    const messageTitle = ref('');
    const messageContent = ref('');
    const messageType = ref('info');
    
    const filters = ref({
      date: '',
      client: '',
      status: ''
    });

    const newSale = ref({
      empresa_cliente: '',
      id_cliente: '',
      id_vendedor: '',
      id_metodo_pago: '',
      productos: [{ id_zapato: '', cantidad: '' }],
      subtotal: '',
      total: ''
    });

    const clienteEncontrado = ref(null);
    const mostrarConfirmacionCliente = ref(false);
    const buscandoCliente = ref(false);


    const showMessage = (title, message, type = 'info') => {
      messageTitle.value = title;
      messageContent.value = message;
      messageType.value = type;
      showMessageModal.value = true;
    };

    const hideMessage = () => {
      showMessageModal.value = false;
    };

    const buscarClientePorEmpresa = async () => {
  if (!newSale.value.empresa_cliente.trim()) {
    showMessage('Error', 'Ingrese el nombre de la empresa', 'error');
    return;
  }

  buscandoCliente.value = true;
  
  try {
    const token = checkAuth();
    const response = await fetch(`http://localhost:3000/api/clientes/buscar-empresa/${encodeURIComponent(newSale.value.empresa_cliente)}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error('No se encontró la empresa');
    }

    const data = await response.json();
    if (data.data.length > 0) {
      clienteEncontrado.value = data.data[0];
      mostrarConfirmacionCliente.value = true;
    } else {
      showMessage('Error', 'No se encontraron clientes para esta empresa', 'error');
    }
  } catch (err) {
    showMessage('Error', err.message, 'error');
  } finally {
    buscandoCliente.value = false;
  }
};

const confirmarCliente = () => {
  newSale.value.id_cliente = clienteEncontrado.value.id;
  mostrarConfirmacionCliente.value = false;
  showMessage('Éxito', 'Cliente confirmado', 'success');
};

const cancelarCliente = () => {
  clienteEncontrado.value = null;
  mostrarConfirmacionCliente.value = false;
  newSale.value.empresa_cliente = '';
};

const agregarProducto = () => {
  newSale.value.productos.push({ id_zapato: '', cantidad: '' });
};

const eliminarProducto = (index) => {
  if (newSale.value.productos.length > 1) {
    newSale.value.productos.splice(index, 1);
  }
};

    const openAddSaleModal = () => {
  newSale.value = {
    empresa_cliente: '',
    id_cliente: '',
    id_vendedor: '',
    id_metodo_pago: '',
    productos: [{ id_zapato: '', cantidad: '' }],
    subtotal: '',
    total: ''
  };
  clienteEncontrado.value = null;
  mostrarConfirmacionCliente.value = false;
  showAddSaleModal.value = true;
};

   const addSale = async () => {
  try {
    const token = checkAuth();
    if (!token) return;

    const ventaData = {
      id_cliente: newSale.value.id_cliente,
      empresa_cliente: newSale.value.empresa_cliente,
      id_vendedor: parseInt(newSale.value.id_vendedor),
      id_metodo_pago: parseInt(newSale.value.id_metodo_pago),
      productos: newSale.value.productos.map(p => ({
        id_zapato: parseInt(p.id_zapato),
        cantidad: parseInt(p.cantidad)
      })),
      subtotal: parseFloat(newSale.value.subtotal),
      total: parseFloat(newSale.value.total)
    };

    const response = await fetch('http://localhost:3000/api/ventas', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(ventaData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.details || 'Error al crear la venta');
    }

    showMessage('Éxito', 'Venta creada correctamente', 'success');
    showAddSaleModal.value = false;
    fetchSales();
  } catch (err) {
    showMessage('Error', err.message, 'error');
  }
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
      if (!amount) return '0.00';
      return parseFloat(amount).toFixed(2);
    };

    const getStatusClass = (status) => {
      switch (status?.toLowerCase()) {
        case 'completado':
        case 'entregado':
          return 'status-completed';
        case 'pendiente':
          return 'status-pending';
        case 'cancelado':
          return 'status-cancelled';
        case 'procesando':
          return 'status-processing';
        default:
          return 'status-default';
      }
    };

    const viewSaleDetails = () => {
      if (!selectedSale.value) {
        showMessage('Error', 'No hay ninguna venta seleccionada', 'error');
        return;
      }
      showDetailsModal.value = true;
    };

    const applyFilters = () => {
      showMessage('Filtros aplicados', 'Los filtros se han aplicado correctamente', 'success');
    };

    const resetFilters = () => {
      filters.value = {
        date: '',
        client: '',
        status: ''
      };
      showMessage('Filtros restablecidos', 'Todos los filtros han sido restablecidos', 'info');
    };

    const checkAuth = () => {
      const token = localStorage.getItem('jwtToken');
      if (!token) {
        showMessage('Error', 'No has iniciado sesión', 'error');
        setTimeout(() => {
          router.push('/login');
        }, 1500);
        return false;
      }
      return token;
    };

    const fetchSales = async () => {
      const token = checkAuth();
      if (!token) return;
      
      loading.value = true;
      error.value = null;
      
      try {
        const response = await fetch('http://localhost:3000/api/ventas', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al cargar las ventas');
        }
        
        const data = await response.json();
        console.log('Datos de ventas recibidos:', data);
        
        // Los datos ya vienen estructurados desde el backend
        sales.value = data.data || [];
        
        if (sales.value.length === 0) {
          showMessage('Información', 'No hay ventas registradas en el sistema', 'info');
        }
        
      } catch (err) {
        error.value = `Error: ${err.message}`;
        console.error('Error al obtener ventas:', err);
        showMessage('Error', `No se pudieron cargar las ventas: ${err.message}`, 'error');
      } finally {
        loading.value = false;
      }
    };

    const handleSaleSelection = (sale) => {
      selectedSale.value = sale;
      console.log('Venta seleccionada:', sale);
    };

    const filteredSales = computed(() => {
      let result = sales.value;

      if (filters.value.date) {
        result = result.filter(sale => {
          const saleDate = new Date(sale.fecha).toISOString().split('T')[0];
          return saleDate === filters.value.date;
        });
      }

      if (filters.value.client) {
        const clientQuery = filters.value.client.toLowerCase();
        result = result.filter(sale => 
          sale.cliente.toLowerCase().includes(clientQuery)
        );
      }

      if (filters.value.status) {
        result = result.filter(sale => 
          sale.estado_pedido.toLowerCase() === filters.value.status.toLowerCase()
        );
      }

      return result;
    });

    onMounted(() => {
      fetchSales();
    });

    return {
      sales,
      loading,
      error,
      selectedSale,
      showDetailsModal,
      showAddSaleModal,
      showMessageModal,
      messageTitle,
      messageContent,
      messageType,
      filters,
      newSale,
      showMessage,
      hideMessage,
      openAddSaleModal,
      addSale,
      formatDate,
      formatCurrency,
      getStatusClass,
      viewSaleDetails,
      applyFilters,
      resetFilters,
      fetchSales,
      handleSaleSelection,
      filteredSales,
      clienteEncontrado,
  mostrarConfirmacionCliente,
  buscandoCliente,
  buscarClientePorEmpresa,
  confirmarCliente,
  cancelarCliente,
  agregarProducto,
  eliminarProducto
    };
  }
}
</script>

<style scoped>
.sales-management-container {
  width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
}

.content-section {
  padding: 15px;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  margin-top: 60px;
}

.page-title {
  font-size: 20px;
  font-weight: bold;
  margin-bottom: 15px;
  text-align: center;
  color: #333;
  width: 100%;
}

.actions-section {
  margin: 15px 0;
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: 8px;
}

.filter-section {
  margin-bottom: 15px;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 15px;
  background-color: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #dee2e6;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.filter-group label {
  font-weight: bold;
  color: #333;
  font-size: 14px;
}

.filter-group input,
.filter-group select {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
  background-color: white;
}

.filter-buttons {
  display: flex;
  gap: 10px;
  margin-top: 10px;
  flex-direction: column;
}

.filter-button {
  padding: 10px 15px;
  border: none;
  border-radius: 4px;
  background-color: #4CAF50;
  color: white;
  cursor: pointer;
  transition: background-color 0.2s;
  font-size: 14px;
}

.filter-button:hover {
  background-color: #45a049;
}

.filter-button.reset {
  background-color: #6c757d;
}

.filter-button.reset:hover {
  background-color: #5a6268;
}

.action-button {
  padding: 12px 16px;
  border: 1px solid #333;
  border-radius: 4px;
  background-color: white;
  cursor: pointer;
  transition: background-color 0.2s, transform 0.1s;
  color: #333;
  width: 100%;
  font-size: 16px;
  text-align: center;
}

.action-button:hover {
  background-color: #f0f0f0;
}

.action-button:active {
  transform: scale(0.98);
}

.action-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.add-button:hover {
  color: #4CAF50;
  border-color: #4CAF50;
}

.view-button:hover {
  color: #2196F3;
  border-color: #2196F3;
}

.refresh-button:hover {
  color: #4CAF50;
  border-color: #4CAF50;
}

.list-title {
  margin-top: 15px;
  margin-bottom: 10px;
  font-size: 18px;
  font-weight: bold;
  text-align: center;
  width: 100%;
  color: #333;
}

.loading-indicator {
  text-align: center;
  padding: 40px 20px;
  font-style: italic;
  color: #666;
  font-size: 16px;
}

.error-message {
  text-align: center;
  padding: 20px;
  color: #dc3545;
  font-weight: bold;
  border: 1px solid #dc3545;
  border-radius: 4px;
  background-color: #f8d7da;
  margin: 15px 0;
}

.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 10px;
  box-sizing: border-box;
}

.modal-content {
  background: white;
  padding: 20px;
  border-radius: 8px;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.details-modal {
  max-width: 700px;
}

.modal-content h2 {
  margin-top: 0;
  margin-bottom: 20px;
  color: #333;
  border-bottom: 2px solid #f0f0f0;
  padding-bottom: 10px;
}

.close {
  float: right;
  font-size: 24px;
  cursor: pointer;
  padding: 5px;
  line-height: 0.8;
  color: #666;
}

.close:hover {
  color: #333;
}

.sale-details {
  text-align: left;
}

.detail-section {
  margin-bottom: 25px;
  padding: 15px;
  background-color: #f8f9fa;
  border-radius: 6px;
}

.detail-section h3 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #333;
  font-size: 18px;
  border-bottom: 1px solid #dee2e6;
  padding-bottom: 8px;
}

.detail-row {
  margin-bottom: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px 0;
}

.detail-row strong {
  color: #333;
  min-width: 120px;
}

.total-row {
  font-size: 18px;
  color: #2e7d32;
  border-top: 2px solid #dee2e6;
  padding-top: 10px;
  margin-top: 10px;
}

.products-detail {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.product-detail-item {
  padding: 10px;
  background-color: white;
  border-radius: 4px;
  border: 1px solid #dee2e6;
}

.product-name {
  font-weight: bold;
  color: #333;
  margin-bottom: 5px;
}

.product-quantity {
  color: #666;
  font-size: 14px;
}

.totals-section {
  background-color: white;
  padding: 15px;
  border-radius: 4px;
  border: 1px solid #dee2e6;
}

/* Form styles */
.form-group {
  margin-bottom: 15px;
  text-align: left;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
  box-sizing: border-box;
}

.submit-button {
  padding: 12px 16px;
  border: none;
  border-radius: 4px;
  background-color: #4CAF50;
  color: white;
  cursor: pointer;
  transition: background-color 0.2s;
  font-size: 16px;
  width: 100%;
  margin-top: 10px;
}

.submit-button:hover {
  background-color: #45a049;
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

/* Media Queries - Tablet */
@media (min-width: 576px) {
  .content-section {
    padding: 20px;
    margin-top: 70px;
  }
  
  .page-title {
    font-size: 22px;
  }
  
  .actions-section {
    flex-direction: row;
    justify-content: center;
    gap: 15px;
  }
  
  .action-button {
    width: auto;
    min-width: 150px;
  }
  
  .filter-section {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 15px;
  }
  
  .filter-group {
    flex: 1;
    min-width: 200px;
  }
  
  .filter-buttons {
    flex-direction: row;
    margin-top: 0;
    align-items: flex-end;
  }
  
  .filter-button {
    min-width: 100px;
  }
}

/* Media Queries - Desktop */
@media (min-width: 768px) {
  .content-section {
    max-width: 1400px;
    margin-left: auto;
    margin-right: auto;
    margin-top: 100px;
  }
  
  .page-title {
    font-size: 24px;
  }
  
  .list-title {
    font-size: 20px;
  }
  
  .detail-row {
    justify-content: flex-start;
    gap: 20px;
  }
  
  .detail-row strong {
    min-width: 150px;
  }
}
.cliente-confirmacion {
  background-color: #e8f5e8;
  padding: 15px;
  border-radius: 6px;
  margin: 10px 0;
  border: 1px solid #4caf50;
}

.search-button {
  padding: 8px 12px;
  background-color: #2196F3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  min-width: 80px;
}

.search-button:hover {
  background-color: #1976D2;
}

.search-button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.confirm-button {
  background-color: #4CAF50;
  color: white;
  padding: 8px 15px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.cancel-button {
  background-color: #f44336;
  color: white;
  padding: 8px 15px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.productos-section {
  margin: 15px 0;
}

.producto-item {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
  align-items: center;
}

.producto-item input {
  flex: 1;
}

.remove-product-button {
  background-color: #f44336;
  color: white;
  border: none;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.add-product-button {
  background-color: #4CAF50;
  color: white;
  padding: 8px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 10px;
}
</style>