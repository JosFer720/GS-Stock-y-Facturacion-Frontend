<template>
  <div class="product-management-container">
    <header-component />

    <div class="content-section">
      <div class="page-title">Gestión de Productos</div>

      <div class="actions-section">
        <button class="action-button create-button" @click="openCreateProductModal">
          Crear Producto
        </button>
        <button class="action-button edit-button" @click="showEditConfirmation = true">
          Editar Producto
        </button>
        <button class="action-button search-button" @click="toggleSearch">
          Buscar Producto
        </button>
        <button class="action-button delete-button" @click="showDeleteConfirmation = true">
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

    <div v-if="showCreateModal" class="modal">
      <div class="modal-content">
        <span class="close" @click="showCreateModal = false">&times;</span>
        <h2>Crear Nuevo Producto</h2>
        <form @submit.prevent="createProduct">
          <div class="form-group" v-for="field in ['nombre', 'codigo', 'precio', 'stock']" :key="field">
            <label :for="field">{{ field.charAt(0).toUpperCase() + field.slice(1) }}:</label>
            <input :type="field === 'precio' || field === 'stock' ? 'number' : 'text'" :id="field" v-model="newProduct[field]" required>
          </div>
          <button type="submit">Guardar</button>
        </form>
      </div>
    </div>

    <div v-if="showEditModal" class="modal">
      <div class="modal-content">
        <span class="close" @click="showEditModal = false">&times;</span>
        <h2>Editar Producto</h2>
        <form @submit.prevent="updateProduct">
          <div class="form-group" v-for="field in ['nombre', 'codigo', 'precio', 'stock']" :key="field">
            <label :for="field">{{ field.charAt(0).toUpperCase() + field.slice(1) }}:</label>
            <input :type="field === 'precio' || field === 'stock' ? 'number' : 'text'" :id="field" v-model="selectedProduct[field]" required>
          </div>
          <button type="submit">Actualizar</button>
        </form>
      </div>
    </div>

    <div v-if="showDeleteConfirmation" class="modal">
      <div class="modal-content">
        <h2>Confirmación</h2>
        <p v-if="selectedProduct">
          ¿Estás seguro de eliminar el producto <strong>{{ selectedProduct.nombre }}</strong>?
        </p>
        <p v-else>
          No hay ningún producto seleccionado para eliminar.
        </p>
        <div class="modal-actions">
          <button @click="deleteProduct" :disabled="!selectedProduct">Sí, Eliminar</button>
          <button @click="showDeleteConfirmation = false">Cancelar</button>
        </div>
      </div>
    </div>

    <div v-if="showEditConfirmation" class="modal">
      <div class="modal-content">
        <h2>Confirmación</h2>
        <p v-if="selectedProduct">
          ¿Estás seguro de que deseas editar el producto <strong>{{ selectedProduct.nombre }}</strong>?
        </p>
        <p v-else>
          No hay ningún producto seleccionado para editar.
        </p>
        <div class="modal-actions">
          <button @click="confirmEdit" :disabled="!selectedProduct">Sí, Editar</button>
          <button @click="showEditConfirmation = false">Cancelar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import ProductsTable from '@/components/ProductsTable.vue';
import HeaderComponent from '@/components/HeaderComponent.vue';

const products = ref(Array.from({ length: 50 }, (_, i) => ({
  id: i + 1,
  nombre: `Producto ${i + 1}`,
  codigo: `P${(i + 1).toString().padStart(3, '0')}`,
  precio: Math.floor(Math.random() * 400) + 50,
  stock: Math.floor(Math.random() * 100) + 1
})));

const selectedProduct = ref(null);
const showCreateModal = ref(false);
const showEditModal = ref(false);
const showSearch = ref(false);
const showDeleteConfirmation = ref(false);
const showEditConfirmation = ref(false);

const newProduct = ref({ nombre: '', codigo: '', precio: '', stock: '' });
const searchQuery = ref({ nombre: '', codigo: '' });

const openCreateProductModal = () => {
  newProduct.value = { nombre: '', codigo: '', precio: '', stock: '' };
  showCreateModal.value = true;
};

const toggleSearch = () => {
  showSearch.value = !showSearch.value;
};

const createProduct = () => {
  const id = products.value.length + 1;
  products.value.push({ id, ...newProduct.value });
  showCreateModal.value = false;
};

const confirmEdit = () => {
  if (!selectedProduct.value) {
    showEditConfirmation.value = false;
    return;
  }
  showEditModal.value = true;
  showEditConfirmation.value = false;
};

const updateProduct = () => {
  showEditModal.value = false;
};

const deleteProduct = () => {
  if (!selectedProduct.value) {
    showDeleteConfirmation.value = false;
    return;
  }
  products.value = products.value.filter(
    (product) => product.id !== selectedProduct.value.id
  );
  selectedProduct.value = null;
  showDeleteConfirmation.value = false;
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
  font-size: 16px; /* Mejor para inputs en móviles */
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

.delete-button {
  border: 1px solid #dc3545;
  color: #dc3545;
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
  
  .actions-section {
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
    gap: 10px;
  }
  
  .action-button {
    width: auto;
  }
  
  .list-title {
    font-size: 20px;
  }
}
</style>