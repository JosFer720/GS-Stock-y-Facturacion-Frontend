<template>
  <div class="login-container">
    <div class="logo-container">
      <img src="/src/assets/images/logo.svg" alt="GS Stock Logo">
    </div>
    <h2>Recuperar Contraseña</h2>
    <p class="instructions">Ingrese el correo asociado al usuario</p>
    <form @submit.prevent="enviarSolicitud">
      <div class="input-group">
        <label for="correo">Correo electrónico:</label>
        <input type="email" id="correo" v-model="correo" required>
      </div>
      <button type="submit" class="submit-button">Enviar</button>
    </form>
    <div class="back-link">
      <a href="#" @click.prevent="volverAlLogin">Volver al login</a>
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
  name: 'RestablecerView',
  components: {
    ModalMessage
  },
  data() {
    return {
      correo: '',
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
    async enviarSolicitud() {
      if (!this.correo) {
        this.showMessage('Error', 'Por favor, ingrese su correo electrónico', 'error');
        return;
      }
      
      try {
        const response = await fetch('http://localhost:3000/api/auth/recuperar', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ correo: this.correo }),
          mode: 'cors'
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al procesar la solicitud');
        }
        
        this.showMessage('Éxito', 'Se ha enviado un correo con las instrucciones para restablecer su contraseña', 'success');
        
        setTimeout(() => {
          this.$router.push('/');
        }, 5000);
      } catch (err) {
        this.showMessage('Error', err.message, 'error');
      }
    },
    volverAlLogin() {
      this.$router.push('/');
    }
  }
}
</script>

<style scoped>
.login-container {
  max-width: 400px;
  margin: 0 auto;
  padding: 2rem;
  background: f8f5ed;
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
  margin-bottom: 1rem;
  color: #333;
}

.instructions {
  text-align: center;
  color: #666;
  margin-bottom: 1.5rem;
  font-size: 0.95rem;
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

.submit-button {
  width: 100%;
  padding: 0.75rem;
  background-color: #2196F3;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  margin-top: 1rem;
}

.submit-button:hover {
  background-color: #0b7dda;
}

.back-link {
  text-align: center;
  margin-top: 1.5rem;
}

.back-link a {
  color: #666;
  text-decoration: none;
  font-size: 0.9rem;
}

.back-link a:hover {
  text-decoration: underline;
  color: #2196F3;
}
</style>