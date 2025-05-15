<template>
  <div class="users-table-container">
    <h2>Lista de usuarios</h2>
    <table class="users-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Nombre</th>
          <th>Apellido</th>
          <th>Email</th>
          <th>ID Rol</th>
          <th>Estado</th>
        </tr>
      </thead>
      <tbody>
        <tr 
          v-for="user in users" 
          :key="user.Id"
          @click="selectUser(user)"
          :class="{ 'selected': selectedUserId === user.Id }">
          <td>{{ user.id }}</td>
          <td>{{ user.nombre }}</td>
          <td>{{ user.apellido }}</td>
          <td>{{ user.email }}</td>
          <td>{{ user.id_roles }}</td>
          <td :class="{ 'active': user.estado === 'Activo', 'inactive': user.estado === 'Inactivo' }">
            {{ user.estado }}
          </td>
        </tr>
        <tr v-if="users.length === 0">
          <td colspan="6" class="empty-table">No hay usuarios disponibles</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
export default {
  name: 'UsersTable',
  props: {
    users: {
      type: Array,
      required: true
    },
    roles: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      selectedUserId: null
    };
  },
  methods: {
    selectUser(user) {
      this.selectedUserId = user.Id;
      this.$emit('user-selected', user);
    }
  }
};
</script>

<style scoped>
.users-table-container {
  margin-top: 20px;
  overflow-x: auto;
}

.users-table-container h2 {
  margin-bottom: 15px;
}

.users-table {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid #ddd;
  min-width: 800px;
}

.users-table th,
.users-table td {
  padding: 12px 15px;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

.users-table th {
  background-color: #f8f8f8;
  font-weight: bold;
}

.users-table tbody tr {
  transition: background-color 0.3s;
  cursor: pointer;
}

.users-table tbody tr:hover {
  background-color: #f1f1f1;
}

.users-table tr.selected {
  background-color: #e2f0ff;
}

.empty-table {
  text-align: center;
  padding: 20px;
  color: #666;
}

.active {
  color: #2e7d32;
  font-weight: 500;
}

.inactive {
  color: #c62828;
  font-weight: 500;
}
</style>