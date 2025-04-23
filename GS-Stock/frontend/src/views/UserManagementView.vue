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
        </div>
        
        <users-table 
          :users="users" 
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
              <input type="text" id="apellido" v-model="newUser.apellido" required>
            </div>
            <div class="form-group">
              <label for="rol">Rol:</label>
              <select id="rol" v-model="newUser.rolId" required>
                <option v-for="rol in roles" :key="rol.id" :value="rol.id">
                  {{ rol.nombre }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label for="estado">Estado:</label>
              <select id="estado" v-model="newUser.estado" required>
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
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
              <label for="edit-rol">Rol:</label>
              <select id="edit-rol" v-model="editingUser.rolId" required>
                <option v-for="rol in roles" :key="rol.id" :value="rol.id">
                  {{ rol.nombre }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label for="edit-estado">Estado:</label>
              <select id="edit-estado" v-model="editingUser.estado" required>
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </div>
            <button type="submit" class="btn-submit">Actualizar</button>
          </form>
        </div>
      </div>
    </div>
  </template>
  
  <script>
  import UsersTable from '@/components/UsersTable.vue';
  import HeaderComponent from '@/components/HeaderComponent.vue';
  
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
        newUser: {
          nombre: '',
          apellido: '',
          rolId: null,
          estado: 'Activo'
        },
        editingUser: {
          id: null,
          nombre: '',
          apellido: '',
          rolId: null,
          estado: 'Activo'
        }
      };
    },
    created() {
      this.fetchUsers();
      this.fetchRoles();
    },
    methods: {
      async fetchUsers() {
        try {
          // Aquí iría tu llamada a la API para obtener usuarios
          // Por ejemplo: const response = await axios.get('/api/usuarios');
          // this.users = response.data;
          
          // Datos de ejemplo
          this.users = [
            { id: 1, nombre: 'Jose', apellido: 'Perez', rolId: 1, estado: 'Activo' },
            { id: 2, nombre: 'Maria', apellido: 'Lopez', rolId: 2, estado: 'Activo' },
            { id: 3, nombre: 'Carlos', apellido: 'Gomez', rolId: 1, estado: 'Inactivo' }
          ];
        } catch (error) {
          console.error('Error al obtener usuarios:', error);
        }
      },
      async fetchRoles() {
        try {
          // Aquí iría tu llamada a la API para obtener roles
          // Por ejemplo: const response = await axios.get('/api/roles');
          // this.roles = response.data;
          
          // Datos de ejemplo
          this.roles = [
            { id: 1, nombre: 'Vendedor' },
            { id: 2, nombre: 'Administrador' },
            { id: 3, nombre: 'Supervisor' }
          ];
        } catch (error) {
          console.error('Error al obtener roles:', error);
        }
      },
      handleUserSelection(user) {
        this.selectedUser = user;
      },
      openCreateUserModal() {
        this.newUser = {
          nombre: '',
          apellido: '',
          rolId: null,
          estado: 'Activo'
        };
        this.showCreateModal = true;
      },
      openEditUserModal() {
        if (!this.selectedUser) return;
        
        this.editingUser = {
          id: this.selectedUser.id,
          nombre: this.selectedUser.nombre,
          apellido: this.selectedUser.apellido,
          rolId: this.selectedUser.rolId,
          estado: this.selectedUser.estado
        };
        
        this.showEditModal = true;
      },
      async createUser() {
        try {
          // Aquí iría tu llamada a la API para crear usuario
          // Por ejemplo: await axios.post('/api/usuarios', this.newUser);
          
          // Simulando la respuesta de la API
          const newUserId = this.users.length + 1;
          const createdUser = {
            id: newUserId,
            ...this.newUser
          };
          
          this.users.push(createdUser);
          this.showCreateModal = false;
          
          // Opcional: Mostrar un mensaje de éxito
          alert('Usuario creado con éxito');
        } catch (error) {
          console.error('Error al crear usuario:', error);
        }
      },
      async updateUser() {
        try {
          // Aquí iría tu llamada a la API para actualizar usuario
          // Por ejemplo: await axios.put(`/api/usuarios/${this.editingUser.id}`, this.editingUser);
          
          // Actualizando en el array local
          const index = this.users.findIndex(user => user.id === this.editingUser.id);
          if (index !== -1) {
            this.users[index] = { ...this.editingUser };
            this.selectedUser = { ...this.editingUser };
          }
          
          this.showEditModal = false;
          
          // Opcional: Mostrar un mensaje de éxito
          alert('Usuario actualizado con éxito');
        } catch (error) {
          console.error('Error al actualizar usuario:', error);
        }
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
  
  .btn-submit {
    background-color: #4CAF50;
    color: white;
    padding: 10px 15px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    float: right;
  }
  
  .btn-submit:hover {
    background-color: #45a049;
  }
  </style>