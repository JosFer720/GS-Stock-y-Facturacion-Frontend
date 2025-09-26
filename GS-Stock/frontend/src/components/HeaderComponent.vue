<template>
  <header class="app-header">
    <div class="logo-container">
      <router-link to="/dashboard">
        <img src="../assets/images/logo-without-back-letters.png" alt="Logo" class="logo-image" />
      </router-link>
    </div>

    <button class="hamburger" @click="toggleMenu">☰</button>

    <nav class="navigation" :class="{ open: isMenuOpen }">
      <ul>
        <li v-if="hasAccess('dashboard')"><a href="/dashboard" :class="{ active: currentPath === '/dashboard' }" @click="closeMenu">Dashboard</a></li>
        <li v-if="hasAccess('inventario')"><a href="/inventario" :class="{ active: currentPath === '/inventario' }" @click="closeMenu">Inventario</a></li>
        <li v-if="hasAccess('usuarios')"><a href="/usuarios" :class="{ active: currentPath === '/usuarios' }" @click="closeMenu">Gestión Usuarios</a></li>
        <li v-if="hasAccess('rendimiento')"><a href="/rendimiento" :class="{ active: currentPath === '/rendimiento' }" @click="closeMenu">Rendimiento</a></li>
        <li v-if="hasAccess('clientes')"><a href="/clientes" :class="{ active: currentPath === '/clientes' }" @click="closeMenu">Clientes</a></li>
        <li v-if="hasAccess('ventas')"><a href="/ventas" :class="{ active: currentPath === '/ventas' }" @click="closeMenu">Ventas</a></li>
        <li v-if="hasAccess('pagosydevoluciones')"><a href="/pagosydevoluciones" :class="{ active: currentPath === '/pagosydevoluciones' }" @click="closeMenu">Pagos Y Devoluciones</a></li>
      </ul>
    </nav>

    <div class="header-right">
      <div class="secondary-logo">
        <img src="../assets/images/perfil.png" alt="Perfil" class="logo-image" />
      </div>
      <button class="logout-button" @click="handleLogout">Logout</button>
    </div>
  </header>
</template>

<script>
export default {
  name: 'HeaderComponent',
  data() {
    return {
      currentPath: '',
      isMenuOpen: false,
      userRole: null
    };
  },
  created() {
    this.currentPath = this.$route.path;
    const user = JSON.parse(localStorage.getItem('user'));
    this.userRole = user?.rol || null;
  },
  watch: {
    '$route.path'(newPath) {
      this.currentPath = newPath;
    }
  },
  methods: {
    hasAccess(route) {
      const role = this.userRole;
      
      if (!role) return false;
      
      const permissions = {
        'Administrador': ['dashboard', 'inventario', 'usuarios', 'rendimiento', 'clientes', 'ventas', 'pagosydevoluciones'],
        'Secretaria': ['dashboard', 'inventario'],
        'Vendedor': ['dashboard', 'inventario', 'ventas', 'pagosydevoluciones'],
        'Encargado de Inventario': ['dashboard', 'inventario']
      };
      
      return permissions[role]?.includes(route) || false;
    },
    toggleMenu() {
      this.isMenuOpen = !this.isMenuOpen;
    },
    closeMenu() {
      this.isMenuOpen = false;
    },
    async handleLogout() {
      try {
        const token = localStorage.getItem('jwtToken');
        if (token) {
          await fetch('/api/auth/logout', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            mode: 'cors'
          });
        }
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('user');
        this.$router.push('/');
      } catch (error) {
        console.error('Error durante el logout:', error);
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('user');
        this.$router.push('/');
      }
    }
  }
};
</script>

<style scoped src="./styles/headerComponent.css">

</style>
