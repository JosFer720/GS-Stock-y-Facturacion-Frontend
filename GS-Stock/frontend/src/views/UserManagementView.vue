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
      
      <users-table 
        :users="users" 
        :roles="roles"
        @user-selected="handleUserSelection" />
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
            <input type="text" id="apellido" v-model="newUser.apellido">
          </div>
          <div class="form-group">
            <label for="usuario">Usuario:</label>
            <input type="text" id="usuario" v-model="newUser.usuario" required>
          </div>
          <div class="form-group">
            <label for="email">Email:</label>
            <input type="email" id="email" v-model="newUser.email" required>
          </div>
          <div class="form-group">
            <label for="contrasena">Contraseña:</label>
            <input type="password" id="contrasena" v-model="newUser.contrasena" required>
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
            <input type="text" id="edit-apellido" v-model="editingUser.apellido">
          </div>
          <div class="form-group">
            <label for="edit-usuario">Usuario:</label>
            <input type="text" id="edit-usuario" v-model="editingUser.usuario" required>
          </div>
          <div class="form-group">
            <label for="edit-email">Email:</label>
            <input type="email" id="edit-email" v-model="editingUser.email" required>
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
    
    <!-- Modal para mostrar mensajes -->
    <div v-if="showMessageModal" class="modal">
      <div class="modal-content">
        <span class="close" @click="showMessageModal = false">&times;</span>
        <h2>{{ messageTitle }}</h2>
        <p>{{ messageContent }}</p>
        <div class="modal-actions">
          <button @click="showMessageModal = false" class="btn-ok">Aceptar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import UsersTable from '@/components/UsersTable.vue';
import HeaderComponent from '@/components/HeaderComponent.vue';
import axios from 'axios';

export default {
  name: 'UserManagementView',
  components: {
    UsersTable,
    HeaderComponent
  },
  data() {
    return {
      users: [],
      roles: [],
      selectedUser: null,
      showCreateModal: false,
      showEditModal: false,
      showDeleteModal: false,
      showMessageModal: false,
      messageTitle: '',
      messageContent: '',
      deleteCompletely: false,
      deleteAction: 'deactivate',
      newUser: {
        nombre: '',
        apellido: '',
        usuario: '',
        email: '',
        contrasena: '',
        id_roles: null
      },
      editingUser: {
        id: null,
        nombre: '',
        apellido: '',
        usuario: '',
        email: ''
      }
    };
  },
  created() {
    this.fetchUsers();
    this.fetchRoles();
  },
  computed: {
    authHeader() {
      // Obtener el token JWT del almacenamiento local
      const token = localStorage.getItem('token');
      return token ? { Authorization: `Bearer ${token}` } : {};
    }
  },
  methods: {
    async fetchUsers() {
      try {
        // Llamada a un endpoint que obtenga todos los usuarios
        // Este endpoint puede ser creado en el backend basado en los existentes
        const response = await axios.get('/api/users', {
          headers: this.authHeader
        });
        
        // Transformar los usuarios al formato esperado por la tabla
        this.users = response.data.map(user => ({
          id: user.id,
          nombre: user.nombre,
          apellido: user.apellido,
          usuario: user.usuario,
          email: user.email,
          rolId: user.id_roles,
          estado: user.activo ? 'Activo' : 'Inactivo',
          rol: user.rol
        }));
      } catch (error) {
        console.error('Error al obtener usuarios:', error);
        this.showMessage('Error', 'No se pudieron cargar los usuarios. Verifica tu conexión.');
      }
    },
    async fetchRoles() {
      try {
        // Llamada a un endpoint para obtener roles
        const response = await axios.get('/api/roles', {
          headers: this.authHeader
        });
        this.roles = response.data;
      } catch (error) {
        console.error('Error al obtener roles:', error);
        // Usar roles de ejemplo si la API falla
        this.roles = [
          { id: 1, nombre: 'Administrador' },
          { id: 2, nombre: 'Usuario' }
        ];
      }
    },
    handleUserSelection(user) {
      this.selectedUser = user;
    },
    openCreateUserModal() {
      this.newUser = {
        nombre: '',
        apellido: '',
        usuario: '',
        email: '',
        contrasena: '',
        id_roles: this.roles.length > 0 ? this.roles[0].id : null
      };
      this.showCreateModal = true;
    },
    openEditUserModal() {
      if (!this.selectedUser) return;
      
      this.editingUser = {
        id: this.selectedUser.id,
        nombre: this.selectedUser.nombre,
        apellido: this.selectedUser.apellido,
        usuario: this.selectedUser.usuario,
        email: this.selectedUser.email
      };
      
      this.showEditModal = true;
    },
    confirmDeleteUser() {
      if (!this.selectedUser) return;
      
      this.deleteAction = 'deactivate';
      this.deleteCompletely = false;
      this.showDeleteModal = true;
    },
    async createUser() {
      try {
        const response = await axios.post('/api/users/create', this.newUser, {
          headers: this.authHeader
        });
        
        // Actualizar la lista de usuarios
        this.fetchUsers();
        this.showCreateModal = false;
        
        this.showMessage('Éxito', 'Usuario creado correctamente');
      } catch (error) {
        console.error('Error al crear usuario:', error);
        this.showMessage('Error', error.response?.data?.error || 'Error al crear usuario');
      }
    },
    async updateUser() {
      try {
        const response = await axios.put(`/api/users/update/${this.editingUser.id}`, this.editingUser, {
          headers: this.authHeader
        });
        
        // Actualizar la lista de usuarios
        this.fetchUsers();
        this.showEditModal = false;
        
        this.showMessage('Éxito', 'Usuario actualizado correctamente');
      } catch (error) {
        console.error('Error al actualizar usuario:', error);
        this.showMessage('Error', error.response?.data?.error || 'Error al actualizar usuario');
      }
    },
    async deleteUser() {
      try {
        this.deleteAction = this.deleteCompletely ? 'delete' : 'deactivate';
        
        await axios.delete(`/api/users/delete/${this.selectedUser.id}`, {
          headers: this.authHeader,
          data: { action: this.deleteAction }
        });
        
        // Actualizar la lista de usuarios
        this.fetchUsers();
        this.showDeleteModal = false;
        this.selectedUser = null;
        
        const actionText = this.deleteAction === 'delete' ? 'eliminado' : 'desactivado';
        this.showMessage('Éxito', `Usuario ${actionText} correctamente`);
      } catch (error) {
        console.error('Error al eliminar/desactivar usuario:', error);
        this.showMessage('Error', error.response?.data?.error || `Error al ${this.deleteAction === 'delete' ? 'eliminar' : 'desactivar'} usuario`);
      }
    },
    showMessage(title, content) {
      this.messageTitle = title;
      this.messageContent = content;
      this.showMessageModal = true;
    }
  },
  watch: {
    deleteCompletely(newVal) {
      this.deleteAction = newVal ? 'delete' : 'deactivate';
    }
  }
};
</script>

<style scoped>
.user-management-container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
}

.content-section {
  padding: 20px;
}

.page-title {
  text-align: center;
  margin-bottom: 25px;
  color: #333;
}

.actions-section {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-bottom: 30px;
}

.action-button {
  padding: 10px 20px;
  border: 1px solid #333;
  background-color: #ffffff;
  color: #000000;
  cursor: pointer;
  transition: background-color 0.3s;
  font-weight: 500;
}

.action-button:hover {
  background-color: #f0f0f0;
  color: rgb(28, 104, 233);
  border-color: rgb(28, 104, 233);
}

.action-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.delete-button {
  border-color: #d9534f;
  color: #d9534f;
}

.delete-button:hover {
  background-color: #f9e2e2;
  color: #c9302c;
  border-color: #c9302c;
}

/* Estilos para el modal */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: white;
  padding: 20px;
  border-radius: 4px;
  width: 500px;
  max-width: 90%;
  position: relative;
}

.close {
  position: absolute;
  top: 10px;
  right: 10px;
  font-size: 24px;
  cursor: pointer;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.btn-submit {
  background-color: #4CAF50;
  color: white;
  padding: 10px 15px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  float: right;
}

.btn-cancel {
  background-color: #ccc;
  color: #333;
  padding: 10px 15px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-delete {
  background-color: #d9534f;
  color: white;
  padding: 10px 15px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-ok {
  background-color: #4CAF50;
  color: white;
  padding: 10px 15px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-submit:hover {
  background-color: #45a049;
}

.btn-delete:hover {
  background-color: #c9302c;
}

.btn-cancel:hover {
  background-color: #bbb;
}

.btn-ok:hover {
  background-color: #45a049;
}
</style>