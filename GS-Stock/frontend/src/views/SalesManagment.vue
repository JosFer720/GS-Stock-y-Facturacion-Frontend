<template>
  <div class="sales-management-container">
    <header-component />

    <div class="content-section">
      <div class="page-title">Gestión de Ventas</div>

      <div class="actions-section">
        <button class="action-button create-button" @click="openCreateSaleModal">
          Registrar Nueva Venta
        </button>
        <button class="action-button edit-button" @click="confirmEdit" :disabled="!selectedSale">
          Editar Venta
        </button>
        <button class="action-button delete-button" @click="confirmDelete" :disabled="!selectedSale">
          Eliminar Venta
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
        <button class="filter-button" @click="applyFilters">Aplicar Filtros</button>
        <button class="filter-button reset" @click="resetFilters">Restablecer</button>
      </div>

      <h2 class="list-title">Lista de Ventas Registradas</h2>

      <div v-if="loading" class="loading-indicator">
        Cargando ventas...
      </div>
      
      <div v-if="error" class="error-message">
        {{ error }}
      </div>

      <sales-table
        v-if="!loading && !error"
        :products="filteredSales"
        @product-selected="handleSaleSelection"
      />
    </div>

    <!-- Modal para crear venta -->
    <div v-if="showCreateModal" class="modal">
      <div class="modal-content">
        <span class="close" @click="showCreateModal = false">&times;</span>
        <h2>Registrar Nueva Venta</h2>
        <form @submit.prevent="createSale">
          <div class="form-group">
            <label for="cliente">Cliente:</label>
            <input 
              type="text" 
              id="cliente" 
              v-model="newSale.cliente" 
              required
            >
          </div>
          <div class="form-group">
            <label for="fecha">Fecha:</label>
            <input 
              type="date" 
              id="fecha" 
              v-model="newSale.fecha" 
              required
            >
          </div>
          <div class="form-group">
            <label for="producto">Producto:</label>
            <input 
              type="text" 
              id="producto" 
              v-model="newSale.producto" 
              required
            >
          </div>
          <div class="form-group">
            <label for="cantidad">Cantidad:</label>
            <input 
              type="number" 
              id="cantidad" 
              v-model="newSale.cantidad" 
              required
              min="1"
            >
          </div>
          <div class="form-group">
            <label for="precio">Precio Unitario:</label>
            <input 
              type="number" 
              id="precio" 
              v-model="newSale.precio" 
              required
              min="0.01"
              step="0.01"
            >
          </div>
          <div class="form-group">
            <label for="total">Total:</label>
            <input 
              type="number" 
              id="total" 
              :value="calculatedTotal" 
              readonly
            >
          </div>
          <div class="form-group">
            <label for="metodo_pago">Método de Pago:</label>
            <select id="metodo_pago" v-model="newSale.metodo_pago" required>
              <option value="Efectivo">Efectivo</option>
              <option value="Tarjeta">Tarjeta</option>
              <option value="Transferencia">Transferencia</option>
            </select>
          </div>
          <button type="submit">Guardar Venta</button>
        </form>
      </div>
    </div>

    <!-- Modal para editar venta -->
    <div v-if="showEditModal" class="modal">
      <div class="modal-content">
        <span class="close" @click="showEditModal = false">&times;</span>
        <h2>Editar Venta</h2>
        <form @submit.prevent="updateSale">
          <div class="form-group">
            <label for="edit-cliente">Cliente:</label>
            <input 
              type="text" 
              id="edit-cliente" 
              v-model="selectedSale.cliente" 
              required
            >
          </div>
          <div class="form-group">
            <label for="edit-fecha">Fecha:</label>
            <input 
              type="date" 
              id="edit-fecha" 
              v-model="selectedSale.fecha" 
              required
            >
          </div>
          <div class="form-group">
            <label for="edit-producto">Producto:</label>
            <input 
              type="text" 
              id="edit-producto" 
              v-model="selectedSale.producto" 
              required
            >
          </div>
          <div class="form-group">
            <label for="edit-cantidad">Cantidad:</label>
            <input 
              type="number" 
              id="edit-cantidad" 
              v-model="selectedSale.cantidad" 
              required
              min="1"
            >
          </div>
          <div class="form-group">
            <label for="edit-precio">Precio Unitario:</label>
            <input 
              type="number" 
              id="edit-precio" 
              v-model="selectedSale.precio" 
              required
              min="0.01"
              step="0.01"
            >
          </div>
          <div class="form-group">
            <label for="edit-total">Total:</label>
            <input 
              type="number" 
              id="edit-total" 
              :value="selectedSale.cantidad * selectedSale.precio" 
              readonly
            >
          </div>
          <div class="form-group">
            <label for="edit-metodo_pago">Método de Pago:</label>
            <select id="edit-metodo_pago" v-model="selectedSale.metodo_pago" required>
              <option value="Efectivo">Efectivo</option>
              <option value="Tarjeta">Tarjeta</option>
              <option value="Transferencia">Transferencia</option>
            </select>
          </div>
          <button type="submit">Actualizar Venta</button>
        </form>
      </div>
    </div>

    <!-- Modal para mensajes (usando tu componente existente) -->
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
import { ref, computed, onMounted, watch } from 'vue';
import SalesTable from '@/components/ProductsTable.vue'; // Reutilizando tu componente de tabla
import HeaderComponent from '@/components/HeaderComponent.vue';
import ModalMessage from '@/components/ModalMessage.vue';
import { useRouter } from 'vue-router';

export default {
  name: 'SalesManagementView',
  components: {
    SalesTable,
    HeaderComponent,
    ModalMessage
  },
  setup() {
    const router = useRouter();
    const sales = ref([]);
    const loading = ref(true);
    const error = ref(null);
    const selectedSale = ref(null);
    const showCreateModal = ref(false);
    const showEditModal = ref(false);
    const showMessageModal = ref(false);
    const messageTitle = ref('');
    const messageContent = ref('');
    const messageType = ref('info');

    const newSale = ref({
      cliente: '',
      fecha: new Date().toISOString().substr(0, 10),
      producto: '',
      cantidad: 1,
      precio: 0,
      metodo_pago: 'Efectivo'
    });
    
    const filters = ref({
      date: '',
      client: ''
    });

    const calculatedTotal = computed(() => {
      return (newSale.value.cantidad * newSale.value.precio).toFixed(2);
    });

    const showMessage = (title, message, type = 'info') => {
      messageTitle.value = title;
      messageContent.value = message;
      messageType.value = type;
      showMessageModal.value = true;
    };

    const hideMessage = () => {
      showMessageModal.value = false;
    };

    const openCreateSaleModal = () => {
      newSale.value = { 
        cliente: '',
        fecha: new Date().toISOString().substr(0, 10),
        producto: '',
        cantidad: 1,
        precio: 0,
        metodo_pago: 'Efectivo'
      };
      showCreateModal.value = true;
    };

    const applyFilters = () => {
      showMessage('Filtros aplicados', 'Los filtros se han aplicado correctamente', 'success');
    };

    const resetFilters = () => {
      filters.value = {
        date: '',
        client: ''
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
        
        sales.value = data.data.map(item => ({
          id: item.id ?? null,
          cliente: item.cliente ?? 'Cliente no especificado',
          fecha: item.fecha ?? new Date().toISOString().substr(0, 10),
          producto: item.producto ?? 'Producto no especificado',
          cantidad: item.cantidad ?? 1,
          precio: item.precio ?? 0,
          metodo_pago: item.metodo_pago ?? 'Efectivo'
        }));
      } catch (err) {
        error.value = `Error: ${err.message}`;
        console.error('Error al obtener ventas:', err);
      } finally {
        loading.value = false;
      }
    };

    const createSale = async () => {
      const token = checkAuth();
      if (!token) return;
      
      try {
        const saleData = {
          ...newSale.value,
          total: calculatedTotal.value
        };
        
        const response = await fetch('http://localhost:3000/api/ventas', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(saleData)
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al registrar la venta');
        }
        
        const data = await response.json();
        console.log("Venta registrada:", data);
        
        showCreateModal.value = false;
        showMessage('Éxito', 'Venta registrada correctamente', 'success');
        fetchSales();
      } catch (err) {
        showMessage('Error', err.message, 'error');
      }
    };

    const confirmEdit = () => {
      if (!selectedSale.value) {
        showMessage('Error', 'No hay ninguna venta seleccionada para editar', 'error');
        return;
      }
      showEditModal.value = true;
    };

    const updateSale = async () => {
      const token = checkAuth();
      if (!token) return;
      
      try {
        const saleData = {
          ...selectedSale.value,
          total: selectedSale.value.cantidad * selectedSale.value.precio
        };
        
        const response = await fetch(`http://localhost:3000/api/ventas/${selectedSale.value.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(saleData)
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al actualizar la venta');
        }
        
        const data = await response.json();
        console.log("Venta actualizada:", data);
        
        showEditModal.value = false;
        showMessage('Éxito', 'Venta actualizada correctamente', 'success');
        fetchSales();
      } catch (err) {
        showMessage('Error', err.message, 'error');
      }
    };

    const confirmDelete = () => {
      if (!selectedSale.value) {
        showMessage('Error', 'No hay ninguna venta seleccionada para eliminar', 'error');
        return;
      }
      
      showMessage(
        'Confirmar eliminación', 
        `¿Está seguro que desea eliminar la venta a ${selectedSale.value.cliente} por $${(selectedSale.value.cantidad * selectedSale.value.precio).toFixed(2)}?`, 
        'warning'
      );
    };

    const deleteSale = async () => {
      const token = checkAuth();
      if (!token) return;
      
      try {
        const response = await fetch(`http://localhost:3000/api/ventas/${selectedSale.value.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al eliminar la venta');
        }
        
        selectedSale.value = null;
        showMessage('Éxito', 'Venta eliminada correctamente', 'success');
        fetchSales();
      } catch (err) {
        showMessage('Error', err.message, 'error');
      }
    };

    const handleSaleSelection = (sale) => {
    selectedSale.value = { ...sale };
    };

    const filteredSales = computed(() => {
    let result = sales.value;

    if (filters.value.date) {
        result = result.filter(s => s.fecha === filters.value.date);
    }

    if (filters.value.client) {
        const clientQuery = filters.value.client.toLowerCase();
        result = result.filter(s => 
        s.cliente.toLowerCase().includes(clientQuery)
        );
    }

    return result.map(sale => ({
        id: sale.id,
        cantidad: sale.cantidad,
        id_zapatos: sale.producto,
        fecha_ingreso: sale.fecha,
        estado: sale.metodo_pago,
        cliente: sale.cliente,
        precio: sale.precio,
        total: sale.cantidad * sale.precio
    }));
    });

    onMounted(() => {
      fetchSales();
    });

    watch(() => showMessageModal.value, (newVal) => {
      if (!newVal && messageType.value === 'warning') {
        // Si el usuario cerró el modal de confirmación sin confirmar
        messageType.value = 'info';
      }
    });

    return {
      sales,
      loading,
      error,
      selectedSale,
      showCreateModal,
      showEditModal,
      showMessageModal,
      messageTitle,
      messageContent,
      messageType,
      newSale,
      filters,
      calculatedTotal,
      showMessage,
      hideMessage,
      openCreateSaleModal,
      applyFilters,
      resetFilters,
      createSale,
      confirmEdit,
      updateSale,
      confirmDelete,
      deleteSale,
      handleSaleSelection,
      filteredSales
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
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.filter-group label {
  font-weight: bold;
}

.filter-group input {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

.filter-buttons {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.filter-button {
  padding: 10px 15px;
  border: none;
  border-radius: 4px;
  background-color: #4CAF50;
  color: white;
  cursor: pointer;
  transition: background-color 0.2s;
}

.filter-button:hover {
  background-color: #45a049;
}

.filter-button.reset {
  background-color: #f44336;
}

.filter-button.reset:hover {
  background-color: #d32f2f;
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

.create-button:hover {
  color: #4CAF50;
  border-color: #4CAF50;
}

.edit-button:hover {
  color: #2196F3;
  border-color: #2196F3;
}

.delete-button {
  border: 1px solid #dc3545;
  color: #dc3545;
}

.delete-button:hover {
  background-color: #f9e2e2;
  color: #c9302c;
  border-color: #c9302c;
}

.list-title {
  margin-top: 15px;
  margin-bottom: 10px;
  font-size: 18px;
  font-weight: bold;
  text-align: center;
  width: 100%;
}

.loading-indicator {
  text-align: center;
  padding: 20px;
  font-style: italic;
  color: #666;
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
  padding: 15px;
  border-radius: 8px;
  width: 100%;
  max-width: 500px;
  text-align: center;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-content h2 {
  margin-top: 0;
}

.close {
  float: right;
  font-size: 24px;
  cursor: pointer;
  padding: 5px;
  line-height: 0.8;
}

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

.form-group input[readonly] {
  background-color: #f5f5f5;
}

button[type="submit"] {
  padding: 12px 16px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  margin-top: 10px;
  transition: background-color 0.2s;
}

button[type="submit"]:hover {
  background-color: #45a049;
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
    flex-wrap: wrap;
    justify-content: center;
    gap: 10px;
  }
  
  .action-button {
    width: auto;
  }
  
  .filter-section {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: flex-end;
  }
  
  .filter-group {
    flex: 1;
    min-width: 200px;
  }
  
  .filter-buttons {
    margin-top: 0;
  }
}

/* Media Queries - Desktop */
@media (min-width: 768px) {
  .content-section {
    max-width: 1200px;
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
  
  .modal-content {
    max-width: 600px;
  }
}
</style>