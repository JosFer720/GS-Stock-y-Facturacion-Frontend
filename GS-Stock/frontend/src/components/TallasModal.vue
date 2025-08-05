<template>
  <div v-if="show" class="tallas-modal">
    <div class="tallas-modal-content">
      <span class="close" @click="$emit('close')">&times;</span>
      <h2>Tallas y Precios Disponibles</h2>
      
      <div class="tallas-grid">
        <div v-for="item in tallas" :key="item.id_talla" class="talla-item">
          <div class="talla-numero">EU: {{ item.numero }} / US: {{ item.talla_us }}</div>
          <div class="talla-stock">Stock: {{ item.stock }}</div>
          <div class="talla-precio">Precio: Q{{ item.precio_par }}</div>
        </div>
      </div>
      
      <button class="close-btn" @click="$emit('close')">Cerrar</button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  show: {
    type: Boolean,
    required: true,
    default: false
  },
  tallas: {
    type: Array,
    required: true,
    default: () => []
  }
});

defineEmits(['close']);
</script>

<style scoped>
.tallas-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.tallas-modal-content {
  background: white;
  padding: 20px;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  overflow-y: auto;
}

.close {
  float: right;
  font-size: 24px;
  cursor: pointer;
}

.tallas-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 15px;
  margin: 20px 0;
}

.talla-item {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 10px;
  text-align: center;
}

.talla-numero {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 5px;
}

.talla-stock, .talla-precio {
  font-size: 14px;
  color: #666;
}

.close-btn {
  padding: 10px 20px;
  background-color: #333;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 10px;
}
</style>