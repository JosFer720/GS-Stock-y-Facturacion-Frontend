<template>
  <div class="dashboard-page">
    <header-component></header-component>
    <div class="dashboard-container">
      <h1>Dashboard</h1>
      <p>Bienvenido al sistema</p>
      <!-- Aquí irá el contenido de tu dashboard -->
    </div>
  </div>
</template>

<script>
import HeaderComponent from '@/components/HeaderComponent.vue';

export default {
  name: 'DashboardView',
  components: {
    HeaderComponent
  },
  created() {
    // Verificar autenticación al cargar el componente
    const token = localStorage.getItem('jwtToken');
    if (!token) {
      // Si no hay token, redirigir al login
      this.$router.push('/');
    }
  }
}
</script>

<style scoped>
@import '@/styles/dashStyle.css';

/* Ajustar el padding para compensar el header fijo */
.dashboard-container {
  padding-top: 80px; /* Ajustar según altura del header fijo */
}
</style>