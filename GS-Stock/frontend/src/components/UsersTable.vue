<template>
    <div class="users-table-container">
      <h2>Lista de usuarios Activos</h2>
      <table class="users-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Rol</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          <tr 
            v-for="user in users" 
            :key="user.id"
            @click="selectUser(user)"
            :class="{ 'selected': selectedUserId === user.id }">
            <td>{{ user.nombre }} {{ user.apellido }}</td>
            <td>{{ getRolName(user.rolId) }}</td>
            <td>{{ user.estado }}</td>
          </tr>
          <tr v-if="users.length === 0">
            <td colspan="3" class="empty-table">No hay usuarios disponibles</td>
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
        this.selectedUserId = user.id;
        this.$emit('user-selected', user);
      },
      getRolName(rolId) {
        const rol = this.$parent.roles.find(r => r.id === rolId);
        return rol ? rol.nombre : 'Desconocido';
      }
    }
  };
  </script>
  
  <style scoped>
  .users-table-container {
    margin-top: 20px;
  }
  
  .users-table-container h2 {
    margin-bottom: 15px;
  }
  
  .users-table {
    width: 100%;
    border-collapse: collapse;
    border: 1px solid #ddd;
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
  </style>