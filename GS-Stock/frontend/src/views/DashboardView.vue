<template>
  <div class="dashboard-page">
    <header-component></header-component>
    <div class="dashboard-container">
      <h1>Dashboard</h1>
      
      <!-- KPI Cards -->
      <div class="kpi-container">
        <div class="kpi-card">
          <div class="kpi-header">TOTAL DE INGRESOS</div>
          <div class="kpi-value">Q{{ formatCurrency(ingresos.total) }}</div>
          <div class="kpi-footer">
            <span class="kpi-period">Últimos 30 días</span>
            <span :class="['kpi-change', ingresos.porcentaje_cambio >= 0 ? 'positive' : 'negative']">
              {{ ingresos.porcentaje_cambio >= 0 ? '+' : '' }}{{ ingresos.porcentaje_cambio }}% {{ ingresos.porcentaje_cambio >= 0 ? '↑' : '↓' }}
            </span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-header">PEDIDOS PENDIENTES</div>
          <div class="kpi-value">{{ pedidosPendientes }}</div>
          <div class="kpi-footer">
            <span class="kpi-period">Acción Requerida</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-header">NUEVOS CLIENTES</div>
          <div class="kpi-value">{{ nuevosClientes }}</div>
          <div class="kpi-footer">
            <span class="kpi-period">Este mes</span>
          </div>
        </div>
      </div>

      <!-- Sales Chart and Top Products -->
      <div class="chart-section">
        <div class="chart-container">
          <h2>Gráfico de Ventas Mensuales</h2>
          <canvas ref="salesChart"></canvas>
        </div>

        <div class="top-products">
          <h2>Productos Más Vendidos (Top 5)</h2>
          <ul class="product-list">
            <li v-for="(producto, index) in productosVendidos" :key="index" class="product-item">
              <span class="product-number">{{ index + 1 }}.</span>
              <span class="product-name">{{ producto.producto }}</span>
              <span class="product-quantity">{{ producto.cantidad }}</span>
            </li>
          </ul>
        </div>
      </div>

      <!-- Activity and Alerts -->
      <div class="bottom-section">
        <div class="activity-container">
          <h2>Actividad Reciente</h2>
          <div class="activity-list">
            <div v-for="actividad in actividadReciente" :key="actividad.pedido_id" class="activity-item">
              <div class="activity-time">{{ actividad.tiempo }}</div>
              <div class="activity-description">
                Nuevo pedido #{{ actividad.pedido_id }} de {{ actividad.cliente }}.
                <span v-if="actividad.productos">Producto: "{{ actividad.productos }}"</span>
              </div>
            </div>
          </div>
        </div>

        <div class="alerts-container">
          <h2>Alertas del Sistema</h2>
          <div class="alerts-list">
            <div v-for="(alerta, index) in alertas" :key="index" :class="['alert-item', `priority-${alerta.prioridad}`]">
              {{ alerta.mensaje }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import HeaderComponent from '@/components/HeaderComponent.vue';
import axios from 'axios';

export default {
  name: 'DashboardView',
  components: {
    HeaderComponent
  },
  data() {
    return {
      ingresos: {
        total: 0,
        porcentaje_cambio: 0
      },
      pedidosPendientes: 0,
      nuevosClientes: 0,
      ventasMensuales: [],
      productosVendidos: [],
      actividadReciente: [],
      alertas: [],
      chart: null
    };
  },
  created() {
    // Verificar autenticación al cargar el componente
    const token = localStorage.getItem('jwtToken');
    if (!token) {
      // Si no hay token, redirigir al login
      this.$router.push('/');
    }
  },
  mounted() {
    this.loadDashboardData();
  },
  methods: {
    async loadDashboardData() {
      const token = localStorage.getItem('jwtToken');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };

      try {
        // Build API base URL from env variable when provided (Vite exposes VITE_ prefixed vars via import.meta.env)
        // If VITE_API_URL is not set, fall back to relative path so requests go to the same origin (recommended for production behind proxy)
        const API_BASE = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/$/, '') : '';

        // Load all dashboard data
        const [ingresosRes, pedidosRes, clientesRes, ventasRes, productosRes, actividadRes, alertasRes] = await Promise.all([
          axios.get(`${API_BASE}/api/dashboard/ingresos`, config),
          axios.get(`${API_BASE}/api/dashboard/pedidos-pendientes`, config),
          axios.get(`${API_BASE}/api/dashboard/nuevos-clientes`, config),
          axios.get(`${API_BASE}/api/dashboard/ventas-mensuales`, config),
          axios.get(`${API_BASE}/api/dashboard/productos-mas-vendidos`, config),
          axios.get(`${API_BASE}/api/dashboard/actividad-reciente`, config),
          axios.get(`${API_BASE}/api/dashboard/alertas`, config)
        ]);

        this.ingresos = ingresosRes.data.data;
        this.pedidosPendientes = pedidosRes.data.data.total;
        this.nuevosClientes = clientesRes.data.data.total;
        this.ventasMensuales = ventasRes.data.data;
        this.productosVendidos = productosRes.data.data;
        this.actividadReciente = actividadRes.data.data;
        this.alertas = alertasRes.data.data;

        this.$nextTick(() => {
          this.renderChart();
        });
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      }
    },
    renderChart() {
      const canvas = this.$refs.salesChart;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      const width = canvas.parentElement.clientWidth;
      const height = 300;
      canvas.width = width;
      canvas.height = height;

      const padding = 50;
      const chartWidth = width - padding * 2;
      const chartHeight = height - padding * 2;

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Find max value
      const maxValue = Math.max(
        ...this.ventasMensuales.map(d => Math.max(d.linea_nacional, d.linea_importadora)),
        1
      );

      const dataPoints = this.ventasMensuales.length;
      if (dataPoints === 0) return;
      
      const xStep = chartWidth / (dataPoints - 1 || 1);

      // Draw axes
      ctx.strokeStyle = '#ccc';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padding, padding);
      ctx.lineTo(padding, height - padding);
      ctx.lineTo(width - padding, height - padding);
      ctx.stroke();

      // Fill area for Linea Nacional (blue)
      ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
      ctx.beginPath();
      ctx.moveTo(padding, height - padding);
      this.ventasMensuales.forEach((data, index) => {
        const x = padding + index * xStep;
        const y = height - padding - (data.linea_nacional / maxValue) * chartHeight;
        ctx.lineTo(x, y);
      });
      ctx.lineTo(padding + (dataPoints - 1) * xStep, height - padding);
      ctx.closePath();
      ctx.fill();

      // Draw Linea Nacional line (blue)
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 3;
      ctx.beginPath();
      this.ventasMensuales.forEach((data, index) => {
        const x = padding + index * xStep;
        const y = height - padding - (data.linea_nacional / maxValue) * chartHeight;
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();

      // Fill area for Linea Importadora (green)
      ctx.fillStyle = 'rgba(16, 185, 129, 0.1)';
      ctx.beginPath();
      ctx.moveTo(padding, height - padding);
      this.ventasMensuales.forEach((data, index) => {
        const x = padding + index * xStep;
        const y = height - padding - (data.linea_importadora / maxValue) * chartHeight;
        ctx.lineTo(x, y);
      });
      ctx.lineTo(padding + (dataPoints - 1) * xStep, height - padding);
      ctx.closePath();
      ctx.fill();

      // Draw Linea Importadora line (green)
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 3;
      ctx.beginPath();
      this.ventasMensuales.forEach((data, index) => {
        const x = padding + index * xStep;
        const y = height - padding - (data.linea_importadora / maxValue) * chartHeight;
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();

      // Draw points
      this.ventasMensuales.forEach((data, index) => {
        const x = padding + index * xStep;
        const yNacional = height - padding - (data.linea_nacional / maxValue) * chartHeight;
        const yImportadora = height - padding - (data.linea_importadora / maxValue) * chartHeight;
        
        // Nacional points
        ctx.fillStyle = '#3b82f6';
        ctx.beginPath();
        ctx.arc(x, yNacional, 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Importadora points
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(x, yImportadora, 4, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw labels
      ctx.fillStyle = '#666';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      this.ventasMensuales.forEach((data, index) => {
        const x = padding + index * xStep;
        ctx.fillText(data.mes, x, height - padding + 20);
      });

      // Draw legend
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(width - 200, 20, 15, 15);
      ctx.fillStyle = '#333';
      ctx.textAlign = 'left';
      ctx.fillText('Línea Nacional', width - 180, 32);

      ctx.fillStyle = '#10b981';
      ctx.fillRect(width - 200, 40, 15, 15);
      ctx.fillStyle = '#333';
      ctx.fillText('Línea Importadora', width - 180, 52);
    },
    formatCurrency(value) {
      return value.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
  }
};
</script>

<style scoped>
@import '@/styles/dashStyle.css';

.dashboard-container {
  padding-top: 100px;
  max-width: 1400px;
  margin: 0 auto;
  padding-left: 20px;
  padding-right: 20px;
}

h1 {
  color: #333;
  margin-bottom: 30px;
  text-align: center;
  font-size: 32px;
}

h2 {
  color: #333;
  margin-bottom: 15px;
  font-size: 18px;
  font-weight: 600;
}

/* KPI Cards */
.kpi-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.kpi-card {
  background: white;
  padding: 25px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.kpi-header {
  color: #666;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.5px;
  margin-bottom: 10px;
}

.kpi-value {
  color: #333;
  font-size: 36px;
  font-weight: bold;
  margin-bottom: 10px;
}

.kpi-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.kpi-period {
  color: #999;
  font-size: 14px;
}

.kpi-change {
  font-size: 14px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 4px;
}

.kpi-change.positive {
  color: #10b981;
  background: #d1fae5;
}

.kpi-change.negative {
  color: #ef4444;
  background: #fee2e2;
}

/* Chart Section */
.chart-section {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
  margin-bottom: 30px;
}

.chart-container {
  background: white;
  padding: 25px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

canvas {
  width: 100%;
  max-width: 100%;
}

.top-products {
  background: white;
  padding: 25px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.product-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.product-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.product-item:last-child {
  border-bottom: none;
}

.product-number {
  font-weight: 600;
  color: #666;
  margin-right: 10px;
}

.product-name {
  flex: 1;
  color: #333;
}

.product-quantity {
  font-weight: 600;
  color: #3b82f6;
}

/* Bottom Section */
.bottom-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.activity-container,
.alerts-container {
  background: white;
  padding: 25px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.activity-list {
  max-height: 300px;
  overflow-y: auto;
}

.activity-item {
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.activity-item:last-child {
  border-bottom: none;
}

.activity-time {
  color: #999;
  font-size: 12px;
  margin-bottom: 5px;
}

.activity-description {
  color: #333;
  font-size: 14px;
  line-height: 1.5;
}

.alerts-list {
  max-height: 300px;
  overflow-y: auto;
}

.alert-item {
  padding: 12px;
  margin-bottom: 10px;
  border-radius: 6px;
  font-size: 14px;
  border-left: 4px solid;
}

.alert-item.priority-alta {
  background: #fee2e2;
  border-color: #ef4444;
  color: #991b1b;
}

.alert-item.priority-media {
  background: #fef3c7;
  border-color: #f59e0b;
  color: #92400e;
}

.alert-item.priority-baja {
  background: #e0e7ff;
  border-color: #6366f1;
  color: #3730a3;
}

@media (max-width: 1024px) {
  .chart-section {
    grid-template-columns: 1fr;
  }

  .bottom-section {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .kpi-container {
    grid-template-columns: 1fr;
  }
}
</style>