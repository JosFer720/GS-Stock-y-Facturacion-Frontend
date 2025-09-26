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
                <th>Línea de Producto</th>
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
                <td>{{ product.tipo_linea_producto?.nombre || '-' }}</td>
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
                <strong>Línea de Producto:</strong>
                <span>{{ product.tipo_linea_producto?.nombre || '-' }}</span>
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
              <label for="id_tipo_linea_producto">Línea de Producto:</label>
              <select id="id_tipo_linea_producto" v-model="newProduct.id_tipo_linea_producto" required>
                <option value="">Seleccione una línea</option>
                <option v-for="tipo in tiposLineaProducto" :key="tipo.id" :value="tipo.id">
                  {{ tipo.nombre }}
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
              <label for="edit-id_tipo_linea_producto">Línea de Producto:</label>
              <select id="edit-id_tipo_linea_producto" v-model="selectedProduct.tipo_linea_producto.id" required>
                <option v-for="tipo in tiposLineaProducto" :key="tipo.id" :value="tipo.id">
                  {{ tipo.nombre }}
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
                <option value="No Disponible">No Disponible</option>
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
    const tiposLineaProducto = ref([]);
    const tallasDisponibles = ref([]);
    const newProduct = ref({
      codigo: '',
      nombre: '',
      id_tipo_de_zapato: '',
      id_tipo_linea_producto: '',
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
        case 'no disponible': return 'status-no-disponible';
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

      const confirmMessage = `¿Está seguro de que desea marcar como no disponible ${selectedProducts.value.length} producto(s)?\n\nProductos: ${productNames}`;
      
      if (confirm(confirmMessage)) {
        bulkDeleteProducts();
      }
    };

    const bulkDeleteProducts = async () => {
      const token = checkAuth();
      if (!token) return;

      try {
        const deletePromises = selectedProducts.value.map(productId => 
          fetch(`/api/inventory/${productId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })
        );

        const responses = await Promise.all(deletePromises);
        const failedDeletes = responses.filter(response => !response.ok);

        if (failedDeletes.length > 0) {
          showMessage('Error', `Error al desactivar ${failedDeletes.length} producto(s)`, 'error');
        } else {
          showMessage('Éxito', `${selectedProducts.value.length} producto(s) marcado(s) como no disponible(s)`, 'success');
        }

        cancelDeleteMode();
        fetchProducts();
      } catch (err) {
        showMessage('Error', 'Error al desactivar los productos', 'error');
      }
    };

    const fetchTiposCalzado = async () => {
      const token = checkAuth();
      if (!token) return;

      try {
        const response = await fetch('/api/tipos-calzados', {
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

    const fetchTiposLineaProducto = async () => {
      const token = checkAuth();
      if (!token) return;

      try {
        const response = await fetch('/api/inventory/tipos-linea-producto', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) throw new Error('Error al cargar tipos de línea de producto');
        const data = await response.json();
        tiposLineaProducto.value = data.data;
      } catch (err) {
        console.error('Error al obtener tipos de línea de producto:', err);
        showMessage('Error', 'No se pudieron cargar los tipos de línea de producto', 'error');
      }
    };

    const fetchTallas = async () => {
      const token = checkAuth();
      if (!token) return;

      try {
        const response = await fetch('/api/tallas', {
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
        const response = await fetch('/api/inventory', {
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
             newProduct.value.id_tipo_linea_producto &&
             newProduct.value.precio_par >= 0 &&
             newProduct.value.tallas.length > 0;
    });

    const openCreateProductModal = async () => {
      await fetchTiposCalzado();
      await fetchTallas();
      await fetchTiposLineaProducto();
      newProduct.value = {
        codigo: '',
        nombre: '',
        id_tipo_de_zapato: '',
        id_tipo_linea_producto: '',
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

        const response = await fetch('/api/inventory', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(newProduct.value)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Error al crear el producto');
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
        product.tipo_zapato?.nombre?.toLowerCase().includes(query) ||
        product.tipo_linea_producto?.nombre?.toLowerCase().includes(query)
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
      await fetchTiposLineaProducto();
      
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
          id_tipo_linea_producto: selectedProduct.value.tipo_linea_producto.id,
          precio_par: parseFloat(selectedProduct.value.precio_par),
          estado: selectedProduct.value.inventario_general.estado,
          tallas: tallasParaEnviar
        };

        const response = await fetch(`/api/inventory/${selectedProduct.value.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(updateData)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Error al actualizar el producto');
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
      tiposLineaProducto,
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

<style scoped src="../styles/productManagment.css">

</style>