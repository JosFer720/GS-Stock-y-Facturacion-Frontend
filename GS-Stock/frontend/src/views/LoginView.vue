<template>
  <div class="login-wrapper">
    <div class="login-split-container">
      <!-- Sección Izquierda - Formulario -->
      <div class="login-form-section">
        <div class="form-content">
          <h2 class="login-title">Iniciar Sesión</h2>
          
          <div class="login-form">
            <div class="input-group">
              <label for="usuario">Usuario:</label>
              <input 
                type="text" 
                id="usuario" 
                v-model="usuario" 
                placeholder="Ingresa tu usuario"
                @keyup.enter="handleLogin"
                required
              >
            </div>
            
            <div class="input-group">
              <label for="contrasena">Contraseña:</label>
              <div class="password-wrapper">
                <input 
                  :type="showPassword ? 'text' : 'password'" 
                  id="contrasena" 
                  v-model="contrasena" 
                  placeholder="Ingresa tu contraseña"
                  @keyup.enter="handleLogin"
                  required
                >
                <button 
                  type="button"
                  class="toggle-password" 
                  @click="togglePasswordVisibility"
                  :title="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                </button>
              </div>
            </div>
            
            <button @click="handleLogin" class="btn-ingresar">Ingresar</button>
            
            <div class="recover-link">
              <a href="#" @click.prevent="irARestablecer">Recuperar contraseña</a>
            </div>
          </div>
          
          <div class="footer-text">
            GENSER - COMERCIALIZADORA E IMPORTADORA
          </div>
        </div>
      </div>
      
      <!-- Sección Derecha - Logo -->
      <div class="login-brand-section">
        <div class="brand-content">
          <div class="logo-display">
            <img :src="logo" alt="GENSER Logo" class="main-logo">
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Message -->
    <div v-if="showMessageModal" class="modal-overlay" @click="hideMessage">
      <div class="modal-content" @click.stop>
        <div class="modal-header" :class="'modal-' + messageType">
          <h3>{{ messageTitle }}</h3>
          <button class="modal-close" @click="hideMessage">×</button>
        </div>
        <div class="modal-body">
          <p>{{ messageContent }}</p>
        </div>
        <div class="modal-footer">
          <button class="modal-btn" @click="hideMessage">Cerrar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import logo from '../assets/images/logo0.png'

export default {
  name: 'LoginView',
  data() {
    return {
      logo,
      usuario: '',
      contrasena: '',
      showPassword: false,
      showMessageModal: false,
      messageTitle: '',
      messageContent: '',
      messageType: 'info'
    }
  },
  methods: {
    togglePasswordVisibility() {
      this.showPassword = !this.showPassword;
    },
    showMessage(title, message, type = 'info') {
      this.messageTitle = title;
      this.messageContent = message;
      this.messageType = type;
      this.showMessageModal = true;
    },
    hideMessage() {
      this.showMessageModal = false;
    },
    async handleLogin() {
      if (!this.usuario || !this.contrasena) {
        this.showMessage('Error', 'Por favor, complete todos los campos', 'error');
        return;
      }
      
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            usuario: this.usuario, 
            contrasena: this.contrasena 
          }),
          mode: 'cors'
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error en el login');
        }
        
        const data = await response.json();
        localStorage.setItem('jwtToken', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        // Redirigir al primer path permitido según el rol del usuario
        const role = data.user?.rol;
        const permissions = {
          'Super Admin': ['dashboard', 'inventario', 'usuarios', 'rendimiento', 'clientes', 'ventas', 'pagosydevoluciones'],
          'Administrador': ['dashboard', 'inventario', 'usuarios', 'rendimiento', 'clientes', 'ventas', 'pagosydevoluciones'],
          'Secretaria': ['inventario'],
          'Vendedor': ['inventario', 'ventas', 'pagosydevoluciones'],
          'Encargado de Inventario': ['inventario']
        };

        const routePriority = ['dashboard','inventario','usuarios','rendimiento','clientes','ventas','pagosydevoluciones'];
        const map = {
          'dashboard': '/dashboard',
          'inventario': '/inventario',
          'usuarios': '/usuarios',
          'rendimiento': '/rendimiento',
          'clientes': '/clientes',
          'ventas': '/ventas',
          'pagosydevoluciones': '/pagosydevoluciones'
        };

        const allowed = permissions[role] || [];
        let target = '/';
        for (const r of routePriority) {
          if (allowed.includes(r)) { target = map[r]; break; }
        }
        this.$router.push(target);
      } catch (err) {
        this.showMessage('Error', err.message, 'error');
      }
    },
    irARestablecer() {
      this.$router.push('/restablecer').catch(() => {});
    }
  }
}
</script>

<style src="@/styles/login.css"></style>