<template>
  <div class="product-management-container">
    <header-component />
    
    <div class="content-section">
      <div class="page-title">Gestión de Productos - Zapatos</div>

      <div class="search-section">
        <input 
          v-model="searchQuery" 
          placeholder="Buscar por código, nombre o tipo..." 
          @input="searchProduct"
        />
      </div>

      <div v-if="showActions" class="actions-section">
        <button class="action-button create-button" @click="openCreateProductModal">
          Agregar Zapato
        </button>
        <button 
          v-if="!deleteMode" 
          class="action-button delete-button" 
          @click="enterDeleteMode"
        >
          Eliminar Zapato
        </button>
        <div v-if="deleteMode" class="delete-mode-actions">
          <button 
            class="action-button delete-button" 
            @click="confirmBulkDelete" 
            :disabled="selectedProducts.length === 0"
          >
            Eliminar Seleccionados ({{ selectedProducts.length }})
          </button>
          <button class="action-button cancel-button" @click="cancelDeleteMode">
            Cancelar
          </button>
        </div>
      </div>

      <h2 class="list-title">Lista de Zapatos</h2>

      <div v-if="loading" class="loading-indicator">
        Cargando productos...
      </div>
      
      <div v-if="error" class="error-message">
        {{ error }}
      </div>

      <div v-if="!loading && !error" class="products-table-container">
        <div class="table-responsive">
          <table class="products-table">
            <thead>
              <tr>
                <th v-if="showActions && deleteMode">
                  <input 
                    type="checkbox" 
                    @change="toggleSelectAll"
                    :checked="areAllSelected"
                  >
                </th>
                <th>Código</th>
                <th>Nombre</th>
                <th>Tipo</th>
                <th>Precio por Par</th>
                <th>Stock Total</th>
                <th>Tallas Disponibles</th>
                <th>Estado</th>
                <th v-if="showActions && !deleteMode">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="product in paginatedProducts" :key="product.id">
                <td v-if="showActions && deleteMode">
                  <input 
                    type="checkbox" 
                    :value="product.id"
                    :checked="selectedProducts.includes(product.id)"
                    @change="toggleProductSelection(product.id)"
                  >
                </td>
                <td>{{ product.codigo || '-' }}</td>
                <td>{{ product.nombre || '-' }}</td>
                <td>{{ product.tipo_zapato?.nombre || '-' }}</td>
                <td class="precio">Q{{ formatPrice(product.precio_par) }}</td>
                <td class="stock-cell">
                  <span :class="getStockClass(product.resumen_stock.stock_total)">
                    {{ product.resumen_stock.stock_total }}
                  </span>
                </td>
                <td class="tallas-summary">
                  <div class="tallas-info">
                    <span class="tallas-count">{{ product.resumen_stock.tallas_con_stock }} tallas</span>
                    <button @click.stop="showTallasModal(product)" class="ver-tallas-btn" :disabled="!product.tallas_disponibles?.length">
                      Ver Detalles
                    </button>
                  </div>
                </td>
                <td>
                  <span :class="getStatusClass(product.inventario_general.estado)">
                    {{ product.inventario_general.estado }}
                  </span>
                </td>
                <td v-if="showActions && !deleteMode">
                  <button @click.stop="editProduct(product)" class="edit-btn">
                    Editar
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="card-view">
          <div v-for="product in paginatedProducts" :key="product.id" class="product-card">
            <div class="card-content">
              <div class="card-header">
                <div class="card-title-section">
                  <input 
                    v-if="showActions && deleteMode" 
                    type="checkbox" 
                    :value="product.id"
                    :checked="selectedProducts.includes(product.id)"
                    @change="toggleProductSelection(product.id)"
                    class="mobile-checkbox"
                  >
                  <div>
                    <h3>{{ product.nombre }}</h3>
                    <span class="codigo">{{ product.codigo }}</span>
                  </div>
                </div>
              </div>
              
              <div class="card-row">
                <strong>Tipo:</strong>
                <span>{{ product.tipo_zapato?.nombre || '-' }}</span>
              </div>
              
              <div class="card-row">
                <strong>Precio por Par:</strong>
                <span class="precio">Q{{ formatPrice(product.precio_par) }}</span>
              </div>
              
              <div class="card-row">
                <strong>Stock Total:</strong>
                <span :class="getStockClass(product.resumen_stock.stock_total)">
                  {{ product.resumen_stock.stock_total }}
                </span>
              </div>
              
              <div class="card-row">
                <strong>Tallas:</strong>
                <div class="tallas-mobile">
                  <span class="tallas-count">{{ product.resumen_stock.tallas_con_stock }} disponibles</span>
                  <button 
                    @click.stop="showTallasModal(product)" 
                    class="ver-tallas-btn small"
                    :disabled="!product.tallas_disponibles?.length"
                  >
                    Ver Detalles
                  </button>
                </div>
              </div>
              
              <div class="card-row">
                <strong>Estado:</strong>
                <span :class="getStatusClass(product.inventario_general.estado)">
                  {{ product.inventario_general.estado }}
                </span>
              </div>
              
              <button 
                v-if="showActions && !deleteMode" 
                @click.stop="editProduct(product)" 
                class="edit-btn"
              >
                Editar
              </button>
            </div>
          </div>
        </div>

        <div class="pagination">
          <button 
            @click="previousPage" 
            :disabled="currentPage === 1"
            class="pagination-nav"
          >
            ‹
          </button>
          
          <div class="page-numbers">
            <button
              v-for="pageNum in displayedPageNumbers"
              :key="pageNum"
              @click="currentPage = pageNum"
              :class="{ active: currentPage === pageNum }"
            >
              {{ pageNum }}
            </button>
          </div>
          
          <button 
            @click="nextPage" 
            :disabled="currentPage === totalPages"
            class="pagination-nav"
          >
            ›
          </button>
        </div>
      </div>
    </div>

    <div v-if="showActions">
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
    </div>

    <div v-if="showModal" class="modal">
      <div class="modal-content">
        <span class="close" @click="closeModal">&times;</span>
        <h2>Detalles de Tallas</h2>
        <div class="tallas-details">
          <div v-for="talla in selectedProductTallas" :key="talla.id_talla" class="talla-detail-item">
            <div class="talla-info-detail">
              <span class="talla-size">EU {{ talla.numero }} / US {{ talla.talla_us }}</span>
              <span class="talla-stock" :class="getStockClass(talla.stock)">
                Stock: {{ talla.stock }}
              </span>
            </div>
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" @click="closeModal">Cerrar</button>
        </div>
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
import HeaderComponent from '@/components/HeaderComponent.vue';
import ModalMessage from '@/components/ModalMessage.vue';
import { useRouter } from 'vue-router';

export default {
  name: 'ProductManagementView',
  components: {
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
    const showModal = ref(false);
    const selectedProductTallas = ref([]);
    const deleteMode = ref(false);
    const selectedProducts = ref([]);
    const currentPage = ref(1);
    const perPage = ref(15);
    const isMobile = ref(false);
    const userRole = ref(null);

    const showActions = computed(() => {
      return userRole.value && ['Administrador', 'Secretaria'].includes(userRole.value);
    });

    const formatPrice = (price) => {
      if (!price && price !== 0) return '0.00';
      return parseFloat(price).toFixed(2);
    };

    const getStockClass = (stock) => {
      if (stock <= 0) return 'stock-agotado';
      if (stock <= 10) return 'stock-bajo';
      return 'stock-normal';
    };

    const getStatusClass = (estado) => {
      switch (estado?.toLowerCase()) {
        case 'disponible': return 'status-disponible';
        case 'agotado': return 'status-agotado';
        case 'sin registrar': return 'status-sin-registrar';
        default: return 'status-default';
      }
    };

    const paginatedProducts = computed(() => {
      const start = (currentPage.value - 1) * perPage.value;
      return filteredProducts.value.slice(start, start + perPage.value);
    });

    const totalPages = computed(() => {
      return Math.ceil(filteredProducts.value.length / perPage.value);
    });

    const displayedPageNumbers = computed(() => {
      const maxVisibleButtons = isMobile.value ? 3 : 5;
      if (totalPages.value <= maxVisibleButtons) {
        return Array.from({ length: totalPages.value }, (_, i) => i + 1);
      }
      let start = Math.max(1, currentPage.value - Math.floor(maxVisibleButtons / 2));
      const end = Math.min(totalPages.value, start + maxVisibleButtons - 1);
      if (end === totalPages.value) {
        start = Math.max(1, totalPages.value - maxVisibleButtons + 1);
      }
      return Array.from({ length: end - start + 1 }, (_, i) => start + i);
    });

    const areAllSelected = computed(() => {
      return paginatedProducts.value.length > 0 && 
             paginatedProducts.value.every(product => selectedProducts.value.includes(product.id));
    });

    const previousPage = () => {
      if (currentPage.value > 1) {
        currentPage.value--;
      }
    };

    const nextPage = () => {
      if (currentPage.value < totalPages.value) {
        currentPage.value++;
      }
    };

    const toggleProductSelection = (productId) => {
      const index = selectedProducts.value.indexOf(productId);
      if (index > -1) {
        selectedProducts.value.splice(index, 1);
      } else {
        selectedProducts.value.push(productId);
      }
    };

    const toggleSelectAll = () => {
      if (areAllSelected.value) {
        const currentPageIds = paginatedProducts.value.map(p => p.id);
        selectedProducts.value = selectedProducts.value.filter(id => !currentPageIds.includes(id));
      } else {
        const currentPageIds = paginatedProducts.value.map(p => p.id);
        currentPageIds.forEach(id => {
          if (!selectedProducts.value.includes(id)) {
            selectedProducts.value.push(id);
          }
        });
      }
    };

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

    const enterDeleteMode = () => {
      deleteMode.value = true;
      selectedProducts.value = [];
    };

    const cancelDeleteMode = () => {
      deleteMode.value = false;
      selectedProducts.value = [];
    };

    const confirmBulkDelete = () => {
      if (selectedProducts.value.length === 0) {
        showMessage('Error', 'No hay productos seleccionados para eliminar', 'error');
        return;
      }

      const productNames = selectedProducts.value.map(id => {
        const product = products.value.find(p => p.id === id);
        return product ? product.nombre : 'N/A';
      }).join(', ');

      const confirmMessage = `¿Está seguro de que desea eliminar ${selectedProducts.value.length} producto(s)?\n\nProductos: ${productNames}`;
      
      if (confirm(confirmMessage)) {
        bulkDeleteProducts();
      }
    };

    const bulkDeleteProducts = async () => {
      const token = checkAuth();
      if (!token) return;

      try {
        const deletePromises = selectedProducts.value.map(productId => 
          fetch(`http://localhost:3000/api/eliminarProducto/productos/${productId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })
        );

        const responses = await Promise.all(deletePromises);
        const failedDeletes = responses.filter(response => !response.ok);

        if (failedDeletes.length > 0) {
          showMessage('Error', `Error al eliminar ${failedDeletes.length} producto(s)`, 'error');
        } else {
          showMessage('Éxito', `${selectedProducts.value.length} producto(s) eliminado(s) correctamente`, 'success');
        }

        cancelDeleteMode();
        fetchProducts();
      } catch (err) {
        showMessage('Error', 'Error al eliminar los productos', 'error');
      }
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
        showCreateModal.value = false;
        showMessage('Éxito', 'Producto creado correctamente', 'success');
        fetchProducts();
      } catch (err) {
        showMessage('Error', err.message, 'error');
      }
    };

    const searchProduct = () => {
      currentPage.value = 1;
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

    const checkScreenSize = () => {
      isMobile.value = window.innerWidth < 768;
      perPage.value = isMobile.value ? 10 : 15;
    };

    const editProduct = (product) => {
      selectedProduct.value = { ...product };
      confirmEdit();
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
        showEditModal.value = false;
        showMessage('Éxito', 'Producto actualizado correctamente', 'success');
        fetchProducts();
      } catch (err) {
        showMessage('Error', err.message, 'error');
      }
    };

    const showTallasModal = (product) => {
      if (!product.tallas_disponibles?.length) return;
      
      selectedProductTallas.value = product.tallas_disponibles.map(talla => ({
        id_talla: talla.talla_id,
        numero: talla.talla_eu,
        talla_us: talla.talla_us,
        stock: talla.stock,
        precio_par: product.precio_par
      }));
      
      showModal.value = true;
    };

    const closeModal = () => {
      showModal.value = false;
      selectedProductTallas.value = [];
    };

    onMounted(() => {
      const user = JSON.parse(localStorage.getItem('user'));
      if (user) {
        userRole.value = user.rol;
      }
      fetchProducts();
      checkScreenSize();
      window.addEventListener('resize', checkScreenSize);
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
      deleteMode,
      selectedProducts,
      currentPage,
      paginatedProducts,
      totalPages,
      displayedPageNumbers,
      areAllSelected,
      showMessage,
      hideMessage,
      openCreateProductModal,
      searchProduct,
      createProduct,
      editProduct,
      confirmEdit,
      updateProduct,
      enterDeleteMode,
      cancelDeleteMode,
      confirmBulkDelete,
      toggleProductSelection,
      toggleSelectAll,
      previousPage,
      nextPage,
      filteredProducts,
      toggleTalla,
      getTallaStock,
      updateTallaStock,
      getEditTallaStock,
      updateEditTallaStock,
      formatPrice,
      getStockClass,
      getStatusClass,
      showModal,
      selectedProductTallas,
      showTallasModal,
      closeModal,
      showActions,
      userRole
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

.delete-mode-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.cancel-button {
  border: 1px solid #6c757d;
  color: #6c757d;
}

.cancel-button:hover {
  background-color: #f0f0f0;
  color: #5a6268;
  border-color: #5a6268;
}

@media (min-width: 576px) {
  .delete-mode-actions {
    flex-direction: row;
    justify-content: center;
  }
  
  .delete-mode-actions .action-button {
    width: auto;
    min-width: 150px;
  }
}

.delete-mode-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.cancel-button {
  border: 1px solid #6c757d;
  color: #6c757d;
}

.cancel-button:hover {
  background-color: #f0f0f0;
  color: #5a6268;
  border-color: #5a6268;
}

.card-title-section {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  width: 100%;
}

.mobile-checkbox {
  margin-top: 5px;
  width: auto !important;
}

.products-table-container {
  width: 100%;
  box-sizing: border-box;
}

.table-responsive {
  display: none;
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.products-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 15px;
  font-size: 14px;
}

.products-table th, .products-table td {
  border: 1px solid #ddd;
  padding: 10px 8px;
  text-align: left;
}

.products-table th {
  background-color: #f8f8f8;
  position: sticky;
  top: 0;
  font-weight: bold;
}

.products-table tr:hover {
  background-color: #f1f1f1;
}

.card-view {
  display: block;
  width: 100%;
}

.product-card {
  border: 1px solid #ddd;
  border-radius: 8px;
  margin-bottom: 15px;
  padding: 15px;
  cursor: pointer;
  transition: transform 0.1s, background-color 0.2s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.product-card:hover {
  background-color: #f8f8f8;
}

.tallas-summary {
  text-align: center;
}

.tallas-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.tallas-count {
  font-size: 12px;
  color: #666;
}

.ver-tallas-btn {
  padding: 4px 8px;
  font-size: 12px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.ver-tallas-btn:hover:not(:disabled) {
  background-color: #0056b3;
}

.ver-tallas-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.select-btn {
  padding: 8px 12px;
  font-size: 14px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  width: 100%;
  margin-top: 8px;
  text-align: center;
  transition: background-color 0.2s, transform 0.1s;
}

.select-btn:hover {
  background-color: #45a049;
}

.precio {
  font-weight: bold;
  color: #2e7d32;
}

.stock-cell {
  text-align: center;
}

.stock-normal {
  color: #2e7d32;
  font-weight: bold;
}

.stock-bajo {
  color: #f57c00;
  font-weight: bold;
}

.stock-agotado {
  color: #d32f2f;
  font-weight: bold;
}

.status-disponible {
  color: #2e7d32;
  font-weight: bold;
}

.status-agotado {
  color: #d32f2f;
  font-weight: bold;
}

.status-sin-registrar {
  color: #666;
  font-style: italic;
}

.status-default {
  color: #333;
}

.pagination {
  margin-top: 20px;
  margin-bottom: 20px;
  display: flex;
  gap: 4px;
  justify-content: center;
  align-items: center;
  width: 100%;
}

.page-numbers {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 4px;
}

.pagination button {
  padding: 10px 15px;
  border: 1px solid #ddd;
  background: white;
  cursor: pointer;
  font-size: 16px;
  color: #333;
  margin-bottom: 5px;
  border-radius: 4px;
  min-width: 40px;
  transition: background-color 0.2s;
}

.pagination button:hover:not(:disabled) {
  background-color: #f0f0f0;
}

.pagination button.active {
  background: #333;
  color: white;
  font-weight: bold;
}

.pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-nav {
  font-weight: bold;
  font-size: 18px;
}

@media (min-width: 576px) {
  .delete-mode-actions {
    flex-direction: row;
    justify-content: center;
  }
  
  .delete-mode-actions .action-button {
    width: auto;
    min-width: 150px;
  }
}

@media (min-width: 768px) {
  .table-responsive {
    display: block;
  }
  
  .card-view {
    display: none;
  }
  
  .products-table th, .products-table td {
    text-align: center;
  }
  
  .products-table {
    font-size: 16px;
  }
}

@media (max-width: 350px) {
  .product-card {
    padding: 10px;
  }
  
  .card-row {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .card-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .codigo {
    margin-left: 0;
    margin-top: 5px;
  }
}

.edit-btn {
  padding: 8px 12px;
  font-size: 14px;
  background-color: #2196F3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  width: 100%;
  margin-top: 8px;
  text-align: center;
  transition: background-color 0.2s, transform 0.1s;
}

.edit-btn:hover {
  background-color: #1976D2;
}

.tallas-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.tallas-count {
  font-size: 12px;
  color: #666;
}

.ver-tallas-btn {
  padding: 4px 8px;
  font-size: 12px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.ver-tallas-btn:hover:not(:disabled) {
  background-color: #0056b3;
}

.ver-tallas-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.ver-tallas-btn.small {
  font-size: 11px;
  padding: 3px 6px;
}

.tallas-mobile {
  display: flex;
  flex-direction: column;
  gap: 5px;
  align-items: flex-end;
}

.tallas-details {
  max-height: 400px;
  overflow-y: auto;
}

.talla-detail-item {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-bottom: 8px;
  background-color: #f9f9f9;
}

.talla-info-detail {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.talla-size {
  font-weight: bold;
  color: #333;
}

.talla-stock {
  font-weight: bold;
}

.tallas-summary {
  text-align: center;
}
</style>