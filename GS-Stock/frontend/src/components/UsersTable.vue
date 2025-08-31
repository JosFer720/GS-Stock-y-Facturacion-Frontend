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

<style scoped src="./styles/usersTable.css">

</style>