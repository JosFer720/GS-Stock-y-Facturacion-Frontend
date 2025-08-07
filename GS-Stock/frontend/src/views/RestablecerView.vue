<template>
  <div class="login-container">
    <div class="logo-container">
      <img src="/src/assets/images/logo.svg" alt="GS Stock Logo">
    </div>
    <h2>Recuperar Contraseña</h2>
    <p class="instructions">Ingrese el correo asociado al usuario</p>
    <form @submit.prevent="enviarSolicitud" v-if="!emailEnviado">
      <div class="input-group">
        <label for="correo">Correo electrónico:</label>
        <input 
          type="email" 
          id="correo" 
          v-model="correo" 
          :disabled="loading"
          required
          placeholder="ejemplo@correo.com"
        >
      </div>
      <button type="submit" class="submit-button" :disabled="loading || !correo">
        <span v-if="loading">Enviando...</span>
        <span v-else>Enviar</span>
      </button>
    </form>
    
    <!-- Mensaje de éxito -->
    <div v-if="emailEnviado" class="success-message">
      <div class="success-icon">✉️</div>
      <h3>¡Correo Enviado!</h3>
      <p>Se ha enviado un correo con las instrucciones para restablecer tu contraseña.</p>
      <p><small>Si no lo encuentras, revisa tu carpeta de spam.</small></p>
      <button @click="reiniciarFormulario" class="secondary-button">
        Enviar a otro correo
      </button>
    </div>
    
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
      loading: false,
      emailEnviado: false,
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
    
    reiniciarFormulario() {
      this.emailEnviado = false;
      this.correo = '';
    },
    
    // Validar formato de email
    isValidEmail(email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    },
    
    // Conexión con el endpoint de forgot-password
    async enviarSolicitud() {
      // Validaciones frontend
      if (!this.correo) {
        this.showMessage('Error', 'Por favor, ingrese su correo electrónico', 'error');
        return;
      }
      
      if (!this.isValidEmail(this.correo)) {
        this.showMessage('Error', 'Por favor, ingrese un correo electrónico válido', 'error');
        return;
      }
      
      this.loading = true;
      
      try {
        const response = await fetch('http://localhost:3000/api/auth/forgot-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            email: this.correo.toLowerCase().trim() 
          }),
          mode: 'cors'
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Error al procesar la solicitud');
        }
        
        // Mostrar éxito
        this.emailEnviado = true;
        
        // Si estamos en desarrollo y hay un resetLink, mostrarlo
        if (data.resetLink && process.env.NODE_ENV === 'development') {
          console.log('Enlace de recuperación (desarrollo):', data.resetLink);
        }
        
      } catch (err) {
        console.error('Error en forgot-password:', err);
        this.showMessage('Error', err.message || 'Error al procesar la solicitud', 'error');
      } finally {
        this.loading = false;
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
  background: #f8f5ed;
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
  font-weight: 500;
}

.input-group input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.input-group input:focus {
  outline: none;
  border-color: #4CAF50;
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
}

.input-group input:disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
}

.submit-button {
  width: 100%;
  padding: 0.75rem;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  margin-top: 1rem;
  transition: all 0.2s;
  font-weight: 500;
}

.submit-button:hover:not(:disabled) {
  background-color: #45a049;
}

.submit-button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.secondary-button {
  width: 100%;
  padding: 0.75rem;
  background-color: #f5f5f5;
  color: #333;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  margin-top: 1rem;
  transition: all 0.2s;
}

.secondary-button:hover {
  background-color: #e9e9e9;
}

.success-message {
  text-align: center;
  padding: 2rem 0;
}

.success-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.success-message h3 {
  color: #4CAF50;
  margin-bottom: 1rem;
}

.success-message p {
  color: #666;
  margin-bottom: 0.5rem;
}

.success-message small {
  color: #999;
}

.back-link {
  text-align: center;
  margin-top: 1.5rem;
}

.back-link a {
  color: #666;
  text-decoration: none;
  font-size: 0.9rem;
  transition: color 0.2s;
}

.back-link a:hover {
  text-decoration: underline;
  color: #4CAF50;
}

@media (max-width: 480px) {
  .login-container {
    margin: 15px;
    padding: 1.5rem;
  }
  
  h2 {
    font-size: 1.5rem;
  }
}
</style>