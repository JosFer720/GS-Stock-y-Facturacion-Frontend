<template>
  <div>
    <table class="products-table">
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Código</th>
          <th>Precio</th>
          <th>Stock</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="product in paginatedProducts"
          :key="product.id"
          :class="{ selected: selectedProductId === product.id }"
          @click="selectProduct(product)"
        >
          <td>{{ product.nombre }}</td>
          <td>{{ product.codigo }}</td>
          <td>{{ product.precio }}</td>
          <td>{{ product.stock }}</td>
          <td>
            <button @click.stop="$emit('product-selected', product)">Seleccionar</button>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Paginación -->
    <div class="pagination">
      <button
        v-for="page in totalPages"
        :key="page"
        @click="currentPage = page"
        :class="{ active: currentPage === page }"
      >
        {{ page }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
  products: {
    type: Array,
    required: true
  }
});

const emit = defineEmits(['product-selected']);
const selectedProductId = ref(null);
const currentPage = ref(1);

const paginatedProducts = computed(() => {
  const start = (currentPage.value - 1) * 20;
  return props.products.slice(start, start + 20);
});

const totalPages = computed(() => {
  return Math.ceil(props.products.length / 20);
});

const selectProduct = (product) => {
  selectedProductId.value = product.id;
  emit('product-selected', product);
};

watch(currentPage, () => {
  selectedProductId.value = null;
});
</script>

<style scoped>
.products-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
}

.products-table th,
.products-table td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: center;
}

.products-table tr:hover {
  background-color: #f1f1f1;
}

.products-table tr.selected {
  background-color: #d1e7fd;
}

button {
  padding: 4px 8px;
  font-size: 0.9em;
}

/* Estilo paginación */
.pagination {
  margin-top: 20px;
  display: flex;
  gap: 5px;
  justify-content: center;
}

.pagination button {
  padding: 5px 10px;
  border: 1px solid #333;
  background: white;
  cursor: pointer;
  font-size: 14px;
  color: black;
}

.pagination button.active {
  background: #333;
  color: white;
}
</style>
