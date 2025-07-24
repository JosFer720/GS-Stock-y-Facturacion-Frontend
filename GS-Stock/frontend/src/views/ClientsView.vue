<template>
  <div class="client-management-container">
    <header-component />

    <div class="content-section">
      <div class="page-title">Gestión de Clientes</div>

      <div class="actions-section">
        <button class="action-button create-button" @click="openCreateClientModal">
          Agregar Cliente
        </button>
        <button class="action-button edit-button" @click="confirmEdit" :disabled="!selectedClient">
          Editar Cliente
        </button>
        <button class="action-button delete-button" @click="confirmDelete" :disabled="!selectedClient">
          Eliminar Cliente
        </button>
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

      <clients-table
       v-if="!loading && !error"
      :clients="filteredClients"
       @client-selected="handleClientSelection"
      :selected-client-id="selectedClient?.id"
      />
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
                type="text" 
                v-model="newClient.telefonos[index]" 
                placeholder="Teléfono"
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
                type="text" 
                v-model="selectedClient.telefonos[index].telefono" 
                placeholder="Teléfono"
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
import ClientsTable from '@/components/ClientsTable.vue';
import HeaderComponent from '@/components/HeaderComponent.vue';
import ModalMessage from '@/components/ModalMessage.vue';
import { useRouter } from 'vue-router';

export default {
  name: 'ClientsView',
  components: {
    ClientsTable,
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
    const showMessageModal = ref(false);
    const messageTitle = ref('');
    const messageContent = ref('');
    const messageType = ref('info');

    const newClient = ref({
      nombre: '',
      apellido: '',
      empresa: '',
      direcciones: [''],
      telefonos: ['']
    });

    const searchQuery = ref({ nombre: '' });

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

    const searchClient = async () => {
  if (searchQuery.value.nombre.trim() === '') {
    fetchClients();
  } else {
    const termino = searchQuery.value.nombre.trim();
    try {
      // Primero buscar clientes básicos
      const searchResponse = await fetch(`http://localhost:3000/api/clientes/buscar/${termino}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jwtToken')}`
        }
      });
      
      if (!searchResponse.ok) throw new Error('Error en la búsqueda');
      const searchData = await searchResponse.json();
      
      // Para cada cliente encontrado, obtener sus datos completos
      const clientsWithDetails = await Promise.all(
        searchData.data.map(async client => {
          const detailResponse = await fetch(`http://localhost:3000/api/clientes/${client.id}`, {
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
        const response = await fetch('http://localhost:3000/api/clientes', {
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

        const response = await fetch('http://localhost:3000/api/clientes', {
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
    // Validar que al menos haya una dirección y un teléfono
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

    const response = await fetch(`http://localhost:3000/api/clientes/${selectedClient.value.id}`, {
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
    
    // Actualizar la lista de clientes
    await fetchClients();
    
    // Seleccionar el cliente actualizado
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

      const confirmDelete = confirm(`¿Está seguro que desea eliminar al cliente ${selectedClient.value.nombre} ${selectedClient.value.apellido}?`);
      if (confirmDelete) {
        deleteClient();
      }
    };

   const deleteClient = async () => {
  const token = checkAuth();
  if (!token) return;

  try {
    const response = await fetch(`http://localhost:3000/api/clientes/${selectedClient.value.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al eliminar el cliente');
    }

    selectedClient.value = null;
    showMessage('Éxito', 'Cliente eliminado correctamente', 'success');
    fetchClients();
  } catch (err) {
    showMessage('Error', err.message, 'error');
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
    });

    return {
      clients,
      loading,
      error,
      selectedClient,
      showCreateModal,
      showEditModal,
      showMessageModal,
      messageTitle,
      messageContent,
      messageType,
      newClient,
      searchQuery,
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
      confirmDelete,
      deleteClient,
      handleClientSelection,
      filteredClients
    };
  }
}
</script>

<style scoped>
.client-management-container {
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
  padding: 15px;
  border-radius: 8px;
  width: 100%;
  max-width: 500px;
  text-align: center;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-content h2 {
  margin-top: 0;
  margin-bottom: 20px;
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

.form-group input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
  box-sizing: border-box;
}

.multi-input-group {
  display: flex;
  margin-bottom: 8px;
}

.multi-input-group input {
  flex-grow: 1;
  margin-right: 5px;
}

.remove-btn {
  background-color: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  width: 30px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.remove-btn:hover {
  background-color: #c82333;
}

.add-btn {
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 5px 10px;
  cursor: pointer;
  margin-top: 5px;
  transition: background-color 0.2s;
}

.add-btn:hover {
  background-color: #218838;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.cancel-btn {
  padding: 10px 15px;
  background-color: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.submit-btn {
  padding: 10px 15px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.cancel-btn:hover {
  background-color: #5a6268;
}

.submit-btn:hover {
  background-color: #0069d9;
}

/* Media Queries - Tablet */
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
  }
}

/* Media Queries - Desktop */
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
  
  .modal-content {
    padding: 25px;
  }
}
</style>