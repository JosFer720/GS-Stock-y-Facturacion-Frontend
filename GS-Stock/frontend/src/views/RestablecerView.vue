<template>
  <div class="login-wrapper">
    <div class="login-split-container">
      <!-- Sección Izquierda - Formulario -->
      <div class="login-form-section">
        <div class="form-content">
          <h2 class="login-title">Recuperar Contraseña</h2>
          <p class="instructions">Ingrese el correo asociado al usuario</p>
          
          <form @submit.prevent="enviarSolicitud" v-if="!emailEnviado" class="login-form">
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
            
            <button type="submit" class="btn-ingresar" :disabled="loading || !correo">
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
            <button @click="reiniciarFormulario" class="btn-secondary">
              Enviar a otro correo
            </button>
          </div>
          
          <div class="back-link">
            <a href="#" @click.prevent="volverAlLogin">Volver al login</a>
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
  name: 'RestablecerView',
  data() {
    return {
      logo,
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
    
    isValidEmail(email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    },
    
    async enviarSolicitud() {
      console.log('=== SOLICITUD DE RECUPERACIÓN ===');
      console.log('Email ingresado:', this.correo);
      
      if (!this.correo) {
        console.log('❌ Email vacío');
        this.showMessage('Error', 'Por favor, ingrese su correo electrónico', 'error');
        return;
      }
      
      if (!this.isValidEmail(this.correo)) {
        console.log('❌ Email inválido');
        this.showMessage('Error', 'Por favor, ingrese un correo electrónico válido', 'error');
        return;
      }
      
      this.loading = true;
      
      try {
        const normalizedEmail = this.correo.toLowerCase().trim();
        console.log('📧 Email normalizado:', normalizedEmail);
        console.log('🚀 Enviando solicitud a /api/auth/forgot-password...');
        
        const response = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            email: normalizedEmail
          })
        });
        
        console.log('📡 Response status:', response.status);
        
        const data = await response.json();
        console.log('📦 Response data:', data);
        
        if (!response.ok) {
          console.log('❌ Response no OK');
          throw new Error(data.error || data.message || 'Error al procesar la solicitud');
        }
        
        console.log('✅ Email de recuperación enviado exitosamente');
        this.emailEnviado = true;
        
        if (data.resetLink && process.env.NODE_ENV === 'development') {
          console.log('🔗 Enlace de recuperación (desarrollo):', data.resetLink);
        }
        
      } catch (err) {
        console.error('💀 Error en forgot-password:', err);
        console.error('Error message:', err.message);
        this.showMessage('Error', err.message || 'Error al procesar la solicitud', 'error');
      } finally {
        this.loading = false;
        console.log('🏁 Proceso de recuperación finalizado');
      }
    },
    
    volverAlLogin() {
      console.log('🔙 Volviendo al login...');
      window.location.href = '/';
    }
  }
}
</script>

<style src="@/styles/restablecer.css"></style>