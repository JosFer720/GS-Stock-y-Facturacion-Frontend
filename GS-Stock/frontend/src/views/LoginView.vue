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
        // En Vue Router usamos this.$router.push en lugar de window.location
        this.$router.push('/dashboard');
      } catch (err) {
        this.error = err.message;
      }
    }
  }
}
</script>

<style scoped>
</style>