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

<style scoped src="./styles/clientesTable.css">

</style>