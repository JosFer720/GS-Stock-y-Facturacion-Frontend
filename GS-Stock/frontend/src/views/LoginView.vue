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
      <p v-if="error" class="error">{{ error }}</p>
    </form>
    <div class="recover-link">
      <a href="#" @click.prevent="irARestablecer">Recuperar contraseña</a>
    </div>
  </div>
</template>

<script>
export default {
  name: 'LoginView',
  data() {
    return {
      usuario: '',
      contrasena: '',
      error: ''
    }
  },
  methods: {
    async handleLogin() {
      this.error = '';
      
      if (!this.usuario || !this.contrasena) {
        this.error = 'Por favor, complete todos los campos';
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
        // Guardar token y datos de usuario
        localStorage.setItem('jwtToken', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Redirigir al dashboard
        this.$router.push('/dashboard');
      } catch (err) {
        this.error = err.message;
      }
    },
    irARestablecer() {
      this.$router.push('/restablecer');
    }
  }
}
</script>


<style scoped>
.recover-link {
  text-align: center;
  margin-top: 20px;
}

.recover-link a {
  color: var(--text-color);
  text-decoration: none;
  font-size: 14px;
  transition: color 0.2s;
}

.recover-link a:hover {
  color: var(--primary-color);
  text-decoration: underline;
}

.error {
  margin-top: 15px;
  margin-bottom: 15px;
}
@media (max-width: 480px) {
  h2 {
    margin-bottom: 20px;
    font-size: 22px;
  }
  
  .instructions, .input-group {
    margin-bottom: 20px;
  }
  
  input, button {
    padding: 12px;
  }
}
</style>
