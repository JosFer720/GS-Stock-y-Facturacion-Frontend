<template>
  <div class="product-management-container">
    <header-component />

    <div class="content-section">
      <div class="page-title">Gestión de Productos</div>

      <div class="actions-section">
        <button class="action-button create-button" @click="openCreateProductModal">
          Crear Producto
        </button>
        <button class="action-button edit-button" @click="confirmEdit" :disabled="!selectedProduct">
          Editar Producto
        </button>
        <button class="action-button search-button" @click="toggleSearch">
          Buscar Producto
        </button>
        <button class="action-button delete-button" @click="confirmDelete" :disabled="!selectedProduct">
          Eliminar Producto
        </button>
      </div>

      <div v-if="showSearch" class="search-section">
        <input v-model="searchQuery.nombre" placeholder="Buscar por nombre" />
        <input v-model="searchQuery.codigo" placeholder="Buscar por código" />
      </div>

      <h2 class="list-title">Lista de productos</h2>

      <products-table
        :products="filteredProducts"
        @product-selected="handleProductSelection"
      />
    </div>

    <!-- Modal para crear producto -->
    <div v-if="showCreateModal" class="modal">
      <div class="modal-content">
        <span class="close" @click="showCreateModal = false">&times;</span>
        <h2>Crear Nuevo Producto</h2>
        <form @submit.prevent="createProduct">
          <div class="form-group" v-for="field in ['nombre', 'codigo', 'precio', 'stock']" :key="field">
            <label :for="field">{{ field.charAt(0).toUpperCase() + field.slice(1) }}:</label>
            <input 
              :type="field === 'precio' || field === 'stock' ? 'number' : 'text'" 
              :id="field" 
              v-model="newProduct[field]" 
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
        <h2>Editar Producto</h2>
        <form @submit.prevent="updateProduct">
          <div class="form-group" v-for="field in ['nombre', 'codigo', 'precio', 'stock']" :key="field">
            <label :for="'edit-' + field">{{ field.charAt(0).toUpperCase() + field.slice(1) }}:</label>
            <input 
              :type="field === 'precio' || field === 'stock' ? 'number' : 'text'" 
              :id="'edit-' + field" 
              v-model="selectedProduct[field]" 
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
import { ref, computed } from 'vue';
import ProductsTable from '@/components/ProductsTable.vue';
import HeaderComponent from '@/components/HeaderComponent.vue';
import ModalMessage from '@/components/ModalMessage.vue';

export default {
  name: 'ProductManagementView',
  components: {
    ProductsTable,
    HeaderComponent,
    ModalMessage
  },
  setup() {
    const products = ref([
      { id: 1, nombre: 'Producto 1', codigo: 'P001', precio: 100, stock: 50 },
      { id: 2, nombre: 'Producto 2', codigo: 'P002', precio: 200, stock: 30 },
      { id: 3, nombre: 'Producto 3', codigo: 'P003', precio: 150, stock: 20 }
    ]);

    const selectedProduct = ref(null);
    const showCreateModal = ref(false);
    const showEditModal = ref(false);
    const showSearch = ref(false);
    const showMessageModal = ref(false);
    const messageTitle = ref('');
    const messageContent = ref('');
    const messageType = ref('info');

    const newProduct = ref({ nombre: '', codigo: '', precio: '', stock: '' });
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
      newProduct.value = { nombre: '', codigo: '', precio: '', stock: '' };
      showCreateModal.value = true;
    };

    const toggleSearch = () => {
      showSearch.value = !showSearch.value;
    };

    const createProduct = () => {
      const id = products.value.length > 0 
        ? Math.max(...products.value.map(p => p.id)) + 1 
        : 1;
      
      products.value.push({ 
        id, 
        ...newProduct.value,
        precio: parseFloat(newProduct.value.precio),
        stock: parseInt(newProduct.value.stock)
      });
      
      showCreateModal.value = false;
      showMessage('Éxito', 'Producto creado correctamente', 'success');
    };

    const confirmEdit = () => {
      if (!selectedProduct.value) {
        showMessage('Error', 'No hay ningún producto seleccionado para editar', 'error');
        return;
      }
      showEditModal.value = true;
    };

    const updateProduct = () => {
      showEditModal.value = false;
      showMessage('Éxito', 'Producto actualizado correctamente', 'success');
    };

    const confirmDelete = () => {
      if (!selectedProduct.value) {
        showMessage('Error', 'No hay ningún producto seleccionado para eliminar', 'error');
        return;
      }
      
      if (confirm(`¿Estás seguro de eliminar el producto "${selectedProduct.value.nombre}"?`)) {
        deleteProduct();
      }
    };

    const deleteProduct = () => {
      products.value = products.value.filter(
        (product) => product.id !== selectedProduct.value.id
      );
      selectedProduct.value = null;
      showMessage('Éxito', 'Producto eliminado correctamente', 'success');
    };

    const handleProductSelection = (product) => {
      selectedProduct.value = product;
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


    return {
      products,
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