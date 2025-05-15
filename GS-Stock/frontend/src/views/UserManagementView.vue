<template>
  <div class="user-management-container">
    <header-component />
    
    <div class="content-section">
      <h1 class="page-title">Gestión de Usuarios</h1>
      
      <div class="actions-section">
        <button 
          class="action-button create-button" 
          @click="openCreateUserModal">
          Crear Usuario
        </button>
        <button 
          class="action-button edit-button" 
          @click="openEditUserModal"
          :disabled="!selectedUser">
          Editar Usuario
        </button>
        <button 
          class="action-button delete-button" 
          @click="confirmDeleteUser"
          :disabled="!selectedUser">
          {{ deleteAction === 'delete' ? 'Eliminar' : 'Desactivar' }} Usuario
        </button>
      </div>
      
      <div class="search-section">
        <input 
          v-model="searchQuery" 
          placeholder="Buscar por nombre o email" 
          @input="searchUser"
        />
      </div>

      <h2 class="list-title">Lista de Usuarios</h2>

      <div v-if="loading" class="loading-indicator">
        Cargando usuarios...
      </div>
      
      <div v-if="error" class="error-message">
        {{ error }}
      </div>

      <users-table 
        v-if="!loading && !error"
        :users="filteredUsers"
        :roles="roles"
        @user-selected="handleUserSelection"
      />
    </div>
    
    <!-- Modal para crear usuario -->
    <div v-if="showCreateModal" class="modal">
      <div class="modal-content">
        <span class="close" @click="showCreateModal = false">&times;</span>
        <h2>Crear Nuevo Usuario</h2>
        <form @submit.prevent="createUser">
          <div class="form-group">
            <label for="nombre">Nombre:</label>
            <input type="text" id="nombre" v-model="newUser.nombre" required>
          </div>
          <div class="form-group">
            <label for="apellido">Apellido:</label>
            <input type="text" id="apellido" v-model="newUser.apellido" required>
          </div>
          <div class="form-group">
            <label for="email">Email:</label>
            <input type="email" id="email" v-model="newUser.email">
          </div>
          <div class="form-group">
            <label for="rol">Rol:</label>
            <select id="rol" v-model="newUser.id_roles" required>
              <option v-for="rol in roles" :key="rol.id" :value="rol.id">
                {{ rol.nombre }}
              </option>
            </select>
          </div>
          <button type="submit" class="btn-submit">Guardar</button>
        </form>
      </div>
    </div>
    
    <!-- Modal para editar usuario -->
    <div v-if="showEditModal" class="modal">
      <div class="modal-content">
        <span class="close" @click="showEditModal = false">&times;</span>
        <h2>Editar Usuario</h2>
        <form @submit.prevent="updateUser">
          <div class="form-group">
            <label for="edit-nombre">Nombre:</label>
            <input type="text" id="edit-nombre" v-model="editingUser.nombre" required>
          </div>
          <div class="form-group">
            <label for="edit-apellido">Apellido:</label>
            <input type="text" id="edit-apellido" v-model="editingUser.apellido" required>
          </div>
          <div class="form-group">
            <label for="edit-email">Email:</label>
            <input type="email" id="edit-email" v-model="editingUser.email">
          </div>
          <div class="form-group">
            <label for="edit-estado">Estado:</label>
            <select id="edit-estado" v-model="editingUser.estado">
              <option :value="true">Activo</option>
              <option :value="false">Inactivo</option>
            </select>
          </div>
          <button type="submit" class="btn-submit">Actualizar</button>
        </form>
      </div>
    </div>
    
    <!-- Modal para confirmar eliminación/desactivación -->
    <div v-if="showDeleteModal" class="modal">
      <div class="modal-content">
        <span class="close" @click="showDeleteModal = false">&times;</span>
        <h2>{{ deleteAction === 'delete' ? 'Eliminar' : 'Desactivar' }} Usuario</h2>
        <p>¿Está seguro que desea {{ deleteAction === 'delete' ? 'eliminar' : 'desactivar' }} al usuario {{ selectedUser ? selectedUser.nombre + ' ' + selectedUser.apellido : '' }}?</p>
        <div class="form-group">
          <label>
            <input type="checkbox" v-model="deleteCompletely"> Eliminar completamente (en lugar de desactivar)
          </label>
        </div>
        <div class="modal-actions">
          <button @click="showDeleteModal = false" class="btn-cancel">Cancelar</button>
          <button @click="deleteUser" class="btn-delete">{{ deleteAction === 'delete' ? 'Eliminar' : 'Desactivar' }}</button>
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
import { useRouter } from 'vue-router';
import UsersTable from '@/components/UsersTable.vue';
import HeaderComponent from '@/components/HeaderComponent.vue';
import ModalMessage from '@/components/ModalMessage.vue';

export default {
  name: 'UserManagementView',
  components: {
    UsersTable,
    HeaderComponent,
    ModalMessage
  },
  setup() {
    const router = useRouter();
    const users = ref([]);
    const loading = ref(true);
    const error = ref(null);
    const selectedUser = ref(null);
    const showCreateModal = ref(false);
    const showEditModal = ref(false);
    const showDeleteModal = ref(false);
    const showMessageModal = ref(false);
    const messageTitle = ref('');
    const messageContent = ref('');
    const messageType = ref('info');
    const deleteCompletely = ref(false);
    const deleteAction = computed(() => deleteCompletely.value ? 'delete' : 'deactivate');
    const searchQuery = ref('');

    const roles = ref([
      { id: 1, nombre: 'Administrador' },
      { id: 2, nombre: 'Usuario' }
    ]);

    const newUser = ref({
      nombre: '',
      apellido: '',
      email: '',
      id_roles: 2,
      estado: true
    });

    const editingUser = ref({
      id: null,
      nombre: '',
      apellido: '',
      email: '',
      estado: true
    });

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

    const showMessage = (title, message, type = 'info') => {
      messageTitle.value = title;
      messageContent.value = message;
      messageType.value = type;
      showMessageModal.value = true;
    };

    const hideMessage = () => {
      showMessageModal.value = false;
    };

    const fetchUsers = async () => {
      const token = checkAuth();
      if (!token) return;
      
      loading.value = true;
      error.value = null;
      
      try {
        const response = await fetch('http://localhost:3000/api/usuarios', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al cargar los usuarios');
        }
        
        const data = await response.json();
        
        users.value = data.data.map(user => ({
          id: user.id,
          nombre: user.nombre,
          apellido: user.apellido,
          email: user.email,
          id_roles: user.id_roles,
          estado: user.estado ? 'Activo' : 'Inactivo',
        }));
      } catch (err) {
        error.value = `Error: ${err.message}`;
        console.error('Error al obtener usuarios:', err);
      } finally {
        loading.value = false;
      }
    };

    const getRolName = (rolId) => {
      const rol = roles.value.find(r => r.id === rolId);
      return rol ? rol.nombre : 'Desconocido';
    };

    const searchUser = () => {
      // Implementación de búsqueda local
      console.log("Buscando usuario:", searchQuery.value);
    };

    const filteredUsers = computed(() => {
      if (!searchQuery.value) return users.value;
      
      const query = searchQuery.value.toLowerCase();
      return users.value.filter(user => 
        user.nombre.toLowerCase().includes(query) || 
        user.apellido.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query)
      );
    });

    const handleUserSelection = (user) => {
      selectedUser.value = { ...user };
    };

    const openCreateUserModal = () => {
      newUser.value = {
        nombre: '',
        apellido: '',
        email: '',
        id_roles: 2,
        estado: true
      };
      showCreateModal.value = true;
    };

    const openEditUserModal = () => {
      if (!selectedUser.value) {
        showMessage('Error', 'No hay ningún usuario seleccionado para editar', 'error');
        return;
      }
      
      editingUser.value = {
        id: selectedUser.value.id,
        nombre: selectedUser.value.nombre,
        apellido: selectedUser.value.apellido,
        email: selectedUser.value.email,
        estado: selectedUser.value.estado === 'Activo'
      };
      
      showEditModal.value = true;
    };

    const createUser = async () => {
      const token = checkAuth();
      if (!token) return;
      
      try {
        const response = await fetch('http://localhost:3000/api/usuarios', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(newUser.value)
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al crear el usuario');
        }
        
        const data = await response.json();
        console.log("Usuario creado:", data);
        
        showCreateModal.value = false;
        showMessage('Éxito', 'Usuario creado correctamente', 'success');
        fetchUsers();
      } catch (err) {
        showMessage('Error', err.message, 'error');
      }
    };

    const updateUser = async () => {
      const token = checkAuth();
      if (!token) return;
      
      try {
        const response = await fetch(`http://localhost:3000/api/usuarios/${editingUser.value.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            nombre: editingUser.value.nombre,
            apellido: editingUser.value.apellido,
            email: editingUser.value.email,
            estado: editingUser.value.estado
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al actualizar el usuario');
        }
        
        const data = await response.json();
        console.log("Usuario actualizado:", data);
        
        showEditModal.value = false;
        showMessage('Éxito', 'Usuario actualizado correctamente', 'success');
        fetchUsers();
      } catch (err) {
        showMessage('Error', err.message, 'error');
      }
    };

    const confirmDeleteUser = () => {
      if (!selectedUser.value) {
        showMessage('Error', 'No hay ningún usuario seleccionado para eliminar', 'error');
        return;
      }
      
      showDeleteModal.value = true;
    };

    const deleteUser = async () => {
      const token = checkAuth();
      if (!token) return;
      
      try {
        if (deleteCompletely.value) {
          // Eliminar completamente
          const response = await fetch(`http://localhost:3000/api/usuarios/${selectedUser.value.id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al eliminar el usuario');
          }
        } else {
          // Desactivar (actualizar estado a false)
          const response = await fetch(`http://localhost:3000/api/usuarios/${selectedUser.value.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              estado: false
            })
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al desactivar el usuario');
          }
        }
        
        selectedUser.value = null;
        showDeleteModal.value = false;
        showMessage('Éxito', `Usuario ${deleteCompletely.value ? 'eliminado' : 'desactivado'} correctamente`, 'success');
        fetchUsers();
      } catch (err) {
        showMessage('Error', err.message, 'error');
      }
    };

    onMounted(() => {
      fetchUsers();
    });

    return {
      users,
      roles,
      loading,
      error,
      selectedUser,
      showCreateModal,
      showEditModal,
      showDeleteModal,
      showMessageModal,
      messageTitle,
      messageContent,
      messageType,
      deleteCompletely,
      deleteAction,
      newUser,
      editingUser,
      searchQuery,
      filteredUsers,
      showMessage,
      hideMessage,
      fetchUsers,
      searchUser,
      handleUserSelection,
      openCreateUserModal,
      openEditUserModal,
      createUser,
      updateUser,
      confirmDeleteUser,
      deleteUser,
      getRolName
    };
  }
};
</script>

<style scoped>
.user-management-container {
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
  max-width: 400px;
  text-align: center;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-content h2 {
  margin-top: 0;
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

.btn-submit {
  background-color: #4CAF50;
  color: white;
  padding: 12px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  width: 100%;
  margin-top: 10px;
}

.btn-submit:hover {
  background-color: #45a049;
}

.btn-cancel {
  background-color: #ccc;
  color: #333;
  padding: 12px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  width: 100%;
}

.btn-delete {
  background-color: #d9534f;
  color: white;
  padding: 12px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  width: 100%;
}

.btn-delete:hover {
  background-color: #c9302c;
}

.modal-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 20px;
  width: 100%;
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
  
  .modal-actions {
    flex-direction: row;
    justify-content: center;
  }
  
  .modal-actions button {
    width: auto;
    min-width: 120px;
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
}
</style>