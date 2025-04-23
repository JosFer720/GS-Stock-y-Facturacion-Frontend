<template>
  <div class="dashboard-page">
    <div class="header">
      <button class="logout-button" @click="handleLogout">Logout</button>
    </div>
    <div class="dashboard-container">
      <h1>Dashboard</h1>
      <p>Bienvenido al sistema</p>
      <!-- Aquí irá el contenido de tu dashboard -->
    </div>
  </div>
</template>

<script>
export default {
  name: 'DashboardView',
  created() {
    // Verificar autenticación al cargar el componente
    const token = localStorage.getItem('jwtToken');
    if (!token) {
      // Si no hay token, redirigir al login
      this.$router.push('/');
    }
  },
  methods: {
    async handleLogout() {
      try {
        // Llamar al endpoint de logout en el backend (opcional)
        const token = localStorage.getItem('jwtToken');
        if (token) {
          await fetch('http://localhost:3000/api/auth/logout', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            mode: 'cors'
          });
        }
        
        // Limpiar el almacenamiento local
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('user');
        
        // Redirigir al usuario a la página de login usando Vue Router
        this.$router.push('/');
      } catch (error) {
        console.error('Error durante el logout:', error);
        // Igualmente redirigir al usuario al login
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('user');
        this.$router.push('/');
      }
    }
  }
}
</script>

<style scoped>
@import '@/styles/dashStyle.css';
</style>