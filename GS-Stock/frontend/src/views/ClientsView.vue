<template>
  <div class="client-management-container">
    <header-component />

    <div class="content-section">
      <div class="page-title">Gestión de Clientes</div>

      <div class="actions-section">
        <button class="action-button create-button" @click="openCreateClientModal">
          Agregar Cliente
        </button>
        <button 
          v-if="!deleteMode" 
          class="action-button delete-button" 
          @click="enterDeleteMode">
          Eliminar Cliente
        </button>
        <div v-if="deleteMode" class="delete-mode-actions">
          <button 
            class="action-button delete-button" 
            @click="confirmBulkDelete" 
            :disabled="selectedClients.length === 0">
            Eliminar Seleccionados ({{ selectedClients.length }})
          </button>
          <button class="action-button cancel-button" @click="cancelDeleteMode">
            Cancelar
          </button>
        </div>
      </div>

      <div class="search-section">
        <input 
          v-model="searchQuery.nombre" 
          placeholder="Buscar por nombre, apellido o empresa" 
          @input="searchClient"
        />
      </div>

      <h2 class="list-title">Lista de clientes</h2>

      <div v-if="loading" class="loading-indicator">
        Cargando clientes...
      </div>
      
      <div v-if="error" class="error-message">
        {{ error }}
      </div>

      <!-- Tabla integrada directamente -->
      <div v-if="!loading && !error" class="clients-table-container">
        <!-- Vista de tabla -->
        <div class="table-responsive">
          <table class="clients-table">
            <thead>
              <tr>
                <th v-if="deleteMode">
                  <input 
                    type="checkbox" 
                    @change="toggleSelectAll"
                    :checked="areAllSelected"
                  >
                </th>
                <th>ID</th>
                <th>Nombre</th>
                <th>Apellido</th>
                <th>Empresa</th>
                <th>Direcciones</th>
                <th>Teléfonos</th>
                <th v-if="!deleteMode">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="client in paginatedClients" :key="client.id">
                <td v-if="deleteMode">
                  <input 
                    type="checkbox" 
                    :value="client.id"
                    :checked="selectedClients.includes(client.id)"
                    @change="toggleClientSelection(client.id)"
                  >
                </td>
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
                <td v-if="!deleteMode" class="actions-cell">
                  <button @click.stop="editClient(client)" class="edit-btn-small">
                    Editar
                  </button>
                </td>
              </tr>
              <tr v-if="paginatedClients.length === 0">
                <td :colspan="deleteMode ? 8 : 7" class="empty-table">
                  No hay clientes disponibles
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Vista de tarjetas para móviles -->
        <div class="card-view">
          <div v-for="client in paginatedClients" :key="client.id" class="client-card">
            <div class="card-content">
              <div class="card-header">
                <div class="card-title-section">
                  <input 
                    v-if="deleteMode" 
                    type="checkbox" 
                    :value="client.id"
                    :checked="selectedClients.includes(client.id)"
                    @change="toggleClientSelection(client.id)"
                    class="mobile-checkbox"
                  >
                  <div>
                    <h3>{{ client.nombre }} {{ client.apellido }}</h3>
                    <span class="client-id">ID: {{ client.id }}</span>
                  </div>
                </div>
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
              
              <div v-if="!deleteMode" class="card-actions">
                <button @click.stop="editClient(client)" class="edit-btn">
                  Editar
                </button>
              </div>
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
      </div>
    </div>

    <!-- Modal para crear cliente -->
    <div v-if="showCreateModal" class="modal">
      <div class="modal-content">
        <span class="close" @click="showCreateModal = false">&times;</span>
        <h2>Agregar Nuevo Cliente</h2>
        <form @submit.prevent="createClient">
          <div class="form-group">
            <label for="nombre">Nombre:</label>
            <input 
              type="text" 
              id="nombre" 
              v-model="newClient.nombre" 
              required
            >
          </div>
          <div class="form-group">
            <label for="apellido">Apellido:</label>
            <input 
              type="text" 
              id="apellido" 
              v-model="newClient.apellido" 
              required
            >
          </div>
          <div class="form-group">
            <label for="empresa">Empresa (opcional):</label>
            <input 
              type="text" 
              id="empresa" 
              v-model="newClient.empresa"
            >
          </div>
          
          <div class="form-group">
            <label>Direcciones:</label>
            <div v-for="(direccion, index) in newClient.direcciones" :key="'dir-'+index" class="multi-input-group">
              <input 
                type="text" 
                v-model="newClient.direcciones[index]" 
                placeholder="Dirección"
                required
              >
              <button type="button" @click="removeDireccion(index)" class="remove-btn">
                ×
              </button>
            </div>
            <button type="button" @click="addDireccion" class="add-btn">
              + Añadir otra dirección
            </button>
          </div>
          
          <div class="form-group">
            <label>Teléfonos:</label>
            <div v-for="(telefono, index) in newClient.telefonos" :key="'tel-'+index" class="multi-input-group">
              <input 
                type="tel" 
                v-model="newClient.telefonos[index]" 
                placeholder="1234-5678"
                @input="validateTelefono(index, 'new')"
                required
              >
              <button type="button" @click="removeTelefono(index)" class="remove-btn">
                ×
              </button>
            </div>
            <button type="button" @click="addTelefono" class="add-btn">
              + Añadir otro teléfono
            </button>
          </div>
          
          <div class="form-actions">
            <button type="button" @click="showCreateModal = false" class="cancel-btn">
              Cancelar
            </button>
            <button type="submit" class="submit-btn">
              Guardar Cliente
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal para editar cliente -->
    <div v-if="showEditModal" class="modal">
      <div class="modal-content">
        <span class="close" @click="showEditModal = false">&times;</span>
        <h2>Editar Cliente</h2>
        <form @submit.prevent="updateClient">
          <div class="form-group">
            <label for="edit-nombre">Nombre:</label>
            <input 
              type="text" 
              id="edit-nombre" 
              v-model="selectedClient.nombre" 
              required
            >
          </div>
          <div class="form-group">
            <label for="edit-apellido">Apellido:</label>
            <input 
              type="text" 
              id="edit-apellido" 
              v-model="selectedClient.apellido" 
              required
            >
          </div>
          <div class="form-group">
            <label for="edit-empresa">Empresa:</label>
            <input 
              type="text" 
              id="edit-empresa" 
              v-model="selectedClient.empresa"
            >
          </div>
          
          <div class="form-group">
            <label>Direcciones:</label>
            <div v-for="(direccion, index) in selectedClient.direcciones" :key="'edit-dir-'+index" class="multi-input-group">
              <input 
                type="text" 
                v-model="selectedClient.direcciones[index].direccion" 
                placeholder="Dirección"
                required
              >
              <button type="button" @click="removeEditDireccion(index)" class="remove-btn">
                ×
              </button>
            </div>
            <button type="button" @click="addEditDireccion" class="add-btn">
              + Añadir otra dirección
            </button>
          </div>
          
          <div class="form-group">
            <label>Teléfonos:</label>
            <div v-for="(telefono, index) in selectedClient.telefonos" :key="'edit-tel-'+index" class="multi-input-group">
              <input 
                type="tel" 
                v-model="selectedClient.telefonos[index].telefono" 
                placeholder="1234-5678"
                @input="validateTelefono(index, 'edit')"
                required
              >
              <button type="button" @click="removeEditTelefono(index)" class="remove-btn">
                ×
              </button>
            </div>
            <button type="button" @click="addEditTelefono" class="add-btn">
              + Añadir otro teléfono
            </button>
          </div>
                    
          <div class="form-actions">
            <button type="button" @click="showEditModal = false" class="cancel-btn">
              Cancelar
            </button>
            <button type="submit" class="submit-btn">
              Actualizar Cliente
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal para confirmación de eliminación -->
    <div v-if="showDeleteModal" class="modal">
      <div class="modal-content">
        <span class="close" @click="showDeleteModal = false">&times;</span>
        <h2>Eliminar Cliente{{ selectedClients.length > 1 ? 's' : '' }}</h2>
        <p v-if="selectedClients.length <= 1">
          ¿Está seguro que desea eliminar al cliente {{ selectedClient ? selectedClient.nombre + ' ' + selectedClient.apellido : '' }}?
        </p>
        <p v-else>
          ¿Está seguro que desea eliminar {{ selectedClients.length }} clientes seleccionados?
        </p>
        <div class="modal-actions">
          <button @click="showDeleteModal = false" class="btn-cancel">Cancelar</button>
          <button @click="deleteClients" class="btn-delete">Eliminar</button>
        </div>
      </div>
    </div>

    <!-- Modal para confirmaciones -->
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
  name: 'ClientsView',
  components: {
    HeaderComponent,
    ModalMessage
  },
  setup() {
    const router = useRouter();
    const clients = ref([]);
    const loading = ref(true);
    const error = ref(null);
    const selectedClient = ref(null);
    const showCreateModal = ref(false);
    const showEditModal = ref(false);
    const showDeleteModal = ref(false);
    const showMessageModal = ref(false);
    const messageTitle = ref('');
    const messageContent = ref('');
    const messageType = ref('info');
    const deleteMode = ref(false);
    const selectedClients = ref([]);
    const currentPage = ref(1);
    const perPage = ref(15);
    const isMobile = ref(false);

    const newClient = ref({
      nombre: '',
      apellido: '',
      empresa: '',
      direcciones: [''],
      telefonos: ['']
    });

    const searchQuery = ref({ nombre: '' });

    const paginatedClients = computed(() => {
      const start = (currentPage.value - 1) * perPage.value;
      return filteredClients.value.slice(start, start + perPage.value);
    });

    const totalPages = computed(() => {
      return Math.ceil(filteredClients.value.length / perPage.value);
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
      return paginatedClients.value.length > 0 && 
             paginatedClients.value.every(client => selectedClients.value.includes(client.id));
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

    const toggleClientSelection = (clientId) => {
      const index = selectedClients.value.indexOf(clientId);
      if (index > -1) {
        selectedClients.value.splice(index, 1);
      } else {
        selectedClients.value.push(clientId);
      }
    };

    const toggleSelectAll = () => {
      if (areAllSelected.value) {
        const currentPageIds = paginatedClients.value.map(c => c.id);
        selectedClients.value = selectedClients.value.filter(id => !currentPageIds.includes(id));
      } else {
        const currentPageIds = paginatedClients.value.map(c => c.id);
        currentPageIds.forEach(id => {
          if (!selectedClients.value.includes(id)) {
            selectedClients.value.push(id);
          }
        });
      }
    };

    const enterDeleteMode = () => {
      deleteMode.value = true;
      selectedClients.value = [];
    };

    const cancelDeleteMode = () => {
      deleteMode.value = false;
      selectedClients.value = [];
    };

    const confirmBulkDelete = () => {
      if (selectedClients.value.length === 0) {
        showMessage('Error', 'No hay clientes seleccionados para eliminar', 'error');
        return;
      }

      showDeleteModal.value = true;
    };

    const deleteClients = async () => {
      const token = checkAuth();
      if (!token) return;

      try {
        const deleteResults = [];
        const clientsToProcess = selectedClients.value.length > 0 ? selectedClients.value : [selectedClient.value.id];
        
        for (const clientId of clientsToProcess) {
          try {
            const response = await fetch(`/api/clientes/${clientId}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });

            const data = await response.json();
            
            if (response.ok) {
              deleteResults.push({
                id: clientId,
                success: true,
                message: data.mensaje || 'Eliminado correctamente'
              });
            } else {
              const client = clients.value.find(c => c.id === clientId);
              deleteResults.push({
                id: clientId,
                success: false,
                message: data.error || 'Error desconocido',
                clientName: client ? `${client.nombre} ${client.apellido}` : `ID: ${clientId}`
              });
            }
          } catch (err) {
            const client = clients.value.find(c => c.id === clientId);
            deleteResults.push({
              id: clientId,
              success: false,
              message: 'Error de conexión',
              clientName: client ? `${client.nombre} ${client.apellido}` : `ID: ${clientId}`
            });
          }
        }

        const successful = deleteResults.filter(r => r.success);
        const failed = deleteResults.filter(r => !r.success);

        if (successful.length > 0 && failed.length === 0) {
          showMessage('Éxito', `${successful.length} cliente(s) eliminado(s) correctamente`, 'success');
        } else if (successful.length > 0 && failed.length > 0) {
          const failedNames = failed.map(f => `• ${f.clientName}: ${f.message}`).join('\n');
          showMessage(
            'Parcialmente completado', 
            `${successful.length} cliente(s) eliminado(s) correctamente.\n\nNo se pudieron eliminar ${failed.length} cliente(s):\n${failedNames}`, 
            'warning'
          );
        } else {
          const failedNames = failed.map(f => `• ${f.clientName}: ${f.message}`).join('\n');
          showMessage(
            'Error', 
            `No se pudo eliminar ningún cliente:\n${failedNames}`, 
            'error'
          );
        }

        showDeleteModal.value = false;
        selectedClient.value = null;
        cancelDeleteMode();
        fetchClients();
      } catch (err) {
        showMessage('Error', 'Error general al eliminar los clientes', 'error');
      }
    };

    const editClient = (client) => {
      selectedClient.value = { ...client };
      confirmEdit();
    };

    const checkScreenSize = () => {
      isMobile.value = window.innerWidth < 768;
      perPage.value = isMobile.value ? 10 : 15;
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

    const openCreateClientModal = () => {
      newClient.value = { 
        nombre: '',
        apellido: '',
        empresa: '',
        direcciones: [''],
        telefonos: ['']
      };
      showCreateModal.value = true;
    };

    const addDireccion = () => {
      newClient.value.direcciones.push('');
    };

    const removeDireccion = (index) => {
      if (newClient.value.direcciones.length > 1) {
        newClient.value.direcciones.splice(index, 1);
      }
    };

    const addTelefono = () => {
      newClient.value.telefonos.push('');
    };

    const removeTelefono = (index) => {
      if (newClient.value.telefonos.length > 1) {
        newClient.value.telefonos.splice(index, 1);
      }
    };

    const addEditDireccion = () => {
      selectedClient.value.direcciones.push({ id: null, direccion: '' });
    };

    const removeEditDireccion = (index) => {
      if (selectedClient.value.direcciones.length > 1) {
        selectedClient.value.direcciones.splice(index, 1);
      }
    };

    const addEditTelefono = () => {
      selectedClient.value.telefonos.push({ id: null, telefono: '' });
    };

    const removeEditTelefono = (index) => {
      if (selectedClient.value.telefonos.length > 1) {
        selectedClient.value.telefonos.splice(index, 1);
      }
    };

    const validateTelefono = (index, tipo) => {
      let telefono;
      
      if (tipo === 'new') {
        telefono = newClient.value.telefonos[index];
      } else {
        telefono = selectedClient.value.telefonos[index].telefono;
      }
      
      telefono = telefono.replace(/[^0-9]/g, '');
      
      if (telefono.length > 8) {
        telefono = telefono.substring(0, 8);
      }
      
      if (telefono.length > 4) {
        telefono = telefono.substring(0, 4) + '-' + telefono.substring(4);
      }
      
      if (tipo === 'new') {
        newClient.value.telefonos[index] = telefono;
      } else {
        selectedClient.value.telefonos[index].telefono = telefono;
      }
    }; 

    const searchClient = async () => {
      if (searchQuery.value.nombre.trim() === '') {
        fetchClients();
      } else {
        const termino = searchQuery.value.nombre.trim();
        try {
          const searchResponse = await fetch(`/api/clientes/buscar/${termino}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('jwtToken')}`
            }
          });
          
          if (!searchResponse.ok) throw new Error('Error en la búsqueda');
          const searchData = await searchResponse.json();
          
          const clientsWithDetails = await Promise.all(
            searchData.data.map(async client => {
              const detailResponse = await fetch(`/api/clientes/${client.id}`, {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('jwtToken')}`
                }
              });
              
              if (!detailResponse.ok) return client;
              const detailData = await detailResponse.json();
              return detailData.data;
            })
          );
          
          clients.value = clientsWithDetails;
          loading.value = false;
        } catch (err) {
          error.value = `Error: ${err.message}`;
          loading.value = false;
        }
      }
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

    const fetchClients = async () => {
      const token = checkAuth();
      if (!token) return;

      loading.value = true;
      error.value = null;

      try {
        const response = await fetch('/api/clientes', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al cargar los clientes');
        }

        const data = await response.json();
        
        clients.value = data.data.map(cliente => ({
          id: cliente.id,
          nombre: cliente.nombre,
          apellido: cliente.apellido,
          empresa: cliente.empresa,
          direcciones: cliente.direcciones,
          telefonos: cliente.telefonos
        }));
      } catch (err) {
        error.value = `Error: ${err.message}`;
        console.error('Error al obtener clientes:', err);
      } finally {
        loading.value = false;
      }
    };

    const createClient = async () => {
      const token = checkAuth();
      if (!token) return;

      try {
        // Validar que al menos haya una dirección y un teléfono
        const direccionesValidas = newClient.value.direcciones.filter(d => d.trim() !== '');
        const telefonosValidos = newClient.value.telefonos.filter(t => t.trim() !== '');
        
        if (direccionesValidas.length === 0) {
          throw new Error('Debe proporcionar al menos una dirección válida');
        }
        
        if (telefonosValidos.length === 0) {
          throw new Error('Debe proporcionar al menos un teléfono válido');
        }

        const response = await fetch('/api/clientes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            nombre: newClient.value.nombre,
            apellido: newClient.value.apellido,
            empresa: newClient.value.empresa,
            direcciones: direccionesValidas,
            telefonos: telefonosValidos
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al crear el cliente');
        }

        const data = await response.json();
        console.log("Cliente creado:", data);

        showCreateModal.value = false;
        showMessage('Éxito', 'Cliente creado correctamente', 'success');
        fetchClients();
      } catch (err) {
        showMessage('Error', err.message, 'error');
      }
    };

    const confirmEdit = () => {
      if (!selectedClient.value) {
        showMessage('Error', 'No hay ningún cliente seleccionado para editar', 'error');
        return;
      }
      showEditModal.value = true;
    };

    const updateClient = async () => {
      const token = checkAuth();
      if (!token) return;

      try {
        const direccionesValidas = selectedClient.value.direcciones
          .filter(d => d.direccion?.trim() !== '');
        
        const telefonosValidos = selectedClient.value.telefonos
          .filter(t => t.telefono?.trim() !== '');
        
        if (direccionesValidas.length === 0) {
          throw new Error('Debe proporcionar al menos una dirección válida');
        }
        
        if (telefonosValidos.length === 0) {
          throw new Error('Debe proporcionar al menos un teléfono válido');
        }

        const response = await fetch(`/api/clientes/${selectedClient.value.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            nombre: selectedClient.value.nombre,
            apellido: selectedClient.value.apellido,
            empresa: selectedClient.value.empresa,
            direcciones: direccionesValidas,
            telefonos: telefonosValidos
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al actualizar el cliente');
        }

        const data = await response.json();
        console.log("Cliente actualizado:", data);

        showEditModal.value = false;
        showMessage('Éxito', 'Cliente actualizado correctamente', 'success');
        
        await fetchClients();
        
        if (data.data) {
          selectedClient.value = data.data;
        }
      } catch (err) {
        showMessage('Error', err.message, 'error');
      }
    };

    const confirmDelete = () => {
      if (!selectedClient.value) {
        showMessage('Error', 'No hay ningún cliente seleccionado para eliminar', 'error');
        return;
      }
    };

    const handleClientSelection = (client) => {
      selectedClient.value = { ...client };
    };

    const filteredClients = computed(() => {
      let result = clients.value;

      if (searchQuery.value.nombre) {
        const termino = searchQuery.value.nombre.toLowerCase();
        result = result.filter(c =>
          (c.nombre && c.nombre.toLowerCase().includes(termino)) ||
          (c.apellido && c.apellido.toLowerCase().includes(termino)) ||
          (c.empresa && c.empresa.toLowerCase().includes(termino))
        );
      }

      return result;
    });

    onMounted(() => {
      fetchClients();
      checkScreenSize();
      window.addEventListener('resize', checkScreenSize);
    });

    return {
      clients,
      loading,
      error,
      selectedClient,
      showCreateModal,
      showEditModal,
      showDeleteModal,
      showMessageModal,
      messageTitle,
      messageContent,
      messageType,
      newClient,
      searchQuery,
      deleteMode,
      selectedClients,
      currentPage,
      paginatedClients,
      totalPages,
      displayedPageNumbers,
      areAllSelected,
      showMessage,
      hideMessage,
      openCreateClientModal,
      addDireccion,
      removeDireccion,
      addTelefono,
      removeTelefono,
      addEditDireccion,
      removeEditDireccion,
      addEditTelefono,
      removeEditTelefono,
      searchClient,
      createClient,
      confirmEdit,
      updateClient,
      handleClientSelection,
      editClient,
      enterDeleteMode,
      cancelDeleteMode,
      confirmBulkDelete,
      deleteClients,
      toggleClientSelection,
      toggleSelectAll,
      previousPage,
      nextPage,
      filteredClients,
      validateTelefono 
    };
  }
}
</script>

<style scoped src="../styles/clientes.css">

</style>