<template>
  <div class="product-management-container">
    <header-component />

    <div class="content-section">
      <div class="page-title">Gestión de Productos - Zapatos</div>

      <div class="actions-section">
        <button class="action-button create-button" @click="openCreateProductModal">
          Agregar Zapato
        </button>
        <button class="action-button edit-button" @click="confirmEdit" :disabled="!selectedProduct">
          Editar Zapato
        </button>
        <button class="action-button delete-button" @click="confirmDelete" :disabled="!selectedProduct">
          Eliminar Zapato
        </button>
      </div>

      <div class="search-section">
        <input 
          v-model="searchQuery" 
          placeholder="Buscar por código, nombre o tipo..." 
          @input="searchProduct"
        />
      </div>

      <h2 class="list-title">Lista de Zapatos</h2>

      <div v-if="loading" class="loading-indicator">
        Cargando productos...
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

    <div v-if="showCreateModal" class="modal">
      <div class="modal-content">
        <span class="close" @click="showCreateModal = false">&times;</span>
        <h2>Agregar Nuevo Zapato</h2>
        <form @submit.prevent="createProduct">
          <div class="form-group">
            <label for="codigo">Código:</label>
            <input 
              type="text" 
              id="codigo" 
              v-model="newProduct.codigo" 
              required 
              pattern="^[A-Za-z0-9]+$"
              title="Solo se permiten letras y números, sin espacios ni caracteres especiales"
              placeholder="Ej: Z001"
            >
          </div>

          <div class="form-group">
            <label for="nombre">Nombre:</label>
            <input 
              type="text" 
              id="nombre" 
              v-model="newProduct.nombre" 
              required
              placeholder="Ej: Zapato Clásico Negro"
            >
          </div>

          <div class="form-group">
            <label for="id_tipo_de_zapato">Tipo de Calzado:</label>
            <select id="id_tipo_de_zapato" v-model="newProduct.id_tipo_de_zapato" required>
              <option value="">Seleccione un tipo</option>
              <option v-for="tipo in tiposCalzado" :key="tipo.id" :value="tipo.id">
                {{ tipo.tipo }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label for="precio_par">Precio por Par (Q):</label>
            <input 
              type="number" 
              id="precio_par" 
              v-model="newProduct.precio_par" 
              required
              min="0"
              step="0.01"
              placeholder="0.00"
            >
          </div>

          <div class="form-group">
            <label for="estado">Estado:</label>
            <select id="estado" v-model="newProduct.estado" required>
              <option value="Disponible">Disponible</option>
              <option value="Agotado">Agotado</option>
            </select>
          </div>

          <div class="tallas-section">
            <h3>Tallas y Stock</h3>
            <div class="tallas-grid">
              <div v-for="talla in tallasDisponibles" :key="talla.id" class="talla-item">
                <label>
                  <input 
                    type="checkbox" 
                    :value="talla.id"
                    :checked="newProduct.tallas.some(t => t.id_talla === talla.id)"
                    @change="toggleTalla(talla.id, $event)"
                  >
                  EU {{ talla.talla_eu }} / US {{ talla.talla_us }}
                </label>
                <input 
                  v-if="newProduct.tallas.find(t => t.id_talla === talla.id)"
                  type="number" 
                  :value="getTallaStock(talla.id)"
                  min="0"
                  placeholder="Stock"
                  class="stock-input"
                  @input="updateTallaStock(talla.id, $event.target.value)"
                >
              </div>
            </div>
          </div>

          <div class="modal-actions">
            <button type="submit" :disabled="!isValidForm">Guardar Zapato</button>
            <button type="button" @click="showCreateModal = false">Cancelar</button>
          </div>
        </form>
      </div>
    </div>

    <div v-if="showEditModal" class="modal">
      <div class="modal-content">
        <span class="close" @click="showEditModal = false">&times;</span>
        <h2>Editar Zapato</h2>
        <form @submit.prevent="updateProduct">
          <div class="form-group">
            <label for="edit-codigo">Código:</label>
            <input 
              type="text" 
              id="edit-codigo" 
              v-model="selectedProduct.codigo" 
              required 
              pattern="^[A-Za-z0-9]+$"
            >
          </div>

          <div class="form-group">
            <label for="edit-nombre">Nombre:</label>
            <input 
              type="text" 
              id="edit-nombre" 
              v-model="selectedProduct.nombre" 
              required
            >
          </div>

          <div class="form-group">
            <label for="edit-id_tipo_de_zapato">Tipo de Calzado:</label>
            <select id="edit-id_tipo_de_zapato" v-model="selectedProduct.tipo_zapato.id" required>
              <option v-for="tipo in tiposCalzado" :key="tipo.id" :value="tipo.id">
                {{ tipo.tipo }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label for="edit-precio_par">Precio por Par (Q):</label>
            <input 
              type="number" 
              id="edit-precio_par" 
              v-model="selectedProduct.precio_par" 
              required
              min="0"
              step="0.01"
            >
          </div>

          <div class="form-group">
            <label for="edit-estado">Estado:</label>
            <select id="edit-estado" v-model="selectedProduct.inventario_general.estado" required>
              <option value="Disponible">Disponible</option>
              <option value="Agotado">Agotado</option>
            </select>
          </div>

          <div class="tallas-section">
            <h3>Tallas y Stock</h3>
            <div class="tallas-grid">
              <div v-for="talla in tallasDisponibles" :key="talla.id" class="talla-item">
                <label>EU {{ talla.talla_eu }} / US {{ talla.talla_us }}</label>
                <input 
                  type="number" 
                  :value="getEditTallaStock(talla.id)"
                  @input="updateEditTallaStock(talla.id, talla.talla_eu, talla.talla_us, $event.target.value)"
                  min="0"
                  placeholder="0"
                  class="stock-input"
                >
              </div>
            </div>
          </div>

          <div class="modal-actions">
            <button type="submit">Actualizar Zapato</button>
            <button type="button" @click="showEditModal = false">Cancelar</button>
          </div>
        </form>
      </div>
    </div>

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

    const tiposCalzado = ref([]);
    const tallasDisponibles = ref([]);

    const newProduct = ref({
      codigo: '',
      nombre: '',
      id_tipo_de_zapato: '',
      precio_par: 0,
      estado: 'Disponible',
      tallas: []
    });

    const searchQuery = ref('');

    const showMessage = (title, message, type = 'info') => {
      messageTitle.value = title;
      messageContent.value = message;
      messageType.value = type;
      showMessageModal.value = true;
    };

    const hideMessage = () => {
      showMessageModal.value = false;
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

    const fetchTiposCalzado = async () => {
      const token = checkAuth();
      if (!token) return;

      try {
        const response = await fetch('http://localhost:3000/api/tipos-calzados', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) throw new Error('Error al cargar tipos de calzado');
        
        const data = await response.json();
        console.log('Tipos de calzado recibidos:', data);
        tiposCalzado.value = data.data;
      } catch (err) {
        console.error('Error al obtener tipos de calzado:', err);
        showMessage('Error', 'No se pudieron cargar los tipos de calzado', 'error');
      }
    };

    const fetchTallas = async () => {
      const token = checkAuth();
      if (!token) return;

      try {
        const response = await fetch('http://localhost:3000/api/tallas', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) throw new Error('Error al cargar tallas');
        
        const data = await response.json();
        tallasDisponibles.value = data.data;
      } catch (err) {
        console.error('Error al obtener tallas:', err);
      }
    };

    const fetchProducts = async () => {
      const token = checkAuth();
      if (!token) return;

      loading.value = true;
      error.value = null;

      try {
        const response = await fetch('http://localhost:3000/api/inventory', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Error al cargar los productos');
        }

        const data = await response.json();
        console.log('Productos recibidos:', data);
        products.value = data.data;
      } catch (err) {
        error.value = `Error: ${err.message}`;
        console.error('Error al obtener productos:', err);
      } finally {
        loading.value = false;
      }
    };

    const toggleTalla = (tallaId, event) => {
      if (event.target.checked) {
        newProduct.value.tallas.push({
          id_talla: tallaId,
          stock: 0
        });
      } else {
        newProduct.value.tallas = newProduct.value.tallas.filter(
          t => t.id_talla !== tallaId
        );
      }
    };

    const getTallaStock = (tallaId) => {
      const talla = newProduct.value.tallas.find(t => t.id_talla === tallaId);
      return talla ? talla.stock : 0;
    };

    const updateTallaStock = (tallaId, stock) => {
      const talla = newProduct.value.tallas.find(t => t.id_talla === tallaId);
      if (talla) {
        talla.stock = parseInt(stock) || 0;
      }
    };

    const getEditTallaStock = (tallaId) => {
      if (!selectedProduct.value || !selectedProduct.value.tallas_disponibles) {
        return 0;
      }
      
      const talla = selectedProduct.value.tallas_disponibles.find(t => t.talla_id === tallaId);
      return talla ? talla.stock : 0;
    };

    const updateEditTallaStock = (tallaId, tallaEu, tallaUs, stock) => {
      if (!selectedProduct.value.tallas_disponibles) {
        selectedProduct.value.tallas_disponibles = [];
      }

      const stockValue = parseInt(stock) || 0;
      const existingTallaIndex = selectedProduct.value.tallas_disponibles.findIndex(t => t.talla_id === tallaId);

      if (existingTallaIndex !== -1) {
        selectedProduct.value.tallas_disponibles[existingTallaIndex].stock = stockValue;
      } else {
        selectedProduct.value.tallas_disponibles.push({
          talla_id: tallaId,
          talla_eu: tallaEu,
          talla_us: tallaUs,
          stock: stockValue
        });
      }
    };

    const isValidForm = computed(() => {
      return newProduct.value.codigo && 
             newProduct.value.nombre && 
             newProduct.value.id_tipo_de_zapato && 
             newProduct.value.precio_par >= 0 &&
             newProduct.value.tallas.length > 0;
    });

    const openCreateProductModal = async () => {
      await fetchTiposCalzado();
      await fetchTallas();
      
      newProduct.value = { 
        codigo: '',
        nombre: '',
        id_tipo_de_zapato: '',
        precio_par: 0,
        estado: 'Disponible',
        tallas: []
      };
      showCreateModal.value = true;
    };

    const createProduct = async () => {
      const token = checkAuth();
      if (!token) return;

      try {
        if (!/^[A-Za-z0-9]+$/.test(newProduct.value.codigo)) {
          showMessage(
            'Error',
            'El código debe ser alfanumérico (sin espacios ni símbolos)',
            'error'
          );
          return;
        }

        const response = await fetch('http://localhost:3000/api/agregarProducto/productos', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(newProduct.value)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al crear el producto');
        }

        const data = await response.json();
        console.log('Producto creado:', data);

        showCreateModal.value = false;
        showMessage('Éxito', 'Producto creado correctamente', 'success');
        fetchProducts();
      } catch (err) {
        showMessage('Error', err.message, 'error');
      }
    };

    const confirmEdit = async () => {
      if (!selectedProduct.value) {
        showMessage('Error', 'No hay ningún producto seleccionado para editar', 'error');
        return;
      }
      
      await fetchTiposCalzado();
      await fetchTallas();
      
      if (!selectedProduct.value.tallas_disponibles) {
        selectedProduct.value.tallas_disponibles = [];
      }

      showEditModal.value = true;
    };

    const updateProduct = async () => {
      const token = checkAuth();
      if (!token) return;

      try {
        const tallasParaEnviar = tallasDisponibles.value
          .map(talla => {
            const tallaExistente = selectedProduct.value.tallas_disponibles.find(t => t.talla_id === talla.id);
            const stock = tallaExistente ? parseInt(tallaExistente.stock) || 0 : 0;
            
            return {
              id_talla: talla.id,
              stock: stock
            };
          })
          .filter(talla => talla.stock > 0);

        const updateData = {
          codigo: selectedProduct.value.codigo,
          nombre: selectedProduct.value.nombre,
          id_tipo_de_zapato: selectedProduct.value.tipo_zapato.id,
          precio_par: parseFloat(selectedProduct.value.precio_par),
          estado: selectedProduct.value.inventario_general.estado,
          tallas: tallasParaEnviar
        };

        console.log('Datos para actualizar:', updateData); 

        const response = await fetch(`http://localhost:3000/api/modificarProducto/productos/${selectedProduct.value.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(updateData)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al actualizar el producto');
        }

        const data = await response.json();
        console.log("Producto actualizado:", data);

        showEditModal.value = false;
        showMessage('Éxito', 'Producto actualizado correctamente', 'success');
        fetchProducts();
      } catch (err) {
        showMessage('Error', err.message, 'error');
      }
    };

    const confirmDelete = () => {
      if (!selectedProduct.value) {
        showMessage('Error', 'No hay ningún producto seleccionado para eliminar', 'error');
        return;
      }

      const codigoToDelete = prompt(`Ingrese el código del producto que desea eliminar (Código seleccionado: ${selectedProduct.value.codigo})`);
      if (codigoToDelete && codigoToDelete === selectedProduct.value.codigo) {
        deleteProduct();
      } else if (codigoToDelete) {
        showMessage('Error', 'El código ingresado no coincide con el producto seleccionado', 'error');
      }
    };

    const deleteProduct = async () => {
      const token = checkAuth();
      if (!token) return;

      try {
        const response = await fetch(`http://localhost:3000/api/inventory/delete/${selectedProduct.value.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al eliminar el producto');
        }

        selectedProduct.value = null;
        showMessage('Éxito', 'Producto eliminado correctamente', 'success');
        fetchProducts();
      } catch (err) {
        showMessage('Error', err.message, 'error');
      }
    };

    const handleProductSelection = (product) => {
      selectedProduct.value = { ...product };
    };

    const searchProduct = () => {
      console.log("Buscar producto:", searchQuery.value);
    };

    const filteredProducts = computed(() => {
      if (!searchQuery.value) return products.value;

      const query = searchQuery.value.toLowerCase();
      return products.value.filter(product => 
        product.codigo?.toLowerCase().includes(query) ||
        product.nombre?.toLowerCase().includes(query) ||
        product.tipo_zapato?.nombre?.toLowerCase().includes(query)
      );
    });

    onMounted(() => {
      fetchProducts();
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
      tiposCalzado,
      tallasDisponibles,
      isValidForm,
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
      filteredProducts,
      toggleTalla,
      getTallaStock,
      updateTallaStock,
      getEditTallaStock,
      updateEditTallaStock
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
  padding: 20px;
  border-radius: 8px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-content h2 {
  margin-top: 0;
  text-align: center;
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

.tallas-section {
  margin-top: 20px;
  padding: 15px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background-color: #f9f9f9;
}

.tallas-section h3 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #333;
  text-align: center;
}

.tallas-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px;
  max-height: 200px;
  overflow-y: auto;
  padding: 10px;
  border: 1px solid #eee;
  border-radius: 4px;
  background-color: white;
}

.talla-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: #fafafa;
}

.talla-item label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  cursor: pointer;
}

.talla-item input[type="checkbox"] {
  width: auto;
  margin: 0;
}

.stock-input {
  padding: 5px;
  border: 1px solid #ccc;
  border-radius: 3px;
  font-size: 14px;
  width: 100%;
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
  transition: background-color 0.2s;
}

.modal-actions button[type="submit"] {
  background-color: #4CAF50;
  color: white;
  border-color: #4CAF50;
}

.modal-actions button[type="submit"]:hover:not(:disabled) {
  background-color: #45a049;
}

.modal-actions button[type="submit"]:disabled {
  background-color: #ccc;
  color: #666;
  cursor: not-allowed;
}

.modal-actions button[type="button"] {
  background-color: #6c757d;
  color: white;
  border-color: #6c757d;
}

.modal-actions button[type="button"]:hover {
  background-color: #5a6268;
  border-color: #545b62;
}

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
    min-width: 150px;
  }
  
  .modal-actions {
    flex-direction: row;
    justify-content: center;
  }
  
  .modal-actions button {
    width: auto;
    min-width: 120px;
  }

  .tallas-grid {
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  }
}

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

  .tallas-grid {
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    max-height: 250px;
  }
}

@media (max-width: 400px) {
  .tallas-grid {
    grid-template-columns: 1fr;
  }
  
  .talla-item {
    padding: 8px;
  }
}
</style>