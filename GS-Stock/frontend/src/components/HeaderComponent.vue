<template>
  <header class="app-header">
    <div class="logo-container">
      <img src="../assets/images/logo-without-back-letters.png" alt="Logo" class="logo-image" />
    </div>
    
    <nav class="navigation">
      <ul>
        <li><a href="/inventario" :class="{ active: currentPath === '/inventario' }">Inventario</a></li>
        <li><a href="/usuarios" :class="{ active: currentPath === '/usuarios' }">Gestión Usuarios</a></li>
        <li><a href="/rendimiento" :class="{ active: currentPath === '/rendimiento' }">Rendimiento</a></li>
        <li><a href="/clientes" :class="{ active: currentPath === '/clientes' }">Clientes</a></li>
      </ul>
    </nav>
    
    <div class="header-right">
      <div class="secondary-logo">
        <img src="../assets/images/perfil.png" alt="Secondary Logo" class="logo-image" />
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
      currentPath: ''
    }
  },
  created() {
    this.currentPath = this.$route.path;
  },
  watch: {
    '$route.path'(newPath) {
      this.currentPath = newPath;
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
.app-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  height: 60px;
  background-color: #fff;
  border-bottom: 1px solid #ddd;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.logo-container, .secondary-logo {
  flex: 0 0 auto;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
}

.logo-container img{
  margin-top: 30px;
  max-width: 200px;
  min-width: 100px;
  width: 100%;
}

.secondary-logo img {
  max-width: 100%;
  max-height: 100%;
}

.navigation {
  flex: 1;
  text-align: center;
}

.navigation ul {
  display: flex;
  justify-content: center;
  list-style: none;
  padding: 0;
  margin: 0;
}

.navigation li {
  margin: 0 15px;
}

.navigation a {
  text-decoration: none;
  color: #333;
  font-weight: 500;
  padding: 5px 10px;
  border-radius: 4px;
  transition: all 0.3s ease;
}

.navigation a:hover {
  background-color: #f5f5f5;
}

.navigation a.active {
  color: #4285f4;
  font-weight: 600;
  border-bottom: 2px solid #4285f4;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 15px;
}

.logout-button {
  background-color: #f44336;
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.3s;
}

.logout-button:hover {
  background-color: #d32f2f;
}
</style>