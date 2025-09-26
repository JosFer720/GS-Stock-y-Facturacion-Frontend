<template>
  <div class="login-container">
    <div class="logo-container">
      <img src="/src/assets/images/logo.svg" alt="GS Stock Logo">
    </div>
    
    <!-- Loading de validación de token -->
    <div v-if="validandoToken" class="loading-container">
      <div class="spinner"></div>
      <p>Validando enlace de recuperación...</p>
    </div>
    
    <!-- Formulario de cambio de contraseña -->
    <div v-else-if="tokenValido">
      <h2>Cambiar Contraseña</h2>
      <p v-if="nombreUsuario" class="welcome-message">
        Hola <strong>{{ nombreUsuario }}</strong>, ingresa tu nueva contraseña
      </p>
      
      <form @submit.prevent="cambiarContrasena">
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
        
        <button type="submit" :disabled="loading || !puedeEnviar">
          {{ loading ? 'Actualizando...' : 'Actualizar Contraseña' }}
        </button>
      </form>
    </div>
    
    <!-- Error de token -->
    <div v-else class="error-container">
      <div class="error-icon">⚠️</div>
      <h3>Enlace no válido</h3>
      <p>{{ mensajeError }}</p>
      <button @click="volverALogin" class="secondary-button">
        Volver al inicio de sesión
      </button>
    </div>
    
    <div class="recover-link" v-if="tokenValido">
      <a href="#" @click.prevent="volverALogin">Volver al inicio de sesión</a>
    </div>

    <!-- Modal de mensaje -->
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
  name: 'CambiarView',
  components: {
    ModalMessage
  },
  data() {
    return {
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
      this.token = this.$route.query.token;
      
      if (!this.token) {
        this.validandoToken = false;
        this.tokenValido = false;
        this.mensajeError = 'No se proporcionó un token de recuperación válido.';
        return;
      }
      
      await this.validarToken();
    },
    
    async validarToken() {
      try {
        const response = await fetch('/api/auth/validate-reset-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ token: this.token }),
          mode: 'cors'
        });
        
        const data = await response.json();
        
        if (response.ok && data.valid) {
          this.tokenValido = true;
          this.nombreUsuario = data.userName || '';
        } else {
          this.tokenValido = false;
          this.mensajeError = data.error || 'El enlace de recuperación no es válido o ha expirado.';
        }
        
      } catch (error) {
        console.error('Error validando token:', error);
        this.tokenValido = false;
        this.mensajeError = 'Error al validar el enlace de recuperación. Por favor, intenta más tarde.';
      } finally {
        this.validandoToken = false;
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
      console.log('Iniciando cambio de contraseña...');
      console.log('Token:', this.token);
      console.log('Nueva contraseña length:', this.nuevaContrasena.length);
      
      this.loading = true;
      
      // Validaciones frontend
      if (!this.nuevaContrasena || !this.confirmarContrasena) {
        this.showMessage('Error', 'Por favor, complete todos los campos', 'error');
        this.loading = false;
        return;
      }
      
      if (this.nuevaContrasena.length < 8) {
        this.showMessage('Error', 'La contraseña debe tener al menos 8 caracteres', 'error');
        this.loading = false;
        return;
      }
      
      if (this.nuevaContrasena !== this.confirmarContrasena) {
        this.showMessage('Error', 'Las contraseñas no coinciden', 'error');
        this.loading = false;
        return;
      }
      
      try {
        console.log('Enviando petición a reset-password...');
        
        const requestBody = {
          token: this.token,
          newPassword: this.nuevaContrasena
        };
        
        console.log('Body de la petición:', requestBody);
        
        // Llamada al endpoint de reset-password
        const response = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody),
          mode: 'cors'
        });
        
        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);
        
        let data;
        try {
          const responseText = await response.text();
          console.log('Response text:', responseText);
          
          if (responseText) {
            data = JSON.parse(responseText);
          } else {
            data = {};
          }
          console.log('Response data:', data);
        } catch (parseError) {
          console.error('Error parsing JSON response:', parseError);
          throw new Error('Respuesta inválida del servidor');
        }
        
        if (!response.ok) {
          // Manejar diferentes tipos de error del servidor
          let errorMessage = 'Error desconocido';
          
          if (data && data.error) {
            errorMessage = data.error;
          } else if (data && data.message) {
            errorMessage = data.message;
          } else {
            errorMessage = `Error ${response.status}: ${response.statusText}`;
          }
          
          throw new Error(errorMessage);
        }
        
        // Éxito
        console.log('Contraseña cambiada exitosamente');
        this.showMessage(
          'Éxito', 
          'Contraseña actualizada correctamente. Serás redirigido al login en 3 segundos.', 
          'success'
        );
        
        // Limpiar campos
        this.nuevaContrasena = '';
        this.confirmarContrasena = '';
        
        // Redirigir al login después de 3 segundos
        setTimeout(() => {
          this.$router.push('/');
        }, 3000);
        
      } catch (error) {
        console.error('Error completo cambiando contraseña:', error);
        console.error('Error stack:', error.stack);
        
        let errorMessage = 'Error desconocido';
        
        // Mejor manejo de errores
        if (error instanceof TypeError && error.message.includes('fetch')) {
          errorMessage = 'Error de conexión. Verifica que el servidor esté funcionando.';
        } else if (error.message) {
          errorMessage = error.message;
        } else if (error.error) {
          errorMessage = error.error;
        }
        
        this.showMessage('Error', errorMessage, 'error');
      } finally {
        this.loading = false;
      }
    },
    
    volverALogin() {
      this.$router.push('/');
    }
  }
}
</script>

<style scoped>
.login-container {
  background-color: var(--card-bg);
  border-radius: 10px;
  box-shadow: var(--shadow);
  width: 100%;
  max-width: 400px;
  padding: 35px;
  margin: 20px auto;
  transition: all 0.3s ease;
}

.logo-container {
  text-align: center;
  margin-bottom: 30px;
  padding: 10px;
  border-radius: 8px;
  display: inline-block;
  width: auto;
  margin-left: auto;
  margin-right: auto;
  display: block;
}

.logo-container img {
  max-width: 230px;
  height: auto;
}

.loading-container {
  text-align: center;
  padding: 2rem 0;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #4CAF50;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-container {
  text-align: center;
  padding: 2rem 0;
}

.error-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.error-container h3 {
  color: #f44336;
  margin-bottom: 1rem;
}

.error-container p {
  color: #666;
  margin-bottom: 1.5rem;
}

h2 {
  text-align: center;
  color: var(--text-color);
  margin-top: 0;
  margin-bottom: 25px;
  font-weight: 500;
  font-size: 24px;
}

.welcome-message {
  text-align: center;
  color: var(--text-secondary);
  margin-bottom: 25px;
  font-size: 14px;
}

form {
  display: flex;
  flex-direction: column;
}

.input-group {
  margin-bottom: 20px;
}

label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: var(--text-color);
  font-size: 16px;
}

input {
  width: 100%;
  padding: 12px 15px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  box-sizing: border-box;
  font-size: 15px;
  transition: all 0.2s;
  background-color: var(--input-bg);
}

input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
}

input:disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
}

.password-hint {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 4px;
  display: block;
}

.password-strength {
  margin-bottom: 15px;
}

.strength-bar {
  width: 100%;
  height: 4px;
  background-color: #e0e0e0;
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 5px;
}

.strength-fill {
  height: 100%;
  transition: all 0.3s ease;
}

.strength-fill.weak {
  background-color: #f44336;
}

.strength-fill.medium {
  background-color: #ff9800;
}

.strength-fill.good {
  background-color: #2196f3;
}

.strength-fill.strong {
  background-color: #4caf50;
}

small.weak {
  color: #f44336;
}

small.medium {
  color: #ff9800;
}

small.good {
  color: #2196f3;
}

small.strong {
  color: #4caf50;
}

button {
  background-color: var(--primary-color);
  color: white;
  padding: 14px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 500;
  transition: background-color 0.2s, transform 0.1s;
  letter-spacing: 0.5px;
}

button:hover:not(:disabled) {
  background-color: var(--primary-hover);
}

button:active:not(:disabled) {
  transform: scale(0.98);
}

button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.secondary-button {
  background-color: #f5f5f5;
  color: #333;
  border: 1px solid #ddd;
}

.secondary-button:hover:not(:disabled) {
  background-color: #e9e9e9;
}

.recover-link {
  text-align: center;
  margin-top: 20px;
}

.recover-link a {
  color: var(--primary-color);
  text-decoration: none;
  font-size: 14px;
  transition: color 0.2s;
}

.recover-link a:hover {
  color: var(--primary-hover);
  text-decoration: underline;
}

@media (max-width: 480px) {
  .login-container {
    margin: 15px;
    padding: 25px;
  }
  
  h2 {
    font-size: 22px;
  }
  
  .error-container, .loading-container {
    padding: 1.5rem 0;
  }
}
</style>