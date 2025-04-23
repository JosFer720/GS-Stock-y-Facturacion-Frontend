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
      <p v-if="mensaje" class="mensaje" :class="{ 'error': tipoMensaje === 'error', 'success': tipoMensaje === 'success' }">
        {{ mensaje }}
      </p>
    </form>
    <div class="back-link">
      <a href="#" @click.prevent="volverAlLogin">Volver al login</a>
    </div>
  </div>
</template>

<script>
export default {
  name: 'RestablecerView',
  data() {
    return {
      correo: '',
      mensaje: '',
      tipoMensaje: '' // 'error' o 'success'
    }
  },
  methods: {
    async enviarSolicitud() {
      this.mensaje = '';
      this.tipoMensaje = '';
      
      if (!this.correo) {
        this.mensaje = 'Por favor, ingrese su correo electrónico';
        this.tipoMensaje = 'error';
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
        
        // Si la solicitud fue exitosa
        this.mensaje = 'Se ha enviado un correo con las instrucciones para restablecer su contraseña';
        this.tipoMensaje = 'success';
        
        // Opcional: redirigir al login después de unos segundos
        setTimeout(() => {
          this.$router.push('/');
        }, 5000);
      } catch (err) {
        this.mensaje = err.message;
        this.tipoMensaje = 'error';
      }
    },
    volverAlLogin() {
      this.$router.push('/');
    }
  }
}
</script>

<style scoped>
@import '@/styles/main.css';

h2 {
  margin-top: 10px;
  margin-bottom: 30px;
  font-size: 28px;
}

.instructions {
  text-align: center;
  color: var(--text-color);
  margin-bottom: 35px;
  font-size: 16px;
  line-height: 1.4;
}

.input-group {
  margin-bottom: 8px;
}

label {
  margin-bottom: 12px;
  display: block;
  font-weight: 500;
}

input {
  padding: 14px 16px;
  font-size: 16px;
}

.submit-button {
  margin-top: 5px;
  margin-bottom: 20px;
  padding: 16px;
  font-size: 16px;
  font-weight: 500;
  width: 100%;
}

.mensaje {
  text-align: center;
  margin-top: 20px;
  margin-bottom: 20px;
  padding: 12px;
  border-radius: 5px;
  font-weight: 500;
}

.success {
  background-color: rgba(76, 175, 80, 0.1);
  color: #4CAF50;
  border: 1px solid #4CAF50;
}

.error {
  background-color: rgba(244, 67, 54, 0.1);
  color: var(--error-color);
  border: 1px solid var(--error-color);
}

.back-link {
  text-align: center;
  margin-top: 30px;
}

.back-link a {
  color: var(--text-color);
  text-decoration: none;
  font-size: 14px;
  transition: color 0.2s;
  padding: 5px;
}

.back-link a:hover {
  color: var(--primary-color);
  text-decoration: underline;
}

/* Mejores espaciados en la vista móvil */
@media (max-width: 480px) {
  h2 {
    margin-bottom: 25px;
  }
  
  .instructions {
    margin-bottom: 30px;
  }
  
  .input-group {
    margin-bottom: 30px;
  }
}
</style>