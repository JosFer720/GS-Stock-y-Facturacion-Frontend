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
          v-if="!deleteMode && !activateMode" 
          class="action-button delete-button" 
          @click="enterDeleteMode">
          Desactivar Usuario
        </button>
        <button 
          v-if="!deleteMode && !activateMode" 
          class="action-button activate-button" 
          @click="enterActivateMode">
          Activar Usuario
        </button>
        
        <!-- Modo desactivar -->
        <div v-if="deleteMode" class="delete-mode-actions">
          <button 
            class="action-button delete-button" 
            @click="confirmBulkDeactivate" 
            :disabled="selectedUsers.length === 0">
            Desactivar Seleccionados ({{ selectedUsers.length }})
          </button>
          <button class="action-button cancel-button" @click="cancelDeleteMode">
            Cancelar
          </button>
        </div>
        
        <!-- Modo activar -->
        <div v-if="activateMode" class="activate-mode-actions">
          <button 
            class="action-button activate-button" 
            @click="confirmBulkActivate" 
            :disabled="selectedUsers.length === 0">
            Activar Seleccionados ({{ selectedUsers.length }})
          </button>
          <button class="action-button cancel-button" @click="cancelActivateMode">
            Cancelar
          </button>
        </div>
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

      <!-- Tabla integrada directamente -->
      <div v-if="!loading && !error" class="users-table-container">
        <!-- Vista de tabla -->
        <div class="table-responsive">
          <table class="users-table">
            <thead>
              <tr>
                <th v-if="deleteMode || activateMode">
                  <input 
                    type="checkbox" 
                    @change="toggleSelectAll"
                    :checked="areAllSelected"
                  >
                </th>
                <th>ID</th>
                <th>Nombre</th>
                <th>Apellido</th>
                <th>Email</th>
                <th>ID Rol</th>
                <th>Estado</th>
                <th v-if="!deleteMode">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in paginatedUsers" :key="user.id">
                <td v-if="deleteMode || activateMode">
                  <input 
                    type="checkbox" 
                    :value="user.id"
                    :checked="selectedUsers.includes(user.id)"
                    @change="toggleUserSelection(user.id)"
                  >
                </td>
                <td>{{ user.id }}</td>
                <td>{{ user.nombre }}</td>
                <td>{{ user.apellido }}</td>
                <td>{{ user.email }}</td>
                <td>{{ user.id_roles }}</td>
                <td :class="{ 'active': user.estado, 'inactive': !user.estado }">
                  {{ user.estadoTexto }}
                </td>
                <td v-if="!deleteMode && !activateMode" class="actions-cell">
                  <button @click.stop="editUser(user)" class="edit-btn-small">
                    Editar
                  </button>
                </td>
              </tr>
              <tr v-if="paginatedUsers.length === 0">
                <td :colspan="(deleteMode || activateMode) ? 8 : 7" class="empty-table">
                  No hay usuarios disponibles
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Vista de tarjetas para móviles -->
        <div class="card-view">
          <div v-for="user in paginatedUsers" :key="user.id" class="user-card">
            <div class="card-content">
              <div class="card-header">
                <div class="card-title-section">
                  <input 
                    v-if="deleteMode || activateMode" 
                    type="checkbox" 
                    :value="user.id"
                    :checked="selectedUsers.includes(user.id)"
                    @change="toggleUserSelection(user.id)"
                    class="mobile-checkbox"
                  >
                  <div>
                    <h3>{{ user.nombre }} {{ user.apellido }}</h3>
                    <span class="user-id">ID: {{ user.id }}</span>
                  </div>
                </div>
              </div>
              
              <div class="card-row">
                <strong>Email:</strong>
                <span>{{ user.email }}</span>
              </div>
              
              <div class="card-row">
                <strong>Rol:</strong>
                <span>{{ user.id_roles }}</span>
              </div>
              
              <div class="card-row">
                <strong>Estado:</strong>
                <span :class="{ 'active': user.estado, 'inactive': !user.estado }">
                  {{ user.estadoTexto }}
                </span>
              </div>
              
              <div v-if="!deleteMode && !activateMode" class="card-actions">
                <button @click.stop="editUser(user)" class="edit-btn">
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
            <input 
              type="email" 
              id="email" 
              v-model="newUser.email"
              required
              placeholder="ejemplo@gmail.com"
            >
          </div>
          <div class="form-group">
            <label for="usuario">Usuario:</label>
            <input 
              type="text" 
              id="usuario" 
              v-model="newUser.usuario"
              required
              placeholder="usuario123 (solo letras, números y _)"
            >
            <div class="input-help">Solo letras, números y guiones bajos (_)</div>
          </div>
          <div class="form-group">
            <label for="contrasena">Contraseña:</label>
            <div class="password-input-container">
              <input 
                :type="showPassword ? 'text' : 'password'" 
                id="contrasena" 
                v-model="newUser.contrasena"
                required
                minlength="8"
                placeholder="Mínimo 8 caracteres"
              >
              <button 
                type="button" 
                class="password-toggle" 
                @click="togglePassword"
                :title="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
              >
                {{ showPassword ? '🙈' : '👁️' }}
              </button>
            </div>
          </div>
          <div class="form-group">
            <label for="confirmar-contrasena">Confirmar Contraseña:</label>
            <div class="password-input-container">
              <input 
                :type="showConfirmPassword ? 'text' : 'password'" 
                id="confirmar-contrasena" 
                v-model="newUser.confirmarContrasena"
                required
                placeholder="Repite la contraseña"
                :class="{ 'input-error': passwordMismatch }"
              >
              <button 
                type="button" 
                class="password-toggle" 
                @click="toggleConfirmPassword"
                :title="showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
              >
                {{ showConfirmPassword ? '🙈' : '👁️' }}
              </button>
            </div>
            <div v-if="passwordMismatch" class="error-text">
              Las contraseñas no coinciden
            </div>
          </div>
          <div class="form-group">
            <label for="rol">Rol (ID):</label>
            <select id="rol" v-model="newUser.id_roles" required>
              <option value="1">1 - Administrador</option>
              <option value="2">2 - Vendedor</option>
              <option value="3">3 - Encargado de Inventario</option>
              <option value="4">4 - Secretaria</option>
            </select>
          </div>
          <div class="form-group">
            <label for="estado">Estado:</label>
            <select id="estado" v-model="newUser.estado" required>
              <option :value="true">Activo</option>
              <option :value="false">Inactivo</option>
            </select>
          </div>
          <button type="submit" class="btn-submit" :disabled="passwordMismatch">
            Guardar
          </button>
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
            <input 
              type="email" 
              id="edit-email" 
              v-model="editingUser.email"
              required
              placeholder="luis@gmail.com"
            >
          </div>
          <div class="form-group">
            <label for="edit-rol">Rol (ID):</label>
            <select id="edit-rol" v-model="editingUser.id_roles" required>
              <option value="1">1 - Administrador</option>
              <option value="2">2 - Vendedor</option>
              <option value="3">3 - Encargado de Inventario</option>
              <option value="4">4 - Secretaria</option>
            </select>
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
    
    <!-- Modal para confirmar desactivación -->
    <div v-if="showDeleteModal" class="modal">
      <div class="modal-content">
        <span class="close" @click="showDeleteModal = false">&times;</span>
        <h2>{{ activateMode ? 'Activar' : 'Desactivar' }} Usuario{{ selectedUsers.length > 1 ? 's' : '' }}</h2>
        <p v-if="selectedUsers.length <= 1">
          ¿Está seguro que desea {{ activateMode ? 'activar' : 'desactivar' }} al usuario {{ selectedUser ? selectedUser.nombre + ' ' + selectedUser.apellido : '' }}?
        </p>
        <p v-else>
          ¿Está seguro que desea {{ activateMode ? 'activar' : 'desactivar' }} {{ selectedUsers.length }} usuarios seleccionados?
        </p>
        <div class="modal-actions">
          <button @click="showDeleteModal = false" class="btn-cancel">Cancelar</button>
          <button 
            @click="activateMode ? activateUsers() : deactivateUsers()" 
            :class="activateMode ? 'btn-activate' : 'btn-delete'">
            {{ activateMode ? 'Activar' : 'Desactivar' }}
          </button>
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
import HeaderComponent from '@/components/HeaderComponent.vue';
import ModalMessage from '@/components/ModalMessage.vue';

export default {
  name: 'UserManagementView',
  components: {
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
    const deleteMode = ref(false);
    const selectedUsers = ref([]);
    const currentPage = ref(1);
    const perPage = ref(15);
    const isMobile = ref(false);
    const activateMode = ref(false);

    // Función helper para ocultar contraseñas en logs
    const hidePassword = (obj) => {
      if (!obj || typeof obj !== 'object') return obj;
      const safe = { ...obj };
      if (safe.contrasena) safe.contrasena = `***${safe.contrasena.length} chars***`;
      if (safe.nueva_contrasena) safe.nueva_contrasena = `***${safe.nueva_contrasena.length} chars***`;
      if (safe.confirmarContrasena) safe.confirmarContrasena = `***${safe.confirmarContrasena.length} chars***`;
      return safe;
    };

    // Nuevas referencias para contraseñas
    const showPassword = ref(false);
    const showConfirmPassword = ref(false);

    const newUser = ref({
      nombre: '',
      apellido: '',
      email: '',
      usuario: '',
      contrasena: '',
      confirmarContrasena: '',
      id_roles: 2,
      estado: true
    });

    const editingUser = ref({
      id: null,
      nombre: '',
      apellido: '',
      email: '',
      id_roles: null,
      estado: true
    });

    // Función helper para normalizar emails
    const normalizeEmail = (email) => {
      if (!email) return '';
      return email.toLowerCase().trim();
    };

    // Computed property para validar contraseñas
    const passwordMismatch = computed(() => {
      if (!newUser.value.contrasena || !newUser.value.confirmarContrasena) {
        return false;
      }
      return newUser.value.contrasena !== newUser.value.confirmarContrasena;
    });

    // Métodos para mostrar/ocultar contraseñas
    const togglePassword = () => {
      showPassword.value = !showPassword.value;
    };

    const toggleConfirmPassword = () => {
      showConfirmPassword.value = !showConfirmPassword.value;
    };

    const paginatedUsers = computed(() => {
      const start = (currentPage.value - 1) * perPage.value;
      return filteredUsers.value.slice(start, start + perPage.value);
    });

    const totalPages = computed(() => {
      return Math.ceil(filteredUsers.value.length / perPage.value);
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
      return paginatedUsers.value.length > 0 && 
             paginatedUsers.value.every(user => selectedUsers.value.includes(user.id));
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

    const toggleUserSelection = (userId) => {
      const index = selectedUsers.value.indexOf(userId);
      if (index > -1) {
        selectedUsers.value.splice(index, 1);
      } else {
        selectedUsers.value.push(userId);
      }
    };

    const toggleSelectAll = () => {
      if (areAllSelected.value) {
        const currentPageIds = paginatedUsers.value.map(u => u.id);
        selectedUsers.value = selectedUsers.value.filter(id => !currentPageIds.includes(id));
      } else {
        const currentPageIds = paginatedUsers.value.map(u => u.id);
        currentPageIds.forEach(id => {
          if (!selectedUsers.value.includes(id)) {
            selectedUsers.value.push(id);
          }
        });
      }
    };

    const enterDeleteMode = () => {
      deleteMode.value = true;
      selectedUsers.value = [];
    };

    const cancelDeleteMode = () => {
      deleteMode.value = false;
      selectedUsers.value = [];
    };

    const enterActivateMode = () => {
      activateMode.value = true;
      selectedUsers.value = [];
    };

    const cancelActivateMode = () => {
      activateMode.value = false;
      selectedUsers.value = [];
    };

    const confirmBulkActivate = () => {
      if (selectedUsers.value.length === 0) {
        showMessage('Error', 'No hay usuarios seleccionados para activar', 'error');
        return;
      }
      showDeleteModal.value = true;
    };

    const activateUsers = async () => {
      const token = checkAuth();
      if (!token) return;

      try {
        const results = [];
        const usersToProcess = selectedUsers.value;
        
        for (const userId of usersToProcess) {
          try {
            const response = await fetch(`/api/usuarios/${userId}/activate`, {
              method: 'PUT',
              headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();
            
            if (response.ok) {
              results.push({
                id: userId,
                success: true,
                message: data.mensaje || 'Activado correctamente'
              });
            } else {
              const user = users.value.find(u => u.id === userId);
              results.push({
                id: userId,
                success: false,
                message: data.error || 'Error desconocido',
                userName: user ? `${user.nombre} ${user.apellido}` : `ID: ${userId}`
              });
            }
          } catch (err) {
            const user = users.value.find(u => u.id === userId);
            results.push({
              id: userId,
              success: false,
              message: 'Error de conexión',
              userName: user ? `${user.nombre} ${user.apellido}` : `ID: ${userId}`
            });
          }
        }

        const successful = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);

        if (successful.length > 0 && failed.length === 0) {
          showMessage('Éxito', `${successful.length} usuario(s) activado(s) correctamente`, 'success');
        } else if (successful.length > 0 && failed.length > 0) {
          const failedNames = failed.map(f => `• ${f.userName}: ${f.message}`).join('\n');
          showMessage(
            'Parcialmente completado', 
            `${successful.length} usuario(s) activado(s) correctamente.\n\nNo se pudieron activar ${failed.length} usuario(s):\n${failedNames}`, 
            'warning'
          );
        } else {
          const failedNames = failed.map(f => `• ${f.userName}: ${f.message}`).join('\n');
          showMessage('Error', `No se pudo activar ningún usuario:\n${failedNames}`, 'error');
        }

        showDeleteModal.value = false;
        cancelActivateMode();
        fetchUsers();
      } catch (err) {
        showMessage('Error', 'Error general al activar los usuarios', 'error');
      }
    };

    const confirmBulkDeactivate = () => {
      if (selectedUsers.value.length === 0) {
        showMessage('Error', 'No hay usuarios seleccionados para desactivar', 'error');
        return;
      }

      showDeleteModal.value = true;
    };

    const deactivateUsers = async () => {
      const token = checkAuth();
      if (!token) return;

      try {
        const deactivateResults = [];
        const usersToProcess = selectedUsers.value.length > 0 ? selectedUsers.value : [selectedUser.value.id];
        
        for (const userId of usersToProcess) {
          try {
            const response = await fetch(`/api/usuarios/${userId}/deactivate`, {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });

            const data = await response.json();
            
            if (response.ok) {
              deactivateResults.push({
                id: userId,
                success: true,
                message: data.mensaje || 'Desactivado correctamente'
              });
            } else {
              const user = users.value.find(u => u.id === userId);
              deactivateResults.push({
                id: userId,
                success: false,
                message: data.error || 'Error desconocido',
                userName: user ? `${user.nombre} ${user.apellido}` : `ID: ${userId}`
              });
            }
          } catch (err) {
            const user = users.value.find(u => u.id === userId);
            deactivateResults.push({
              id: userId,
              success: false,
              message: 'Error de conexión',
              userName: user ? `${user.nombre} ${user.apellido}` : `ID: ${userId}`
            });
          }
        }

        const successful = deactivateResults.filter(r => r.success);
        const failed = deactivateResults.filter(r => !r.success);

        if (successful.length > 0 && failed.length === 0) {
          showMessage('Éxito', `${successful.length} usuario(s) desactivado(s) correctamente`, 'success');
        } else if (successful.length > 0 && failed.length > 0) {
          const failedNames = failed.map(f => `• ${f.userName}: ${f.message}`).join('\n');
          showMessage(
            'Parcialmente completado', 
            `${successful.length} usuario(s) desactivado(s) correctamente.\n\nNo se pudieron desactivar ${failed.length} usuario(s):\n${failedNames}`, 
            'warning'
          );
        } else {
          const failedNames = failed.map(f => `• ${f.userName}: ${f.message}`).join('\n');
          showMessage(
            'Error', 
            `No se pudo desactivar ningún usuario:\n${failedNames}`, 
            'error'
          );
        }

        showDeleteModal.value = false;
        selectedUser.value = null;
        cancelDeleteMode();
        fetchUsers();
      } catch (err) {
        showMessage('Error', 'Error general al desactivar los usuarios', 'error');
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
        console.log('Cargando usuarios desde el servidor...');
        const response = await fetch('/api/usuarios', {
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
          email: normalizeEmail(user.email), // Normalizar email al cargar
          id_roles: user.id_roles,
          estado: user.estado, 
          estadoTexto: user.estado ? 'Activo' : 'Inactivo' 
        }));
        
        console.log('Usuarios cargados exitosamente:', users.value.length);
      } catch (err) {
        error.value = `Error: ${err.message}`;
        console.error('Error al obtener usuarios:', err);
      } finally {
        loading.value = false;
      }
    };

    const searchUser = () => {
      console.log("Buscando usuario:", searchQuery.value);
      currentPage.value = 1;
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

    const editUser = (user) => {
      selectedUser.value = { ...user };
      openEditUserModal();
    };

    const openCreateUserModal = () => {
      newUser.value = {
        nombre: '',
        apellido: '',
        email: '',
        usuario: '',
        contrasena: '',
        confirmarContrasena: '',
        id_roles: 2,
        estado: true
      };
      showPassword.value = false;
      showConfirmPassword.value = false;
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
        id_roles: selectedUser.value.id_roles,
        estado: selectedUser.value.estado
      };
      
      console.log('Editando usuario:', hidePassword(editingUser.value)); 
      showEditModal.value = true;
    };

    // Función validateUserForm MEJORADA - VERSIÓN CORREGIDA
    const validateUserForm = (user, isEditing = false, currentUserId = null) => {
      console.log('=== INICIANDO VALIDACIÓN FRONTEND MEJORADA ===');
      console.log('Usuario a validar:', hidePassword({
        nombre: user.nombre,
        apellido: user.apellido,
        email: user.email,
        usuario: user.usuario,
        contrasena: user.contrasena,
        isEditing,
        currentUserId
      }));
      
      // Validaciones básicas de campos obligatorios
      const camposRequeridos = ['nombre', 'apellido', 'email'];
      if (!isEditing) {
        camposRequeridos.push('usuario', 'contrasena');
      }
      
      const camposFaltantes = camposRequeridos.filter(campo => !user[campo]);
      if (camposFaltantes.length > 0) {
        console.log('❌ Campos obligatorios faltantes:', camposFaltantes);
        return { valid: false, message: `Los siguientes campos son obligatorios: ${camposFaltantes.join(', ')}` };
      }
      
      // Validaciones de longitud
      if (user.nombre.trim().length < 2) {
        return { valid: false, message: 'El nombre debe tener al menos 2 caracteres' };
      }
      
      if (user.apellido.trim().length < 2) {
        return { valid: false, message: 'El apellido debe tener al menos 2 caracteres' };
      }
      
      // Validación de formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(user.email.trim())) {
        return { valid: false, message: 'El formato del email no es válido' };
      }
      
      // Validaciones específicas para creación
      if (!isEditing) {
        if (user.usuario.trim().length < 3) {
          return { valid: false, message: 'El nombre de usuario debe tener al menos 3 caracteres' };
        }
        
        const userNameRegex = /^[a-zA-Z0-9_]+$/;
        if (!userNameRegex.test(user.usuario.trim())) {
          return { 
            valid: false, 
            message: 'El usuario solo puede contener letras, números y guiones bajos (_)' 
          };
        }
        
        if (user.contrasena.length < 8) {
          return { valid: false, message: 'La contraseña debe tener al menos 8 caracteres' };
        }
      }
      
      // Validación de email existente
      const normalizedEmailToCheck = normalizeEmail(user.email);
      const emailExists = users.value.some(existingUser => {
        const existingEmail = normalizeEmail(existingUser.email);
        const isSameEmail = existingEmail === normalizedEmailToCheck;
        
        if (isEditing && currentUserId) {
          return isSameEmail && existingUser.id !== currentUserId;
        } else {
          return isSameEmail;
        }
      });
      
      if (emailExists) {
        return { valid: false, message: 'Ya existe un usuario con este email' };
      }
      
      // Validación de rol
      const validRoles = [1, 2, 3, 4];
      if (!validRoles.includes(parseInt(user.id_roles))) {
        return { valid: false, message: 'Debe seleccionar un rol válido' };
      }
      
      console.log('✅ Validación frontend completada exitosamente');
      return { valid: true };
    };

    // Función mejorada para crear usuario
    const createUser = async () => {
      console.log('=== INICIANDO CREACIÓN DE USUARIO ===');
      console.log('🔍 ESTRUCTURA COMPLETA DE newUser:', hidePassword(JSON.parse(JSON.stringify(newUser.value))));
      
      const token = checkAuth();
      if (!token) return;
      
      // Validar contraseñas
      if (passwordMismatch.value) {
        showMessage('Error', 'Las contraseñas no coinciden', 'error');
        return;
      }
      
      if (newUser.value.contrasena.length < 8) {
        showMessage('Error', 'La contraseña debe tener al menos 8 caracteres', 'error');
        return;
      }
      
      // Asegurar que todos los campos tengan valores válidos
      const userToCreate = {
        nombre: newUser.value.nombre?.trim() || '',
        apellido: newUser.value.apellido?.trim() || '',
        email: normalizeEmail(newUser.value.email) || '',
        usuario: newUser.value.usuario?.trim() || '',
        contrasena: newUser.value.contrasena || '', // ← Asegurar que no sea undefined
        id_roles: parseInt(newUser.value.id_roles) || 2,
        estado: Boolean(newUser.value.estado)
      };
      
      console.log('📋 Datos preparados para envío (VERIFICAR):', hidePassword(userToCreate));
      
      // Verificar que ningún campo requerido esté vacío
      const camposRequeridos = ['nombre', 'apellido', 'email', 'usuario', 'contrasena'];
      const camposVacios = camposRequeridos.filter(campo => !userToCreate[campo]);
      
      if (camposVacios.length > 0) {
        console.log('❌ Campos vacíos:', camposVacios);
        showMessage('Error', `Los siguientes campos son obligatorios: ${camposVacios.join(', ')}`, 'error');
        return;
      }
      
      // Validación frontend
      const validation = validateUserForm(userToCreate, false);
      if (!validation.valid) {
        console.log('❌ Validación frontend fallida:', validation.message);
        showMessage('Error de Validación', validation.message, 'error');
        return;
      }
      
      console.log('✅ Validación frontend exitosa, enviando al backend...');
      
      // Agregar esto JUSTO ANTES del fetch para ver EXACTAMENTE qué se envía
      console.log('🔍 DATOS QUE SE ENVIARÁN AL BACKEND (JSON SEGURO):', JSON.stringify(hidePassword(userToCreate), null, 2));
      console.log('🔍 VERIFICACIÓN DE CAMPOS CRÍTICOS:');
      console.log('- nombre:', userToCreate.nombre, '(length:', userToCreate.nombre.length, ')');
      console.log('- apellido:', userToCreate.apellido, '(length:', userToCreate.apellido.length, ')');
      console.log('- email:', userToCreate.email);
      console.log('- usuario:', userToCreate.usuario, '(length:', userToCreate.usuario.length, ')');
      console.log('- contrasena:', userToCreate.contrasena ? `***${userToCreate.contrasena.length} chars***` : 'UNDEFINED');
      console.log('- id_roles:', userToCreate.id_roles, '(type:', typeof userToCreate.id_roles, ')');
      console.log('- estado:', userToCreate.estado, '(type:', typeof userToCreate.estado, ')');

      // También verifica los headers
      console.log('🔍 HEADERS:', {
        'Content-Type': 'application/json',
        'Authorization': token ? 'Bearer ***token***' : 'no token'
      });
      
      try {
        const response = await fetch('/api/usuarios/create-with-account', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(userToCreate)
        });
        
        console.log('📡 Respuesta del servidor:', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok
        });
        
        const responseData = await response.json();
        
        if (!response.ok) {
        console.log('❌ Error del servidor - DETALLES COMPLETOS:', {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          responseData: responseData
        });
        
        let errorMessage = 'Error al crear el usuario';
        
        if (response.status === 400) {
          errorMessage = responseData.error || responseData.details || 'Datos inválidos';
          // Mostrar más detalles para debugging
          console.log('❌ ERROR 400 - POSIBLES CAUSAS:');
          console.log('- Campos faltantes:', responseData.camposFaltantes);
          console.log('- Detalles:', responseData.details);
          console.log('- Campos recibidos:', responseData.camposRecibidos);
        } else if (response.status === 409) {
          errorMessage = responseData.error || 'El usuario o email ya existe';
        }
        
        showMessage('Error', errorMessage, 'error');
        return;
      }
        
        console.log('✅ Usuario creado exitosamente:', hidePassword(responseData));
        
        // Éxito
        showCreateModal.value = false;
        showMessage('Éxito', 'Usuario creado correctamente', 'success');
        
        // Reset form
        newUser.value = {
          nombre: '',
          apellido: '',
          email: '',
          usuario: '',
          contrasena: '',
          confirmarContrasena: '',
          id_roles: 2,
          estado: true
        };
        showPassword.value = false;
        showConfirmPassword.value = false;
        
        // Recargar lista
        await fetchUsers();
        
      } catch (err) {
        console.error('❌ Error de conexión:', err);
        showMessage('Error', 'Error de conexión. Intente nuevamente.', 'error');
      }
    };

    const updateUser = async () => {
      const token = checkAuth();
      if (!token) return;
      
      const userToUpdate = {
        ...editingUser.value,
        nombre: editingUser.value.nombre.trim(),
        apellido: editingUser.value.apellido.trim(),
        email: normalizeEmail(editingUser.value.email)
      };
      
      const validation = validateUserForm(userToUpdate, true, editingUser.value.id);
      if (!validation.valid) {
        showMessage('Error de Validación', validation.message, 'error');
        return;
      }
      
      try {
        const response = await fetch(`/api/usuarios/${editingUser.value.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            nombre: userToUpdate.nombre,
            apellido: userToUpdate.apellido,
            email: userToUpdate.email,
            id_roles: userToUpdate.id_roles,
            estado: userToUpdate.estado
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          
          if (response.status === 409 || errorData.message?.includes('email')) {
            showMessage('Error', 'Ya existe un usuario con este email', 'error');
          } else if (response.status === 400) {
            showMessage('Error', 'Datos inválidos: ' + (errorData.message || 'Verifique los campos'), 'error');
          } else {
            showMessage('Error', errorData.message || 'Error al actualizar el usuario', 'error');
          }
          return;
        }
        
        const data = await response.json();
        console.log("Usuario actualizado:", data);
        
        showEditModal.value = false;
        showMessage('Éxito', 'Usuario actualizado correctamente', 'success');
        await fetchUsers();
      } catch (err) {
        console.error('Error en updateUser:', err);
        showMessage('Error', 'Error de conexión. Intente nuevamente.', 'error');
      }
    };

    const checkScreenSize = () => {
      isMobile.value = window.innerWidth < 768;
      perPage.value = isMobile.value ? 10 : 15;
    };

    onMounted(() => {
      fetchUsers();
      checkScreenSize();
      window.addEventListener('resize', checkScreenSize);
    });

    return {
      users,
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
      newUser,
      editingUser,
      searchQuery,
      deleteMode,
      selectedUsers,
      currentPage,
      paginatedUsers,
      totalPages,
      displayedPageNumbers,
      areAllSelected,
      filteredUsers,
      showPassword,
      showConfirmPassword,
      passwordMismatch,
      togglePassword,
      toggleConfirmPassword,
      showMessage,
      hideMessage,
      fetchUsers,
      searchUser,
      handleUserSelection,
      editUser,
      openCreateUserModal,
      openEditUserModal,
      createUser,
      updateUser,
      confirmBulkDeactivate,
      deactivateUsers, 
      enterDeleteMode,
      cancelDeleteMode,
      toggleUserSelection,
      toggleSelectAll,
      previousPage,
      nextPage,
      activateMode,
      enterActivateMode,
      cancelActivateMode,
      confirmBulkActivate,
      activateUsers,
      normalizeEmail,
      validateUserForm,
      hidePassword
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

.password-input-container {
  position: relative;
  display: flex;
  align-items: center;
}

.password-input-container input {
  width: 100%;
  padding-right: 45px;
}

.password-toggle {
  position: absolute;
  right: 10px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 18px;
  color: #666;
  padding: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 30px;
  height: 30px;
}

.password-toggle:hover {
  color: #333;
}

.input-error {
  border-color: #dc3545 !important;
  background-color: #fff5f5;
}

.error-text {
  color: #dc3545;
  font-size: 14px;
  margin-top: 5px;
}

.input-help {
  font-size: 12px;
  color: #666;
  margin-top: 3px;
  font-style: italic;
}

.activate-button {
  border: 1px solid #28a745;
  color: #28a745;
}

.activate-button:hover {
  background-color: #e8f5e9;
  color: #1e7e34;
  border-color: #1e7e34;
}

.activate-mode-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

@media (min-width: 576px) {
  .activate-mode-actions {
    flex-direction: row;
    justify-content: center;
  }
  
  .activate-mode-actions .action-button {
    width: auto;
    min-width: 150px;
  }
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

.btn-submit:disabled {
  background-color: #ccc;
  cursor: not-allowed;
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

.btn-activate {
  background-color: #28a745;
  color: white;
  padding: 12px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  width: 100%;
}

.btn-activate:hover {
  background-color: #218838;
}

.modal-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 20px;
  width: 100%;
}

.delete-mode-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.cancel-button {
  border: 1px solid #6c757d;
  color: #6c757d;
}

.cancel-button:hover {
  background-color: #f0f0f0;
  color: #5a6268;
  border-color: #5a6268;
}

.card-title-section {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  width: 100%;
}

.mobile-checkbox {
  margin-top: 5px;
  width: auto !important;
}

.users-table-container {
  width: 100%;
  box-sizing: border-box;
}

.table-responsive {
  display: none;
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.users-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 15px;
  font-size: 14px;
  border: 1px solid #ddd;
}

.users-table th, .users-table td {
  border: 1px solid #ddd;
  padding: 10px 8px;
  text-align: left;
}

.users-table th {
  background-color: #f8f8f8;
  position: sticky;
  top: 0;
  font-weight: bold;
}

.users-table tr:hover {
  background-color: #f1f1f1;
}

.card-view {
  display: block;
  width: 100%;
}

.user-card {
  border: 1px solid #ddd;
  border-radius: 8px;
  margin-bottom: 15px;
  padding: 15px;
  cursor: pointer;
  transition: transform 0.1s, background-color 0.2s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.user-card:hover {
  background-color: #f8f8f8;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 15px;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
}

.card-header h3 {
  margin: 0;
  font-size: 16px;
  color: #333;
  flex: 1;
}

.user-id {
  background-color: #f0f0f0;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
  color: #666;
  margin-left: 10px;
}

.card-row {
  margin-bottom: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
}

.card-row strong {
  margin-right: 5px;
  min-width: 80px;
}

.actions-cell {
  display: flex;
  gap: 5px;
  justify-content: center;
}

.edit-btn-small {
  padding: 4px 8px;
  font-size: 12px;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  transition: background-color 0.2s;
  background-color: #2196F3;
  color: white;
}

.edit-btn-small:hover {
  background-color: #1976D2;
}

.card-actions {
  display: flex;
  gap: 10px;
  margin-top: 15px;
}

.edit-btn {
  padding: 8px 12px;
  font-size: 14px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  flex: 1;
  text-align: center;
  transition: background-color 0.2s, transform 0.1s;
  background-color: #2196F3;
  color: white;
}

.edit-btn:hover {
  background-color: #1976D2;
}

.active {
  color: #2e7d32;
  font-weight: 500;
}

.inactive {
  color: #c62828;
  font-weight: 500;
}

.empty-table {
  text-align: center;
  padding: 20px;
  color: #666;
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
  transition: background-color 0.2s;
}

.pagination button:hover:not(:disabled) {
  background-color: #f0f0f0;
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
  
  .delete-mode-actions {
    flex-direction: row;
    justify-content: center;
  }
  
  .delete-mode-actions .action-button {
    width: auto;
    min-width: 150px;
  }
}

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
  
  .table-responsive {
    display: block;
  }
  
  .card-view {
    display: none;
  }
  
  .users-table th, .users-table td {
    text-align: center;
  }
  
  .users-table {
    font-size: 16px;
    min-width: 800px;
  }
  
  .actions-cell {
    min-width: 120px;
  }
}

@media (max-width: 350px) {
  .user-card {
    padding: 10px;
  }
  
  .card-row {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .card-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .user-id {
    margin-left: 0;
    margin-top: 5px;
  }
  
  .card-actions {
    flex-direction: column;
  }
}
</style>