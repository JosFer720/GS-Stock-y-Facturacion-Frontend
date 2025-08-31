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

<style scoped src="./styles/productsTable.css">

</style>