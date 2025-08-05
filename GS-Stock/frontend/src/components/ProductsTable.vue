<template>
  <div class="products-table-container">
    <!-- Vista de tabla -->
    <div class="table-responsive">
      <table class="products-table">
        <thead>
        <th v-if="deleteMode">
          <input 
            type="checkbox" 
            @change="toggleSelectAll"
            :checked="areAllSelected"
          >
        </th>
          <tr>
            <th>Código</th>
            <th>Nombre</th>
            <th>Tipo</th>
            <th>Precio por Par</th>
            <th>Stock Total</th>
            <th>Tallas Disponibles</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
        <td v-if="deleteMode">
          <input 
            type="checkbox" 
            :value="product.id"
            :checked="selectedProducts.includes(product.id)"
            @change="toggleProductSelection(product.id)"
          >
        </td>
          <tr v-for="product in paginatedProducts" :key="product.id">
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
                <button 
                  @click.stop="showTallasModal(product)" 
                  class="ver-tallas-btn"
                  :disabled="!product.tallas_disponibles?.length"
                >
                  Ver Detalles
                </button>
              </div>
            </td>
            <td>
              <span :class="getStatusClass(product.inventario_general.estado)">
                {{ product.inventario_general.estado }}
              </span>
            </td>
            <td>
              <button @click.stop="$emit('product-selected', product)" class="select-btn">
                Seleccionar
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Vista de tarjetas para móviles -->
    <div class="card-view">
      <div v-for="product in paginatedProducts" :key="product.id" class="product-card">
        <div class="card-content">
          <div class="card-header">
            <h3>{{ product.nombre }}</h3>
            <span class="codigo">{{ product.codigo }}</span>
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
          
          <button @click.stop="$emit('product-selected', product)" class="select-btn">
            Seleccionar
          </button>
        </div>
      </div>
    </div>

    <!-- Paginación -->
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

    <TallasModal 
      :show="showModal"
      :tallas="selectedProductTallas"
      @close="closeModal"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import TallasModal from './TallasModal.vue';

const formatPrice = (price) => {
  if (!price && price !== 0) return '0.00';
  return parseFloat(price).toFixed(2);
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleString();
  } catch {
    return dateString;
  }
};

const getStockClass = (stock) => {
  if (stock <= 0) return 'stock-agotado';
  if (stock <= 10) return 'stock-bajo';
  return 'stock-normal';
};

const getStatusClass = (estado) => {
  switch (estado?.toLowerCase()) {
    case 'disponible':
      return 'status-disponible';
    case 'agotado':
      return 'status-agotado';
    case 'sin registrar':
      return 'status-sin-registrar';
    default:
      return 'status-default';
  }
};

const props = defineProps({
  products: {
    type: Array,
    required: true,
    default: () => []
  },
  deleteMode: {
    type: Boolean,
    default: false
  },
  selectedProducts: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['product-selected', 'products-selection-changed']);

const toggleProductSelection = (productId) => {
  const currentSelected = [...props.selectedProducts];
  const index = currentSelected.indexOf(productId);
  
  if (index > -1) {
    currentSelected.splice(index, 1);
  } else {
    currentSelected.push(productId);
  }
  
  emit('products-selection-changed', currentSelected);
};

const areAllSelected = computed(() => {
  return props.products.length > 0 && 
         props.selectedProducts.length === props.products.length;
});

const toggleSelectAll = () => {
  if (areAllSelected.value) {
    emit('products-selection-changed', []);
  } else {
    const allIds = props.products.map(p => p.id);
    emit('products-selection-changed', allIds);
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

const checkScreenSize = () => {
  isMobile.value = window.innerWidth < 768;
  perPage.value = isMobile.value ? 10 : 15;
};

onMounted(() => {
  checkScreenSize();
  window.addEventListener('resize', checkScreenSize);
});

const paginatedProducts = computed(() => {
  const start = (currentPage.value - 1) * perPage.value;
  return props.products.slice(start, start + perPage.value);
});

const totalPages = computed(() => {
  return Math.ceil(props.products.length / perPage.value);
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

const selectProduct = (product) => {
  selectedProductId.value = product.id;
  emit('product-selected', product);
};

watch(currentPage, () => {
  selectedProductId.value = null;
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
});
</script>

<style scoped>
.products-table-container {
  width: 100%;
  box-sizing: border-box;
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

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 15px;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
}

.card-header h3 {
  margin: 0;
  font-size: 16px;
  color: #333;
  flex: 1;
}

.codigo {
  background-color: #f0f0f0;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
  color: #666;
  margin-left: 10px;
}

.card-row {
  margin-bottom: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
}

.card-row strong {
  margin-right: 5px;
  min-width: 80px;
}

.tallas-mobile {
  display: flex;
  flex-direction: column;
  gap: 5px;
  align-items: flex-end;
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

.products-table th,
.products-table td {
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

.ver-tallas-btn.small {
  font-size: 11px;
  padding: 3px 6px;
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

@media (min-width: 768px) {
  .table-responsive {
    display: block;
  }
  
  .card-view {
    display: none;
  }
  
  .products-table th,
  .products-table td {
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
</style>