<template>
  <div class="login-container">
    <div class="logo-container">
      <img src="/src/assets/images/logo.svg" alt="GS Stock Logo">
    </div>
    <h2>Iniciar Sesión</h2>
    <form @submit.prevent="handleLogin">
      <div class="input-group">
        <label for="usuario">Usuario:</label>
        <input type="text" id="usuario" v-model="usuario" required>
      </div>
      <div class="input-group">
        <label for="contrasena">Contraseña:</label>
        <input type="password" id="contrasena" v-model="contrasena" required>
      </div>
      <button type="submit">Ingresar</button>
    </form>
    <div class="recover-link">
      <a href="#" @click.prevent="irARestablecer">Recuperar contraseña</a>
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
import ModalMessage from '@/components/ModalMessage.vue';

export default {
  name: 'LoginView',
  components: {
    ModalMessage
  },
  data() {
    return {
      usuario: '',
      contrasena: '',
      showMessageModal: false,
      messageTitle: '',
      messageContent: '',
      messageType: 'info'
    }
  },
  methods: {
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
      this.$router.push('/restablecer');
    }
  }
}
</script>

<style scoped src="../styles/login.css">

</style>