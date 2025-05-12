<template>
  <header class="app-header">
    <div class="logo-container">
      <img src="../assets/images/logo-without-back-letters.png" alt="Logo" class="logo-image" />
    </div>

    <button class="hamburger" @click="toggleMenu">
      ☰
    </button>

    <nav class="navigation" :class="{ open: isMenuOpen }">
      <ul>
        <li><a href="/inventario" :class="{ active: currentPath === '/inventario' }" @click="closeMenu">Inventario</a></li>
        <li><a href="/usuarios" :class="{ active: currentPath === '/usuarios' }" @click="closeMenu">Gestión Usuarios</a></li>
        <li><a href="/rendimiento" :class="{ active: currentPath === '/rendimiento' }" @click="closeMenu">Rendimiento</a></li>
        <li><a href="/clientes" :class="{ active: currentPath === '/clientes' }" @click="closeMenu">Clientes</a></li>
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
      isMenuOpen: false
    };
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
          await fetch('http://localhost:3000/api/auth/logout', {
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

<style scoped>
.app-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 20px;
  height: 60px;
  background-color: #fff;
  border-bottom: 1px solid #ddd;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  z-index: 100;
}

.logo-container img {
  height: 30px;
  width: auto;
  object-fit: contain;
}

.navigation {
  flex: 1;
}

.navigation ul {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 30px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.navigation li {
  display: block;
}

.navigation a {
  text-decoration: none;
  color: #333;
  font-weight: 500;
  padding: 5px 10px;
  border-radius: 4px;
  transition: all 0.3s ease;
  display: block;
  text-align: center;
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

.secondary-logo img {
  height: 50px;
  width: 50px;
  object-fit: cover;
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

.hamburger {
  display: none;
  background: none;
  border: none;
  font-size: 24px;
  color: black;
  cursor: pointer;
  margin-left: 10px;
}

@media (max-width: 768px) {
  .hamburger {
    display: block;
  }

  .navigation {
    position: absolute;
    top: 60px;
    left: 0;
    right: 0;
    background-color: #fff;
    display: none;
    flex-direction: column;
    border-top: 1px solid #ddd;
  }

  .navigation.open {
    display: flex;
  }

  .navigation ul {
    flex-direction: column;
    gap: 10px;
    padding: 10px 0;
  }

  .navigation a {
    padding: 10px;
    width: 100%;
  }
}
</style>
