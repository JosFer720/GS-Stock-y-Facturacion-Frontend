<template>
  <div class="products-table-container">
    <!-- Vista de tabla -->
    <div class="table-responsive">
      <table class="products-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Cantidad</th>
            <th>ID Zapatos</th>
            <th>Fecha Ingreso</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="product in paginatedProducts" :key="product.id">
            <td>{{ product.id || '-' }}</td>
            <td>{{ product.cantidad || '0' }}</td>
            <td>{{ product.id_zapatos || '-' }}</td>
            <td>{{ formatDate(product.fecha_ingreso) }}</td>
            <td>{{ product.estado || 'Desconocido' }}</td>
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
          <div class="card-row">
            <strong>ID:</strong>
            <span>{{ product.id || '-' }}</span>
          </div>
          <div class="card-row">
            <strong>Cantidad:</strong>
            <span>{{ product.cantidad || '0' }}</span>
          </div>
          <div class="card-row">
            <strong>ID Zapatos:</strong>
            <span>{{ product.id_zapatos || '-' }}</span>
          </div>
          <div class="card-row">
            <strong>Fecha Ingreso:</strong>
            <span>{{ formatDate(product.fecha_ingreso) }}</span>
          </div>
          <div class="card-row">
            <strong>Estado:</strong>
            <span>{{ product.estado || 'Desconocido' }}</span>
          </div>
          <button @click.stop="$emit('product-selected', product)" class="select-btn">
            Seleccionar
          </button>
        </div>
      </div>
    </div>

    <!-- Paginación -->
    <div class="pagination">
      <!-- ... (mantén tu código de paginación existente) ... -->
    </div>
  </div>
</template>


<script setup>
import { ref, computed, watch, onMounted } from 'vue';

const formatDate = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleString(); // Formato local simple
  } catch {
    return dateString;
  }
};

const props = defineProps({
  products: {
    type: Array,
    required: true,
    default: () => [] // Valor por defecto array vacío
  }
});




const emit = defineEmits(['product-selected']);
const selectedProductId = ref(null);
const currentPage = ref(1);
const isMobile = ref(false);
const perPage = ref(20);

// Comprobar el tamaño de la pantalla
const checkScreenSize = () => {
  isMobile.value = window.innerWidth < 768;
  // En móviles mostrar menos productos por página
  perPage.value = isMobile.value ? 10 : 20;
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

// Crear un array con los números de página para mostrar
const displayedPageNumbers = computed(() => {
  const maxVisibleButtons = isMobile.value ? 3 : 5;
  
  if (totalPages.value <= maxVisibleButtons) {
    return Array.from({ length: totalPages.value }, (_, i) => i + 1);
  }
  
  let start = Math.max(1, currentPage.value - Math.floor(maxVisibleButtons / 2));
  const end = Math.min(totalPages.value, start + maxVisibleButtons - 1);
  
  // Ajustar el inicio si estamos al final
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
  // Scroll hacia arriba al cambiar de página
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

/* Card view (default para móviles) */
.card-view {
  display: block;
  width: 100%;
}

.product-card {
  border: 1px solid #ddd;
  border-radius: 8px;
  margin-bottom: 10px;
  padding: 15px;
  cursor: pointer;
  transition: transform 0.1s, background-color 0.2s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.product-card:hover {
  background-color: #f8f8f8;
}

.product-card:active {
  transform: scale(0.99);
}

.product-card.selected {
  background-color: #e6f2ff;
  border-color: #0066cc;
}

.card-row {
  margin-bottom: 10px;
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
}

.card-row strong {
  margin-right: 5px;
}

/* Tabla (oculta en móviles) */
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
}

.products-table tr:hover {
  background-color: #f1f1f1;
}

.products-table tr.selected {
  background-color: #e6f2ff;
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
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
  transition: background-color 0.2s, transform 0.1s;
}

.select-btn:hover {
  background-color: #45a049;
}

.select-btn:active {
  transform: scale(0.97);
}

/* Estilo paginación */
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
  transition: background-color 0.2s, transform 0.1s;
}

.pagination button:hover {
  background-color: #f0f0f0;
}

.pagination button:active {
  transform: scale(0.97);
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
  .pagination {
    margin-top: 20px;
  }
  
  .pagination button {
    min-width: 44px;
  }
  
  .select-btn {
    width: auto;
    padding: 8px 16px;
  }
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
}

@media (prefers-reduced-motion: reduce) {
  .product-card,
  .select-btn,
  .pagination button {
    transition: none;
    transform: none;
  }
}

</style>