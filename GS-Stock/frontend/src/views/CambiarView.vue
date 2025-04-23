<template>
  <div class="login-container">
    <div class="logo-container">
      <img src="/src/assets/images/logo.svg" alt="GS Stock Logo">
    </div>
    <h2>Cambiar Contraseña</h2>
    <form @submit.prevent="cambiarContrasena">
      <div class="input-group">
        <label for="nuevaContrasena">Contraseña:</label>
        <input type="password" id="nuevaContrasena" v-model="nuevaContrasena" required>
      </div>
      <div class="input-group">
        <label for="confirmarContrasena">Confirmar Contraseña:</label>
        <input type="password" id="confirmarContrasena" v-model="confirmarContrasena" required>
      </div>
      <button type="submit">Actualizar Contraseña</button>
      <p v-if="error" class="error">{{ error }}</p>
      <p v-if="mensaje" class="mensaje">{{ mensaje }}</p>
    </form>
    <div class="recover-link">
      <a href="#" @click.prevent="volverALogin">Volver al inicio de sesión</a>
    </div>
  </div>
</template>

<script>
export default {
  name: 'CambiarView',
  data() {
    return {
      nuevaContrasena: '',
      confirmarContrasena: '',
      error: '',
      mensaje: ''
    }
  },
  methods: {
    cambiarContrasena() {
      this.error = '';
      this.mensaje = '';
      
      if (!this.nuevaContrasena || !this.confirmarContrasena) {
        this.error = 'Por favor, complete todos los campos';
        return;
      }
      
      if (this.nuevaContrasena !== this.confirmarContrasena) {
        this.error = 'Las contraseñas no coinciden';
        return;
      }
      
      // Aquí iría la lógica para cambiar la contraseña
      // Por ahora solo mostramos un mensaje de éxito
      this.mensaje = 'Contraseña actualizada correctamente';
      
      // Limpiar campos después de enviar
      this.nuevaContrasena = '';
      this.confirmarContrasena = '';
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

h2 {
  text-align: center;
  color: var(--text-color);
  margin-top: 0;
  margin-bottom: 25px;
  font-weight: 500;
  font-size: 24px;
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

button:hover {
  background-color: var(--primary-hover);
}

button:active {
  transform: scale(0.98);
}

.error {
  color: var(--error-color);
  font-size: 14px;
  margin-top: 15px;
  text-align: center;
  font-weight: 500;
}

.mensaje {
  color: var(--primary-color);
  font-size: 14px;
  margin-top: 15px;
  text-align: center;
  font-weight: 500;
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
}
</style>