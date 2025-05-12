<template>
  <div v-if="show" class="modal-message-overlay">
    <div class="modal-message" :class="type">
      <div class="modal-header">
        <h3>{{ title }}</h3>
        <button class="close-button" @click="close">&times;</button>
      </div>
      <div class="modal-body">
        <p>{{ message }}</p>
      </div>
      <div class="modal-footer">
        <button class="confirm-button" @click="close">Aceptar</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ModalMessage',
  props: {
    show: {
      type: Boolean,
      default: false
    },
    title: {
      type: String,
      default: 'Mensaje'
    },
    message: {
      type: String,
      required: true
    },
    type: {
      type: String,
      default: 'info',
      validator: value => ['info', 'success', 'error', 'warning'].includes(value)
    }
  },
  methods: {
    close() {
      this.$emit('close');
    }
  }
}
</script>

<style scoped>
.modal-message-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-message {
  background-color: white;
  border-radius: 8px;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.modal-header {
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #eee;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.2rem;
}

.close-button {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #666;
}

.modal-body {
  padding: 16px;
}

.modal-body p {
  margin: 0;
  line-height: 1.5;
}

.modal-footer {
  padding: 16px;
  display: flex;
  justify-content: flex-end;
  border-top: 1px solid #eee;
}

.confirm-button {
  padding: 8px 16px;
  background-color: var(--primary-color, #4CAF50);
  color: white !important; /* Forzamos el color blanco */
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
}

.confirm-button:hover {
  background-color: var(--primary-dark-color, #388E3C);
  color: white !important; /* Aseguramos que el texto siga blanco en hover */
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.confirm-button:active {
  transform: translateY(0);
  box-shadow: none;
}

/* Estilos según tipo de mensaje */
.modal-message.success {
  --primary-color: #4CAF50;
  --primary-dark-color: #388E3C;
}

.modal-message.error {
  --primary-color: #F44336;
  --primary-dark-color: #D32F2F;
}

.modal-message.warning {
  --primary-color: #FF9800;
  --primary-dark-color: #F57C00;
}

.modal-message.info {
  --primary-color: #2196F3;
  --primary-dark-color: #1976D2;
}

.modal-message.success .modal-header {
  background-color: var(--primary-color);
  color: white;
}

.modal-message.error .modal-header {
  background-color: var(--primary-color);
  color: white;
}

.modal-message.warning .modal-header {
  background-color: var(--primary-color);
  color: white;
}

.modal-message.info .modal-header {
  background-color: var(--primary-color);
  color: white;
}

/* Animaciones */
.modal-message-overlay {
  transition: opacity 0.3s ease;
}

.modal-message {
  transition: transform 0.3s ease;
}

.modal-message-enter-active, .modal-message-leave-active {
  transition: opacity 0.3s;
}

.modal-message-enter, .modal-message-leave-to {
  opacity: 0;
}

.modal-message-enter .modal-message,
.modal-message-leave-to .modal-message {
  transform: scale(0.9);
}
</style>