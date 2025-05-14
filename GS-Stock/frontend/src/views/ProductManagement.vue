<template>
  <div class="product-management-container">
    <header-component />

    <div class="content-section">
      <div class="page-title">Gestión de Inventarios</div>

      <div class="actions-section">
        <button class="action-button create-button" @click="openCreateProductModal">
          Agregar al Inventario
        </button>
        <button class="action-button edit-button" @click="confirmEdit" :disabled="!selectedProduct">
          Editar Inventario
        </button>
        <button class="action-button delete-button" @click="confirmDelete" :disabled="!selectedProduct">
          Eliminar Inventario
        </button>
      </div>

      <div class="search-section">
        <input 
          v-model="searchQuery.id" 
          placeholder="Buscar por ID del producto" 
          @input="searchProduct"
        />
      </div>

      <h2 class="list-title">Lista de inventarios</h2>

      <div v-if="loading" class="loading-indicator">
        Cargando inventarios...
      </div>
      
      <div v-if="error" class="error-message">
        {{ error }}
      </div>

      <products-table
        v-if="!loading && !error"
        :products="filteredProducts"
        @product-selected="handleProductSelection"
      />
    </div>

    <!-- Modal para crear producto -->
    <div v-if="showCreateModal" class="modal">
      <div class="modal-content">
        <span class="close" @click="showCreateModal = false">&times;</span>
        <h2>Agregar al Inventario</h2>
        <form @submit.prevent="createProduct">
          <div class="form-group">
            <label for="cantidad">Cantidad:</label>
            <input 
              type="number" 
              id="cantidad" 
              v-model="newProduct.cantidad" 
              required
              min="1"
            >
          </div>
          <div class="form-group">
            <label for="id_zapatos">ID de Zapatos:</label>
            <input 
              type="number" 
              id="id_zapatos" 
              v-model="newProduct.id_zapatos" 
              required
              min="1"
            >
          </div>
          <div class="form-group">
            <label for="id_usuarios">ID de Usuario:</label>
            <input 
              type="number" 
              id="id_usuarios" 
              v-model="newProduct.id_usuarios" 
              required
              min="1"
            >
          </div>
          <div class="form-group">
            <label for="estado">Estado:</label>
            <select id="estado" v-model="newProduct.estado" required>
              <option value="Disponible">Disponible</option>
              <option value="Agotado">Agotado</option>
            </select>
          </div>
          <button type="submit">Guardar</button>
        </form>
      </div>
    </div>

    <!-- Modal para editar producto -->
    <div v-if="showEditModal" class="modal">
      <div class="modal-content">
        <span class="close" @click="showEditModal = false">&times;</span>
        <h2>Editar Inventario</h2>
        <form @submit.prevent="updateProduct">
          <div class="form-group">
            <label for="edit-cantidad">Cantidad:</label>
            <input 
              type="number" 
              id="edit-cantidad" 
              v-model="selectedProduct.cantidad" 
              required
              min="1"
            >
          </div>
          <div class="form-group">
            <label for="edit-id_zapatos">ID de Zapatos:</label>
            <input 
              type="number" 
              id="edit-id_zapatos" 
              v-model="selectedProduct.id_zapatos" 
              required
              min="1"
            >
          </div>
          <div class="form-group">
            <label for="edit-id_usuarios">ID de Usuario:</label>
            <input 
              type="number" 
              id="edit-id_usuarios" 
              v-model="selectedProduct.id_usuarios" 
              required
              min="1"
            >
          </div>
          <div class="form-group">
            <label for="edit-estado">Estado:</label>
            <select id="edit-estado" v-model="selectedProduct.estado" required>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
              <option value="agotado">Agotado</option>
            </select>
          </div>
          <button type="submit">Actualizar</button>
        </form>
      </div>
    </div>

    <!-- Modal para confirmaciones -->
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
import ProductsTable from '@/components/ProductsTable.vue';
import HeaderComponent from '@/components/HeaderComponent.vue';
import ModalMessage from '@/components/ModalMessage.vue';
import { useRouter } from 'vue-router';

export default {
  name: 'ProductManagementView',
  components: {
    ProductsTable,
    HeaderComponent,
    ModalMessage
  },
  setup() {
    const router = useRouter();
    const products = ref([]);
    const loading = ref(true);
    const error = ref(null);
    const selectedProduct = ref(null);
    const showCreateModal = ref(false);
    const showEditModal = ref(false);
    const showMessageModal = ref(false);
    const messageTitle = ref('');
    const messageContent = ref('');
    const messageType = ref('info');

    const newProduct = ref({
      cantidad: '',
      id_zapatos: '',
      id_usuarios: '',
      estado: 'activo'
    });
    
    const searchQuery = ref({ id: '' });

    const showMessage = (title, message, type = 'info') => {
      messageTitle.value = title;
      messageContent.value = message;
      messageType.value = type;
      showMessageModal.value = true;
    };

    const hideMessage = () => {
      showMessageModal.value = false;
    };

    const openCreateProductModal = () => {
      newProduct.value = { 
        cantidad: '',
        id_zapatos: '',
        id_usuarios: '',
        estado: 'activo'
      };
      showCreateModal.value = true;
    };

    const searchProduct = () => {
      // endpointColocarDespues para buscar por ID
      console.log("Buscar producto con ID:", searchQuery.value.id);
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

    const fetchInventarios = async () => {
      const token = checkAuth();
      if (!token) return;
      
      loading.value = true;
      error.value = null;
      
      try {
        const response = await fetch('http://localhost:3000/api/inventarios', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al cargar los inventarios');
        }
        
        const data = await response.json();
        console.log('Datos recibidos:', data);
        
        products.value = data.data.map(item => ({
          id: item.id ?? null,
          cantidad: item.cantidad ?? 0,
          id_zapatos: item.id_zapatos ?? null,
          fecha_ingreso: item.fecha_de_ingreso ?? null,
          id_usuarios: item.id_usuarios ?? null,
          estado: item.estado ?? 'Desconocido'
        }));
      } catch (err) {
        error.value = `Error: ${err.message}`;
        console.error('Error al obtener inventarios:', err);
      } finally {
        loading.value = false;
      }
    };

    const createProduct = async () => {
      const token = checkAuth();
      if (!token) return;
      
      try {
        const response = await fetch('http://localhost:3000/api/inventarios', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(newProduct.value)
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al crear el inventario');
        }
        
        const data = await response.json();
        console.log("Inventario creado:", data);
        
        showCreateModal.value = false;
        showMessage('Éxito', 'Inventario creado correctamente', 'success');
        fetchInventarios();
      } catch (err) {
        showMessage('Error', err.message, 'error');
      }
    };

    const confirmEdit = () => {
      if (!selectedProduct.value) {
        showMessage('Error', 'No hay ningún inventario seleccionado para editar', 'error');
        return;
      }
      showEditModal.value = true;
    };

    const updateProduct = async () => {
      const token = checkAuth();
      if (!token) return;
      
      try {
        const response = await fetch(`http://localhost:3000/api/inventarios/${selectedProduct.value.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            cantidad: selectedProduct.value.cantidad,
            id_zapatos: selectedProduct.value.id_zapatos,
            id_usuarios: selectedProduct.value.id_usuarios,
            estado: selectedProduct.value.estado
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al actualizar el inventario');
        }
        
        const data = await response.json();
        console.log("Inventario actualizado:", data);
        
        showEditModal.value = false;
        showMessage('Éxito', 'Inventario actualizado correctamente', 'success');
        fetchInventarios();
      } catch (err) {
        showMessage('Error', err.message, 'error');
      }
    };

    const confirmDelete = () => {
      if (!selectedProduct.value) {
        showMessage('Error', 'No hay ningún inventario seleccionado para eliminar', 'error');
        return;
      }
      
      const idToDelete = prompt(`Ingrese el ID del producto que desea eliminar (ID seleccionado: ${selectedProduct.value.id})`);
      if (idToDelete && idToDelete === selectedProduct.value.id.toString()) {
        deleteProduct();
      } else if (idToDelete) {
        showMessage('Error', 'El ID ingresado no coincide con el producto seleccionado', 'error');
      }
    };

    const deleteProduct = async () => {
      const token = checkAuth();
      if (!token) return;
      
      try {
        const response = await fetch(`http://localhost:3000/api/inventarios/${selectedProduct.value.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al eliminar el inventario');
        }
        
        selectedProduct.value = null;
        showMessage('Éxito', 'Inventario eliminado correctamente', 'success');
        fetchInventarios();
      } catch (err) {
        showMessage('Error', err.message, 'error');
      }
    };

    const handleProductSelection = (product) => {
      selectedProduct.value = { ...product };
    };

    const filteredProducts = computed(() => {
      let result = products.value;

      if (searchQuery.value.id) {
        result = result.filter(p =>
          p.id.toString().includes(searchQuery.value.id)
        );
      }

      return result;
    });

    onMounted(() => {
      fetchInventarios();
    });

    return {
      products,
      loading,
      error,
      selectedProduct,
      showCreateModal,
      showEditModal,
      showMessageModal,
      messageTitle,
      messageContent,
      messageType,
      newProduct,
      searchQuery,
      showMessage,
      hideMessage,
      openCreateProductModal,
      searchProduct,
      createProduct,
      confirmEdit,
      updateProduct,
      confirmDelete,
      deleteProduct,
      handleProductSelection,
      filteredProducts
    };
  }
}
</script>

<style scoped>
/* Estilos anteriores se mantienen igual */
.product-management-container {
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

.search-section {
  margin-bottom: 15px;
  width: 100%;
}

.search-section input {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  width: 100%;
  box-sizing: border-box;
  font-size: 16px;
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
  max-width: 400px;
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

.modal-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 20px;
  width: 100%;
}

.modal-actions button {
  padding: 12px 16px;
  cursor: pointer;
  border-radius: 4px;
  border: 1px solid #333;
  background-color: #f8f8f8;
  font-size: 16px;
  width: 100%;
}

.modal-actions button:first-child {
  background-color: #333;
  color: white;
}

.modal-actions button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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
  
  .modal-actions {
    flex-direction: row;
    justify-content: center;
  }
  
  .modal-actions button {
    width: auto;
    min-width: 120px;
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
}
</style>