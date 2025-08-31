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

<style scoped src="../styles/restablecer.css">

</style>