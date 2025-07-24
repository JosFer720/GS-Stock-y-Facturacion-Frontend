<template>
  <div class="clients-table-container">
    <!-- Vista de tabla -->
    <div class="table-responsive">
      <table class="clients-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Nombre</th>
            <th>Apellido</th>
            <th>Empresa</th>
            <th>Direcciones</th>
            <th>Teléfonos</th>
          </tr>
        </thead>
        <tbody>
          <tr 
            v-for="client in paginatedClients" 
            :key="client.id"
            @click="selectClient(client)"
            :class="{ 'selected': selectedClientId === client.id }">
            <td>{{ client.id || '-' }}</td>
            <td>{{ client.nombre || '-' }}</td>
            <td>{{ client.apellido || '-' }}</td>
            <td>{{ client.empresa || '-' }}</td>
            <td>
              <ul class="list-unstyled">
                <li v-for="(direccion, idx) in client.direcciones" :key="'dir-'+idx">
                  {{ direccion.direccion }}
                </li>
              </ul>
            </td>
            <td>
              <ul class="list-unstyled">
                <li v-for="(telefono, idx) in client.telefonos" :key="'tel-'+idx">
                  {{ telefono.telefono }}
                </li>
              </ul>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Vista de tarjetas para móviles -->
    <div class="card-view">
      <div 
        v-for="client in paginatedClients" 
        :key="client.id" 
        class="client-card"
        :class="{ 'selected': selectedClientId === client.id }"
        @click="selectClient(client)">
        <div class="card-content">
          <div class="card-row">
            <strong>ID:</strong>
            <span>{{ client.id || '-' }}</span>
          </div>
          <div class="card-row">
            <strong>Nombre:</strong>
            <span>{{ client.nombre || '-' }}</span>
          </div>
          <div class="card-row">
            <strong>Apellido:</strong>
            <span>{{ client.apellido || '-' }}</span>
          </div>
          <div class="card-row">
            <strong>Empresa:</strong>
            <span>{{ client.empresa || '-' }}</span>
          </div>
          <div class="card-row">
            <strong>Direcciones:</strong>
            <ul>
              <li v-for="(direccion, idx) in client.direcciones" :key="'dir-'+idx">
                {{ direccion.direccion }}
              </li>
            </ul>
          </div>
          <div class="card-row">
            <strong>Teléfonos:</strong>
            <ul>
              <li v-for="(telefono, idx) in client.telefonos" :key="'tel-'+idx">
                {{ telefono.telefono }}
              </li>
            </ul>
          </div>
          <button @click.stop="selectClient(client)" class="select-btn">
            Seleccionar
          </button>
        </div>
      </div>
    </div>

    <!-- Paginación -->
    <div class="pagination">
      <button @click="previousPage" :disabled="currentPage === 1" class="pagination-nav">
        &lt;
      </button>
      
      <div class="page-numbers">
        <button 
          v-for="page in displayedPageNumbers" 
          :key="page"
          @click="currentPage = page"
          :class="{ active: page === currentPage }"
        >
          {{ page }}
        </button>
      </div>
      
      <button @click="nextPage" :disabled="currentPage === totalPages" class="pagination-nav">
        &gt;
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';

const props = defineProps({
  clients: {
    type: Array,
    required: true,
    default: () => []
  },
  selectedClientId: {
    type: Number,
    default: null
  }
});

const emit = defineEmits(['client-selected']);

const selectedClientId = ref(props.selectedClientId);
const currentPage = ref(1);
const isMobile = ref(false);
const perPage = ref(20);

const checkScreenSize = () => {
  isMobile.value = window.innerWidth < 768;
  perPage.value = isMobile.value ? 10 : 20;
};

onMounted(() => {
  checkScreenSize();
  window.addEventListener('resize', checkScreenSize);
});

const selectClient = (client) => {
  selectedClientId.value = client.id;
  emit('client-selected', client);
};

const paginatedClients = computed(() => {
  const start = (currentPage.value - 1) * perPage.value;
  return props.clients.slice(start, start + perPage.value);
});

const totalPages = computed(() => {
  return Math.ceil(props.clients.length / perPage.value);
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

watch(currentPage, () => {
  selectedClientId.value = null;
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
});

watch(() => props.selectedClientId, (newVal) => {
  selectedClientId.value = newVal;
});
</script>

<style scoped>
/* Estilos similares a ProductsTable.vue pero adaptados para clientes */
.clients-table-container {
  width: 100%;
  box-sizing: border-box;
}

.card-view {
  display: block;
  width: 100%;
}

.client-card {
  border: 1px solid #ddd;
  border-radius: 8px;
  margin-bottom: 10px;
  padding: 15px;
  cursor: pointer;
  transition: transform 0.1s, background-color 0.2s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.client-card:hover {
  background-color: #f8f8f8;
}

.client-card:active {
  transform: scale(0.99);
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

.table-responsive {
  display: none;
  width: 100%;
  overflow-x: auto;
}

.clients-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 15px;
  font-size: 14px;
}

.clients-table th,
.clients-table td {
  border: 1px solid #ddd;
  padding: 10px 8px;
  text-align: left;
}

.clients-table th {
  background-color: #f8f8f8;
  position: sticky;
  top: 0;
}

.clients-table tr:hover {
  background-color: #f1f1f1;
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

.list-unstyled {
  list-style: none;
  padding-left: 0;
  margin: 0;
}

@media (min-width: 768px) {
  .table-responsive {
    display: block;
  }
  
  .card-view {
    display: none;
  }
  
  .clients-table th,
  .clients-table td {
    text-align: center;
  }
  
  .clients-table {
    font-size: 16px;
  }
  
  .select-btn {
    width: auto;
    padding: 8px 16px;
  }
}
</style>