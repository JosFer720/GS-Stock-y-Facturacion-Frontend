<template>
  <div class="product-management-container">
    <header-component />

    <div class="content-section">
      <div class="page-title">Gestión de Inventarios</div>

      <div class="actions-section">
        <button class="action-button create-button" @click="openCreateProductModal">
          Crear Inventario
        </button>
        <button class="action-button edit-button" @click="confirmEdit" :disabled="!selectedProduct">
          Editar Inventario
        </button>
        <button class="action-button search-button" @click="toggleSearch">
          Buscar Inventario
        </button>
        <button class="action-button delete-button" @click="confirmDelete" :disabled="!selectedProduct">
          Eliminar Inventario
        </button>
      </div>

      <div v-if="showSearch" class="search-section">
        <input v-model="searchQuery.nombre" placeholder="Buscar por nombre" />
        <input v-model="searchQuery.codigo" placeholder="Buscar por código" />
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
        <h2>Crear Nuevo Inventario</h2>
        <form @submit.prevent="createProduct">
          <div class="form-group" v-for="field in formFields" :key="field.name">
            <label :for="field.name">{{ field.label }}:</label>
            <input 
              :type="field.type" 
              :id="field.name" 
              v-model="newProduct[field.name]" 
              required
              step="any"
            >
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
          <div class="form-group" v-for="field in formFields" :key="field.name">
            <label :for="'edit-' + field.name">{{ field.label }}:</label>
            <input 
              :type="field.type" 
              :id="'edit-' + field.name" 
              v-model="selectedProduct[field.name]" 
              required
              step="any"
            >
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
    const showSearch = ref(false);
    const showMessageModal = ref(false);
    const messageTitle = ref('');
    const messageContent = ref('');
    const messageType = ref('info');

    const newProduct = ref({
      nombre: '',
      codigo: '',
      cantidad: '',
      estado: 'activo',
      ubicacion: ''
    });
    
    const formFields = [
      { name: 'nombre', label: 'Nombre', type: 'text' },
      { name: 'codigo', label: 'Código', type: 'text' },
      { name: 'cantidad', label: 'Cantidad', type: 'number' },
      { name: 'estado', label: 'Estado', type: 'text' },
      { name: 'ubicacion', label: 'Ubicación', type: 'text' }
    ];
    
    const searchQuery = ref({ nombre: '', codigo: '' });

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
        nombre: '',
        codigo: '',
        cantidad: '',
        estado: 'activo',
        ubicacion: ''
      };
      showCreateModal.value = true;
    };

    const toggleSearch = () => {
      showSearch.value = !showSearch.value;
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
        console.log('Datos recibidos:', data); // Para depuración
        
        // Asegúrate de mapear todos los campos necesarios
        products.value = data.data.map(item => ({
          id: item.id ?? null,
          cantidad: item.cantidad ?? 0,
          id_zapatos: item.id_zapatos ?? null,
          fecha_ingreso: item.fecha_de_ingreso ?? null,
          id_usuario: item.id_usuarios ?? null,
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
        
        showCreateModal.value = false;
        showMessage('Éxito', 'Inventario creado correctamente', 'success');
        fetchInventarios(); // Recargar la lista
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
          body: JSON.stringify(selectedProduct.value)
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al actualizar el inventario');
        }
        
        showEditModal.value = false;
        showMessage('Éxito', 'Inventario actualizado correctamente', 'success');
        fetchInventarios(); // Recargar la lista
      } catch (err) {
        showMessage('Error', err.message, 'error');
      }
    };

    const confirmDelete = () => {
      if (!selectedProduct.value) {
        showMessage('Error', 'No hay ningún inventario seleccionado para eliminar', 'error');
        return;
      }
      
      if (confirm(`¿Estás seguro de eliminar el inventario "${selectedProduct.value.nombre}"?`)) {
        deleteProduct();
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
        
        products.value = products.value.filter(
          (product) => product.id !== selectedProduct.value.id
        );
        selectedProduct.value = null;
        showMessage('Éxito', 'Inventario eliminado correctamente', 'success');
      } catch (err) {
        showMessage('Error', err.message, 'error');
      }
    };

    const handleProductSelection = (product) => {
      selectedProduct.value = { ...product };
    };

    const filteredProducts = computed(() => {
      let result = products.value;

      if (searchQuery.value.nombre) {
        result = result.filter(p =>
          p.nombre.toLowerCase().includes(searchQuery.value.nombre.toLowerCase())
        );
      }

      if (searchQuery.value.codigo) {
        result = result.filter(p =>
          p.codigo.toLowerCase().includes(searchQuery.value.codigo.toLowerCase())
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
      showSearch,
      showMessageModal,
      messageTitle,
      messageContent,
      messageType,
      newProduct,
      searchQuery,
      formFields,
      showMessage,
      hideMessage,
      openCreateProductModal,
      toggleSearch,
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
  display: flex;
  flex-direction: column;
  gap: 8px;
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

.search-button:hover {
  color: #FF9800;
  border-color: #FF9800;
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

.form-group input {
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
  
  .search-section {
    flex-direction: row;
    justify-content: center;
  }
  
  .search-section input {
    max-width: 250px;
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