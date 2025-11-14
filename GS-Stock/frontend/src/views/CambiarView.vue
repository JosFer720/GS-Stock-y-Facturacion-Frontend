<template>
  <div class="login-wrapper">
    <div class="login-split-container">
      <!-- Sección Izquierda - Formulario -->
      <div class="login-form-section">
        <div class="form-content">
          <!-- Loading de validación de token -->
          <div v-if="validandoToken" class="loading-container">
            <div class="spinner"></div>
            <p>Validando enlace de recuperación...</p>
          </div>
          
          <!-- Formulario de cambio de contraseña -->
          <div v-else-if="tokenValido">
            <h2 class="login-title">Cambiar Contraseña</h2>
            <p v-if="nombreUsuario" class="welcome-message">
              Hola <strong>{{ nombreUsuario }}</strong>, ingresa tu nueva contraseña
            </p>
            
            <form @submit.prevent="cambiarContrasena" class="login-form">
              <div class="input-group">
                <label for="nuevaContrasena">Nueva Contraseña:</label>
                <input 
                  type="password" 
                  id="nuevaContrasena" 
                  v-model="nuevaContrasena" 
                  :disabled="loading"
                  required 
                  minlength="8"
                  placeholder="Mínimo 8 caracteres"
                >
                <small class="password-hint">La contraseña debe tener al menos 8 caracteres</small>
              </div>
              
              <div class="input-group">
                <label for="confirmarContrasena">Confirmar Contraseña:</label>
                <input 
                  type="password" 
                  id="confirmarContrasena" 
                  v-model="confirmarContrasena" 
                  :disabled="loading"
                  required
                  placeholder="Confirma tu nueva contraseña"
                >
              </div>
              
              <!-- Indicador de fortaleza de contraseña -->
              <div v-if="nuevaContrasena" class="password-strength">
                <div class="strength-bar">
                  <div 
                    class="strength-fill" 
                    :class="passwordStrength.class"
                    :style="{ width: passwordStrength.width }"
                  ></div>
                </div>
                <small :class="passwordStrength.class">{{ passwordStrength.text }}</small>
              </div>
              
              <button type="submit" class="btn-ingresar" :disabled="loading || !puedeEnviar">
                {{ loading ? 'Actualizando...' : 'Actualizar Contraseña' }}
              </button>
            </form>
            
            <div class="back-link">
              <a href="#" @click.prevent="volverALogin">Volver al inicio de sesión</a>
            </div>
          </div>
          
          <!-- Error de token -->
          <div v-else class="error-container">
            <div class="error-icon">⚠️</div>
            <h3>Enlace no válido</h3>
            <p>{{ mensajeError }}</p>
            <button @click="volverALogin" class="btn-secondary">
              Volver al inicio de sesión
            </button>
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
  name: 'CambiarView',
  data() {
    return {
      logo,
      nuevaContrasena: '',
      confirmarContrasena: '',
      loading: false,
      validandoToken: true,
      tokenValido: false,
      nombreUsuario: '',
      token: '',
      mensajeError: '',
      showMessageModal: false,
      messageTitle: '',
      messageContent: '',
      messageType: 'info'
    }
  },
  computed: {
    puedeEnviar() {
      return this.nuevaContrasena.length >= 8 && 
             this.nuevaContrasena === this.confirmarContrasena &&
             !this.loading;
    },
    
    passwordStrength() {
      const password = this.nuevaContrasena;
      if (password.length < 8) {
        return { width: '25%', class: 'weak', text: 'Muy débil' };
      }
      
      let score = 0;
      if (password.length >= 8) score++;
      if (/[a-z]/.test(password)) score++;
      if (/[A-Z]/.test(password)) score++;
      if (/[0-9]/.test(password)) score++;
      if (/[^A-Za-z0-9]/.test(password)) score++;
      
      if (score <= 2) return { width: '40%', class: 'weak', text: 'Débil' };
      if (score <= 3) return { width: '60%', class: 'medium', text: 'Regular' };
      if (score <= 4) return { width: '80%', class: 'good', text: 'Buena' };
      return { width: '100%', class: 'strong', text: 'Muy fuerte' };
    }
  },
  created() {
    this.inicializar();
  },
  methods: {
    async inicializar() {
      // Obtener token de los parámetros de la URL
      let rawToken = this.$route.query.token;
      
      console.log('🔍 Inicializando cambio de contraseña...');
      console.log('📦 Token de URL query (raw):', rawToken);
      console.log('📏 Token length (raw):', rawToken?.length);
      console.log('🔤 Token type:', typeof rawToken);
      
      if (!rawToken) {
        console.log('❌ No hay token en la URL');
        this.validandoToken = false;
        this.tokenValido = false;
        this.mensajeError = 'No se proporcionó un token de recuperación válido.';
        return;
      }
      
      // Limpiar el token de espacios y caracteres extraños
      let cleanToken = rawToken.trim();
      cleanToken = cleanToken.replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '');
      cleanToken = decodeURIComponent(cleanToken);
      cleanToken = cleanToken.replace(/[^a-fA-F0-9]/g, '');
      
      this.token = cleanToken;
      
      console.log('🧹 Token después de limpieza:', this.token);
      console.log('📏 Token length después de limpieza:', this.token.length);
      console.log('✅ Token es hexadecimal válido:', /^[a-fA-F0-9]+$/.test(this.token));
      
      if (this.token.length !== 64) {
        console.log('⚠️ Token con longitud incorrecta. Esperado: 64, Recibido:', this.token.length);
        this.validandoToken = false;
        this.tokenValido = false;
        this.mensajeError = 'El token de recuperación tiene un formato inválido.';
        return;
      }
      
      await this.validarToken();
    },
    
    async validarToken() {
      try {
        console.log('=== VALIDANDO TOKEN EN FRONTEND ===');
        console.log('🔑 Token a validar:', this.token);
        console.log('📏 Token length:', this.token.length);
        
        const requestBody = { token: this.token };
        console.log('📤 Request body:', JSON.stringify(requestBody));
        
        const response = await fetch('/api/auth/validate-reset-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });
        
        console.log('📡 Response status:', response.status);
        console.log('📡 Response ok:', response.ok);
        
        const data = await response.json();
        console.log('📦 Response data:', data);
        
        if (response.ok && data.valid) {
          this.tokenValido = true;
          this.nombreUsuario = data.userName || '';
          console.log('✅ Token válido - Usuario:', this.nombreUsuario);
        } else {
          this.tokenValido = false;
          this.mensajeError = data.error || 'El enlace de recuperación no es válido o ha expirado.';
          console.log('❌ Token inválido:', this.mensajeError);
        }
        
      } catch (error) {
        console.error('💀 Error validando token:', error);
        console.error('Error stack:', error.stack);
        this.tokenValido = false;
        this.mensajeError = 'Error al validar el enlace de recuperación. Por favor, intenta más tarde.';
      } finally {
        this.validandoToken = false;
        console.log('🏁 Validación completada. Token válido:', this.tokenValido);
      }
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

    async cambiarContrasena() {
      console.log('=== INICIANDO CAMBIO DE CONTRASEÑA ===');
      this.loading = true;
      
      if (!this.nuevaContrasena || !this.confirmarContrasena) {
        console.log('❌ Campos vacíos');
        this.showMessage('Error', 'Por favor, complete todos los campos', 'error');
        this.loading = false;
        return;
      }
      
      if (this.nuevaContrasena.length < 8) {
        console.log('❌ Contraseña muy corta');
        this.showMessage('Error', 'La contraseña debe tener al menos 8 caracteres', 'error');
        this.loading = false;
        return;
      }
      
      if (this.nuevaContrasena !== this.confirmarContrasena) {
        console.log('❌ Contraseñas no coinciden');
        this.showMessage('Error', 'Las contraseñas no coinciden', 'error');
        this.loading = false;
        return;
      }
      
      try {
        console.log('✅ Validaciones pasadas');
        console.log('🚀 Enviando solicitud de cambio de contraseña...');
        console.log('🔐 Token a usar:', this.token);
        console.log('📏 Token length:', this.token.length);
        
        const requestBody = {
          token: this.token,
          newPassword: this.nuevaContrasena
        };
        
        console.log('📤 Enviando request a /api/auth/reset-password');
        
        const response = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });
        
        console.log('📡 Reset password response status:', response.status);
        console.log('📡 Response ok:', response.ok);
        
        const data = await response.json();
        console.log('📦 Reset password response data:', data);
        
        if (!response.ok) {
          console.log('❌ Response no OK, lanzando error');
          throw new Error(data.error || data.message || `Error ${response.status}`);
        }
        
        console.log('🎉 Contraseña cambiada exitosamente');
        this.showMessage(
          'Éxito', 
          'Contraseña actualizada correctamente. Serás redirigido al login en 3 segundos.', 
          'success'
        );
        
        this.nuevaContrasena = '';
        this.confirmarContrasena = '';
        
        setTimeout(() => {
          console.log('🔄 Redirigiendo al login...');
          window.location.href = '/';
        }, 3000);
        
      } catch (error) {
        console.error('💀 Error cambiando contraseña:', error);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        this.showMessage('Error', error.message || 'Error al actualizar la contraseña', 'error');
      } finally {
        this.loading = false;
        console.log('🏁 Proceso de cambio de contraseña finalizado');
      }
    },
    
    volverALogin() {
      console.log('🔙 Volviendo al login...');
      window.location.href = '/';
    }
  }
}
</script>

<style src="@/styles/cambiar.css"></style>