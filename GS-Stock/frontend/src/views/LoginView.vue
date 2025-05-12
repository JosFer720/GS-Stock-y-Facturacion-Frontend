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
        const response = await fetch('http://localhost:3000/api/auth/login', {
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
        
        this.showMessage('Éxito', 'Inicio de sesión exitoso', 'success');
        setTimeout(() => {
          this.$router.push('/dashboard');
        }, 1500);
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

<style scoped>
.login-container {
  max-width: 400px;
  margin: 0 auto;
  padding: 2rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}

.logo-container {
  text-align: center;
  margin-bottom: 1.5rem;
}

.logo-container img {
  max-width: 150px;
}

h2 {
  text-align: center;
  margin-bottom: 1.5rem;
  color: #333;
}

.input-group {
  margin-bottom: 1rem;
}

.input-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #555;
}

.input-group input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

button {
  width: 100%;
  padding: 0.75rem;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  margin-top: 1rem;
}

button:hover {
  background-color: #45a049;
}

.recover-link {
  text-align: center;
  margin-top: 1.5rem;
}

.recover-link a {
  color: #666;
  text-decoration: none;
  font-size: 0.9rem;
}

.recover-link a:hover {
  text-decoration: underline;
  color: #4CAF50;
}
</style>