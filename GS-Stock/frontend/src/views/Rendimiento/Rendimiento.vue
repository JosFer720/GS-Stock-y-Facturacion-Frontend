<template>
  <div class="rendimiento-view">
    <HeaderComponent />
    <main class="main-content">
      <div class="content-section">
        <h1 class="page-title">Dashboard de Rendimiento</h1>
        <p class="page-subtitle">Análisis de ventas y productos más vendidos</p>
        
        <!-- Filters Section -->
        <div class="filters-section">
          <h3 class="section-title">Filtros de Análisis</h3>
          <div class="filters-grid">
            <div class="filter-group">
              <label for="year-select">Año:</label>
              <select 
                id="year-select"
                v-model="selectedYear" 
                @change="handleFilterChange"
                class="filter-select"
              >
                <option v-for="year in availableYears" :key="year" :value="year">
                  {{ year }}
                </option>
              </select>
            </div>

            <div class="filter-group">
              <label for="month-select">Mes:</label>
              <select 
                id="month-select"
                v-model="selectedMonth" 
                @change="handleFilterChange"
                class="filter-select"
              >
                <option v-for="month in availableMonths" :key="month.value" :value="month.value">
                  {{ month.label }}
                </option>
              </select>
            </div>

            <div class="filter-group">
              <label for="period-select">Período:</label>
              <select 
                id="period-select"
                v-model="selectedPeriod" 
                @change="handleFilterChange"
                class="filter-select"
              >
                <option value="month">Por Mes</option>
                <option value="week">Por Semana</option>
              </select>
            </div>

            <!-- Vendedor filter (only shown for vendedor chart) -->
            <div class="filter-group" v-if="activeChart === 'vendedor'">
              <label for="vendedor-select">Vendedor:</label>
              <select 
                id="vendedor-select"
                v-model="selectedVendedor" 
                @change="handleFilterChange"
                class="filter-select"
              >
                <option value="">Todos los vendedores</option>
                <option v-for="vendedor in vendedoresList" :key="vendedor.vendedor_id" :value="vendedor.vendedor_id">
                  {{ vendedor.vendedor_nombre }}
                </option>
              </select>
            </div>

            <div class="filter-group">
              <label for="limit-select" v-if="activeChart === 'products'">Top productos:</label>
              <select 
                id="limit-select"
                v-model="selectedLimit" 
                @change="handleFilterChange"
                class="filter-select"
                v-if="activeChart === 'products'"
              >
                <option value="5">Top 5</option>
                <option value="10">Top 10</option>
                <option value="15">Top 15</option>
                <option value="20">Top 20</option>
              </select>
            </div>

            <div class="filter-group">
              <button 
                @click="handleFilterChange"
                :disabled="loading"
                class="refresh-btn"
              >
                <span v-if="loading" class="loading-spinner"></span>
                {{ loading ? 'Cargando...' : 'Actualizar' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Error message -->
        <div v-if="error" class="error-message">
          {{ error }}
          <button @click="clearError" class="error-dismiss">×</button>
        </div>

        <!-- Loading state -->
        <div v-if="loading" class="loading-container">
          <div class="loading-indicator">Cargando datos del dashboard...</div>
        </div>

        <!-- Main Dashboard Content -->
        <div v-else-if="!error" class="dashboard-content">
          <!-- Summary Statistics -->
          <div v-if="summaryData" class="summary-section">
            <h3 class="section-title">Resumen General</h3>
            <div class="summary-grid">
              <div class="summary-card">
                <div class="summary-header">
                  <h4>Total de Ventas</h4>
                </div>
                <div class="summary-content">
                  <p class="summary-value">Q{{ formatNumber(summaryData.total_ventas || 0) }}</p>
                  <p class="summary-detail">{{ summaryData.total_pedidos || 0 }} pedidos</p>
                </div>
              </div>

              <div class="summary-card nacional">
                <div class="summary-header">
                  <h4>Línea Nacional</h4>
                </div>
                <div class="summary-content">
                  <p class="summary-value">Q{{ formatNumber(summaryData.ventas_nacional || 0) }}</p>
                  <p class="summary-detail">{{ summaryData.pedidos_nacional || 0 }} pedidos</p>
                </div>
              </div>

              <div class="summary-card importadora">
                <div class="summary-header">
                  <h4>Línea Importadora</h4>
                </div>
                <div class="summary-content">
                  <p class="summary-value">Q{{ formatNumber(summaryData.ventas_importadora || 0) }}</p>
                  <p class="summary-detail">{{ summaryData.pedidos_importadora || 0 }} pedidos</p>
                </div>
              </div>

              <div class="summary-card best-product" v-if="bestSellingData.length > 0">
                <div class="summary-header">
                  <h4>Producto #1</h4>
                </div>
                <div class="summary-content">
                  <p class="summary-value">{{ bestSellingData[0].nombre_zapato }}</p>
                  <p class="summary-detail">{{ bestSellingData[0].total_vendido }} vendidos</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Chart Navigation -->
          <div class="chart-navigation">
            <h3 class="section-title">Análisis Gráfico</h3>
            <div class="nav-buttons">
              <button 
                @click="switchChart('comparison')"
                :class="['nav-btn', { active: activeChart === 'comparison' }]"
              >
                Comparación de Líneas
              </button>
              <button 
                @click="switchChart('products')"
                :class="['nav-btn', { active: activeChart === 'products' }]"
              >
                Productos Más Vendidos
              </button>
              <button 
                @click="switchChart('vendedor')"
                :class="['nav-btn', { active: activeChart === 'vendedor' }]"
              >
                Rendimiento Vendedores
              </button>
              <button 
                @click="switchChart('ventas')"
                :class="['nav-btn', { active: activeChart === 'ventas' }]"
              >
                Análisis de Ventas
              </button>
            </div>
          </div>

          <!-- Chart Container -->
          <div class="chart-container">
            <!-- Line Chart for Product Lines Comparison -->
            <div v-if="activeChart === 'comparison'" class="chart-card">
              <div class="chart-header">
                <h4 class="chart-title">Comparación de Ventas por Línea de Producto</h4>
                <p class="chart-subtitle">Tendencia mensual de ventas entre Línea Nacional e Importadora</p>
              </div>
              <div class="chart-wrapper">
                <canvas id="lineChart" width="400" height="200"></canvas>
              </div>
              <div v-if="!productLinesData.length" class="empty-state">
                <p>No hay datos disponibles para la comparación de líneas</p>
              </div>
            </div>

            <!-- Bar Chart for Best Selling Products -->
            <div v-if="activeChart === 'products'" class="chart-card">
              <div class="chart-header">
                <h4 class="chart-title">Productos Más Vendidos</h4>
                <p class="chart-subtitle">Top {{ selectedLimit }} productos por cantidad vendida</p>
              </div>
              <div class="chart-wrapper">
                <canvas id="barChart" width="400" height="200"></canvas>
              </div>
              <div v-if="!bestSellingData.length" class="empty-state">
                <p>No hay datos disponibles para productos más vendidos</p>
              </div>
            </div>

            <!-- Vendedor Performance Chart -->
            <div v-if="activeChart === 'vendedor'" class="chart-card">
              <div class="chart-header">
                <h4 class="chart-title">Rendimiento de Vendedores</h4>
                <p class="chart-subtitle">
                  {{ selectedVendedor ? `Vendedor: ${getVendedorName(selectedVendedor)}` : 'Todos los vendedores' }} 
                  - {{ selectedPeriod === 'week' ? 'Por semana' : 'Por mes' }}
                </p>
              </div>
              <div class="chart-wrapper">
                <canvas id="vendedorChart" width="400" height="200"></canvas>
              </div>
              <div v-if="!vendedorData.length" class="empty-state">
                <p>No hay datos disponibles para el rendimiento de vendedores</p>
              </div>
            </div>

            <!-- Sales Performance Chart -->
            <div v-if="activeChart === 'ventas'" class="chart-card">
              <div class="chart-header">
                <h4 class="chart-title">Análisis de Ventas Generales</h4>
                <p class="chart-subtitle">
                  Ventas {{ selectedPeriod === 'week' ? 'semanales' : 'mensuales' }} - {{ selectedYear }}
                </p>
              </div>
              <div class="chart-wrapper">
                <canvas id="ventasChart" width="400" height="200"></canvas>
              </div>
              <div v-if="!ventasData.length" class="empty-state">
                <p>No hay datos disponibles para el análisis de ventas</p>
              </div>
            </div>
          </div>

          <!-- Data Tables Section -->
          <div class="data-section">
            <h3 class="section-title">Datos Detallados</h3>
            <div class="tabs-navigation">
              <button 
                class="tab-button"
                :class="{ active: activeDataTab === 'lines' }"
                @click="activeDataTab = 'lines'"
                v-if="activeChart === 'comparison'"
              >
                Datos por Línea
              </button>
              <button 
                class="tab-button"
                :class="{ active: activeDataTab === 'products' }"
                @click="activeDataTab = 'products'"
                v-if="activeChart === 'products'"
              >
                Datos de Productos
              </button>
              <button 
                class="tab-button"
                :class="{ active: activeDataTab === 'vendedor' }"
                @click="activeDataTab = 'vendedor'"
                v-if="activeChart === 'vendedor'"
              >
                Datos de Vendedores
              </button>
              <button 
                class="tab-button"
                :class="{ active: activeDataTab === 'ventas' }"
                @click="activeDataTab = 'ventas'"
                v-if="activeChart === 'ventas'"
              >
                Datos de Ventas
              </button>
            </div>

            <div class="data-content">
              <!-- Product Lines Data Table -->
              <div v-show="activeDataTab === 'lines'" class="data-card">
                <div v-if="productLinesData.length > 0" class="table-container">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>Línea</th>
                        <th>Período</th>
                        <th>Pedidos</th>
                        <th>Ventas</th>
                        <th>Promedio</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="item in productLinesData" :key="`${item.tipo_linea_producto}-${item.año}-${item.mes}`">
                        <td>
                          <span :class="['line-badge', item.tipo_linea_producto === 'Linea Nacional' ? 'nacional' : 'importadora']">
                            {{ item.tipo_linea_producto }}
                          </span>
                        </td>
                        <td>{{ item.mes }}/{{ item.año }}</td>
                        <td>{{ item.total_pedidos }}</td>
                        <td>Q{{ formatNumber(item.venta_total) }}</td>
                        <td>Q{{ formatNumber(item.promedio_venta) }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div v-else class="empty-state">
                  <p>No hay datos de líneas de producto disponibles</p>
                </div>
              </div>

              <!-- Best Selling Products Data Table -->
              <div v-show="activeDataTab === 'products'" class="data-card">
                <div v-if="bestSellingData.length > 0" class="table-container">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Producto</th>
                        <th>Código</th>
                        <th>Vendidos</th>
                        <th>Ingresos</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(item, index) in bestSellingData" :key="item.id_zapato">
                        <td>
                          <span class="rank-badge" :class="getRankClass(index)">{{ index + 1 }}</span>
                        </td>
                        <td>{{ item.nombre_zapato }}</td>
                        <td><code>{{ item.codigo_zapato }}</code></td>
                        <td>{{ item.total_vendido }}</td>
                        <td>Q{{ formatNumber(item.ingresos_totales) }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div v-else class="empty-state">
                  <p>No hay datos de productos más vendidos disponibles</p>
                </div>
              </div>

              <!-- Vendedor Performance Data Table -->
              <div v-show="activeDataTab === 'vendedor'" class="data-card">
                <div v-if="vendedorData.length > 0" class="table-container">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>Vendedor</th>
                        <th>Período</th>
                        <th>Pedidos</th>
                        <th>Ventas</th>
                        <th>Promedio</th>
                        <th>Clientes</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="item in vendedorData" :key="`${item.vendedor_id}-${item.periodo_key}`">
                        <td>
                          <span class="vendedor-badge">{{ item.vendedor_nombre }}</span>
                        </td>
                        <td>{{ item.periodo_display }}</td>
                        <td>{{ item.total_pedidos }}</td>
                        <td>Q{{ formatNumber(item.ventas_totales) }}</td>
                        <td>Q{{ formatNumber(item.promedio_venta) }}</td>
                        <td>{{ item.clientes_unicos }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div v-else class="empty-state">
                  <p>No hay datos de vendedores disponibles</p>
                </div>
              </div>

              <!-- Sales Performance Data Table -->
              <div v-show="activeDataTab === 'ventas'" class="data-card">
                <div v-if="ventasData.length > 0" class="table-container">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>Período</th>
                        <th>Pedidos</th>
                        <th>Ventas</th>
                        <th>Nacional</th>
                        <th>Importadora</th>
                        <th>Vendedores</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="item in ventasData" :key="item.periodo_key">
                        <td>{{ item.periodo_display }}</td>
                        <td>{{ item.total_pedidos }}</td>
                        <td>Q{{ formatNumber(item.ventas_totales) }}</td>
                        <td>Q{{ formatNumber(item.ventas_nacional) }}</td>
                        <td>Q{{ formatNumber(item.ventas_importadora) }}</td>
                        <td>{{ item.vendedores_activos }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div v-else class="empty-state">
                  <p>No hay datos de ventas disponibles</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Empty State (when no data at all) -->
          <div v-if="!productLinesData.length && !bestSellingData.length && !vendedorData.length && !ventasData.length && !loading" class="empty-state global">
            <h3>No hay datos disponibles</h3>
            <p>No se encontraron datos para los filtros seleccionados. Intenta con diferentes parámetros.</p>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import HeaderComponent from '../../components/HeaderComponent.vue'
import axios from 'axios'

export default {
  name: 'RendimientoView',
  components: {
    HeaderComponent
  },
  setup() {
    // Reactive data
    const productLinesData = ref([])
    const bestSellingData = ref([])
    const summaryData = ref(null)
    const vendedorData = ref([])
    const ventasData = ref([])
    const vendedoresList = ref([])
    const loading = ref(false)
    const error = ref(null)
    
    // UI state
    const activeChart = ref('comparison')
    const activeDataTab = ref('lines')
    
    // Filter options
    const selectedYear = ref(new Date().getFullYear())
    const selectedMonth = ref('')
    const selectedLimit = ref(10)
    const selectedPeriod = ref('month')
    const selectedVendedor = ref('')
    
    // Chart references
    const lineChart = ref(null)
    const barChart = ref(null)
    const vendedorChart = ref(null)
    const ventasChart = ref(null)
    
    // Available years for filter
    const availableYears = computed(() => {
      const currentYear = new Date().getFullYear()
      const years = []
      for (let i = currentYear; i >= currentYear - 5; i--) {
        years.push(i)
      }
      return years
    })
    
    // Available months
    const availableMonths = [
      { value: '', label: 'Todos los meses' },
      { value: 1, label: 'Enero' },
      { value: 2, label: 'Febrero' },
      { value: 3, label: 'Marzo' },
      { value: 4, label: 'Abril' },
      { value: 5, label: 'Mayo' },
      { value: 6, label: 'Junio' },
      { value: 7, label: 'Julio' },
      { value: 8, label: 'Agosto' },
      { value: 9, label: 'Septiembre' },
      { value: 10, label: 'Octubre' },
      { value: 11, label: 'Noviembre' },
      { value: 12, label: 'Diciembre' }
    ]

    // API Base URL
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

    // Utility function to format numbers
    const formatNumber = (num) => {
      if (!num) return '0.00'
      return parseFloat(num).toLocaleString('es-GT', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    }

    // Get rank class for styling
    const getRankClass = (index) => {
      if (index === 0) return 'gold'
      if (index === 1) return 'silver'
      if (index === 2) return 'bronze'
      return 'default'
    }

    // Get vendedor name by ID
    const getVendedorName = (vendedorId) => {
      const vendedor = vendedoresList.value.find(v => v.vendedor_id == vendedorId)
      return vendedor ? vendedor.vendedor_nombre : 'Desconocido'
    }

    // Clear error
    const clearError = () => {
      error.value = null
    }

    // Switch chart function
    const switchChart = (chartType) => {
      // Destroy current chart before switching
      destroyCharts()
      
      activeChart.value = chartType
      activeDataTab.value = chartType === 'comparison' ? 'lines' : chartType
      
      // Load data for the new chart and create it
      loadData()
    }

    // Fetch dashboard summary
    const fetchSummaryData = async () => {
      try {
        const token = localStorage.getItem('jwtToken')
        const params = { year: selectedYear.value }
        
        const response = await axios.get(`${API_BASE_URL}/graphics/dashboard/summary`, {
          headers: { Authorization: `Bearer ${token}` },
          params
        })
        
        if (response.data.success) {
          summaryData.value = response.data.data
        }
      } catch (err) {
        console.error('Error fetching summary data:', err)
      }
    }

    // Fetch product lines comparison data
    const fetchProductLinesData = async () => {
      try {
        const token = localStorage.getItem('jwtToken')
        const params = {
          year: selectedYear.value,
          ...(selectedMonth.value && { month: selectedMonth.value })
        }
        
        const response = await axios.get(`${API_BASE_URL}/graphics/comparison/product-lines`, {
          headers: { Authorization: `Bearer ${token}` },
          params
        })
        
        if (response.data.success) {
          productLinesData.value = response.data.data
        }
      } catch (err) {
        console.error('Error fetching product lines data:', err)
        error.value = 'Error al cargar datos de líneas de producto'
      }
    }

    // Fetch best selling products data
    const fetchBestSellingData = async () => {
      try {
        const token = localStorage.getItem('jwtToken')
        const params = {
          limit: selectedLimit.value,
          year: selectedYear.value,
          ...(selectedMonth.value && { month: selectedMonth.value })
        }
        
        const response = await axios.get(`${API_BASE_URL}/graphics/analytics/best-selling-products`, {
          headers: { Authorization: `Bearer ${token}` },
          params
        })
        
        if (response.data.success) {
          bestSellingData.value = response.data.data
        }
      } catch (err) {
        console.error('Error fetching best selling data:', err)
        error.value = 'Error al cargar datos de productos más vendidos'
      }
    }

    // Fetch vendedor performance data
    const fetchVendedorData = async () => {
      try {
        const token = localStorage.getItem('jwtToken')
        const params = {
          period: selectedPeriod.value,
          year: selectedYear.value,
          ...(selectedMonth.value && { month: selectedMonth.value }),
          ...(selectedVendedor.value && { vendedor_id: selectedVendedor.value })
        }
        
        const response = await axios.get(`${API_BASE_URL}/graphics/analytics/vendedor-performance`, {
          headers: { Authorization: `Bearer ${token}` },
          params
        })
        
        if (response.data.success) {
          vendedorData.value = response.data.data
        }
      } catch (err) {
        console.error('Error fetching vendedor data:', err)
        error.value = 'Error al cargar datos de vendedores'
      }
    }

    // Fetch sales performance data
    const fetchVentasData = async () => {
      try {
        const token = localStorage.getItem('jwtToken')
        const params = {
          period: selectedPeriod.value,
          year: selectedYear.value,
          ...(selectedMonth.value && { month: selectedMonth.value })
        }
        
        const response = await axios.get(`${API_BASE_URL}/graphics/analytics/sales-performance`, {
          headers: { Authorization: `Bearer ${token}` },
          params
        })
        
        if (response.data.success) {
          ventasData.value = response.data.data
        }
      } catch (err) {
        console.error('Error fetching ventas data:', err)
        error.value = 'Error al cargar datos de ventas'
      }
    }

    // Fetch vendedores list
    const fetchVendedoresList = async () => {
      try {
        const token = localStorage.getItem('jwtToken')
        
        const response = await axios.get(`${API_BASE_URL}/graphics/analytics/vendedores-list`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        
        if (response.data.success) {
          vendedoresList.value = response.data.data
        }
      } catch (err) {
        console.error('Error fetching vendedores list:', err)
      }
    }

    // Load all data based on active chart
    const loadData = async () => {
      loading.value = true
      error.value = null
      
      try {
        // Always fetch summary data
        await fetchSummaryData()
        
        // Fetch specific data based on active chart
        switch (activeChart.value) {
          case 'comparison':
            await fetchProductLinesData()
            break
          case 'products':
            await fetchBestSellingData()
            break
          case 'vendedor':
            await Promise.all([fetchVendedorData(), fetchVendedoresList()])
            break
          case 'ventas':
            await fetchVentasData()
            break
          default:
            await Promise.all([
              fetchProductLinesData(),
              fetchBestSellingData()
            ])
        }
        
        // After data is loaded, create active chart
        await nextTick()
        setTimeout(() => {
          createActiveChart()
        }, 100)
      } catch (err) {
        error.value = 'Error al cargar los datos'
      } finally {
        loading.value = false
      }
    }

    // Create only the active chart
    const createActiveChart = () => {
      // Wait for DOM to be ready
      nextTick(() => {
        setTimeout(() => {
          switch (activeChart.value) {
            case 'comparison':
              createLineChart()
              break
            case 'products':
              createBarChart()
              break
            case 'vendedor':
              createVendedorChart()
              break
            case 'ventas':
              createVentasChart()
              break
          }
        }, 200) // Increased timeout to ensure DOM is ready
      })
    }

    // Destroy all charts
    const destroyCharts = () => {
      if (lineChart.value) {
        lineChart.value.destroy()
        lineChart.value = null
      }
      if (barChart.value) {
        barChart.value.destroy()
        barChart.value = null
      }
      if (vendedorChart.value) {
        vendedorChart.value.destroy()
        vendedorChart.value = null
      }
      if (ventasChart.value) {
        ventasChart.value.destroy()
        ventasChart.value = null
      }
    }

    // Create line chart for product lines comparison
    const createLineChart = () => {
      if (!productLinesData.value.length || activeChart.value !== 'comparison') return

      const ctx = document.getElementById('lineChart')
      if (!ctx) {
        console.warn('Line chart canvas not found')
        return
      }

      // Destroy existing chart
      if (lineChart.value) {
        lineChart.value.destroy()
        lineChart.value = null
      }

      try {
        // Process data for chart
        const groupedData = {}
        productLinesData.value.forEach(item => {
          const key = `${item.año}-${String(item.mes).padStart(2, '0')}`
          if (!groupedData[key]) {
            groupedData[key] = {}
          }
          groupedData[key][item.tipo_linea_producto] = parseFloat(item.venta_total)
        })

        const labels = Object.keys(groupedData).sort()
        const nacionalData = labels.map(label => groupedData[label]['Linea Nacional'] || 0)
        const importadoraData = labels.map(label => groupedData[label]['Linea Importadora'] || 0)

        lineChart.value = new Chart(ctx, {
          type: 'line',
          data: {
            labels: labels.map(label => {
              const [year, month] = label.split('-')
              return `${month}/${year}`
            }),
            datasets: [
              {
                label: 'Línea Nacional',
                data: nacionalData,
                borderColor: '#2196F3',
                backgroundColor: 'rgba(33, 150, 243, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#2196F3',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 6,
                pointHoverRadius: 8
              },
              {
                label: 'Línea Importadora',
                data: importadoraData,
                borderColor: '#4CAF50',
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#4CAF50',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 6,
                pointHoverRadius: 8
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'top',
                labels: {
                  usePointStyle: true,
                  padding: 20,
                  font: { size: 14 }
                }
              },
              tooltip: {
                mode: 'index',
                intersect: false,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleColor: '#ffffff',
                bodyColor: '#ffffff',
                borderColor: '#374151',
                borderWidth: 1,
                cornerRadius: 8,
                displayColors: true
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                grid: { color: 'rgba(229, 231, 235, 0.8)' },
                ticks: {
                  callback: function(value) {
                    return 'Q' + value.toLocaleString()
                  },
                  font: { size: 12 }
                }
              },
              x: {
                grid: { color: 'rgba(229, 231, 235, 0.8)' },
                ticks: { font: { size: 12 } }
              }
            },
            interaction: {
              intersect: false,
              mode: 'index'
            }
          }
        })
      } catch (error) {
        console.error('Error creating line chart:', error)
      }
    }

    // Create bar chart for best selling products
    const createBarChart = () => {
      if (!bestSellingData.value.length || activeChart.value !== 'products') return

      const ctx = document.getElementById('barChart')
      if (!ctx) {
        console.warn('Bar chart canvas not found')
        return
      }

      // Destroy existing chart
      if (barChart.value) {
        barChart.value.destroy()
        barChart.value = null
      }

      try {
        const labels = bestSellingData.value.map(item => 
          item.nombre_zapato.length > 15 ? 
          item.nombre_zapato.substring(0, 15) + '...' : 
          item.nombre_zapato
        )
        const data = bestSellingData.value.map(item => parseInt(item.total_vendido))
        const backgroundColors = bestSellingData.value.map((_, index) => {
          const colors = [
            '#FFD700', '#C0C0C0', '#CD7F32', '#2196F3', '#4CAF50', 
            '#FF9800', '#9C27B0', '#E91E63', '#00BCD4', '#795548'
          ]
          return colors[index % colors.length]
        })

        barChart.value = new Chart(ctx, {
          type: 'bar',
          data: {
            labels,
            datasets: [{
              label: 'Cantidad Vendida',
              data,
              backgroundColor: backgroundColors,
              borderColor: backgroundColors.map(color => color),
              borderWidth: 2,
              borderRadius: {
                topLeft: 8,
                topRight: 8
              },
              borderSkipped: false,
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleColor: '#ffffff',
                bodyColor: '#ffffff',
                borderColor: '#374151',
                borderWidth: 1,
                cornerRadius: 8,
                callbacks: {
                  title: function(context) {
                    const index = context[0].dataIndex
                    return bestSellingData.value[index].nombre_zapato
                  },
                  afterBody: function(context) {
                    const index = context[0].dataIndex
                    const item = bestSellingData.value[index]
                    return [
                      `Código: ${item.codigo_zapato}`,
                      `Ingresos: Q${formatNumber(item.ingresos_totales)}`
                    ]
                  }
                }
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                grid: { color: 'rgba(229, 231, 235, 0.8)' },
                ticks: {
                  stepSize: 1,
                  font: { size: 12 }
                }
              },
              x: {
                grid: { display: false },
                ticks: {
                  maxRotation: 45,
                  minRotation: 45,
                  font: { size: 11 }
                }
              }
            }
          }
        })
      } catch (error) {
        console.error('Error creating bar chart:', error)
      }
    }

    // Create vendedor performance chart
    const createVendedorChart = () => {
      if (!vendedorData.value.length || activeChart.value !== 'vendedor') return

      const ctx = document.getElementById('vendedorChart')
      if (!ctx) {
        console.warn('Vendedor chart canvas not found')
        return
      }

      // Destroy existing chart
      if (vendedorChart.value) {
        vendedorChart.value.destroy()
        vendedorChart.value = null
      }

      try {
        // Group data by vendedor if showing multiple vendedores
        const groupedData = {}
        vendedorData.value.forEach(item => {
          if (!groupedData[item.vendedor_nombre]) {
            groupedData[item.vendedor_nombre] = []
          }
          groupedData[item.vendedor_nombre].push({
            periodo: item.periodo_display,
            ventas: parseFloat(item.ventas_totales),
            pedidos: parseInt(item.total_pedidos)
          })
        })

        // Get all unique periods and sort them
        const allPeriods = [...new Set(vendedorData.value.map(item => item.periodo_display))].sort()

        // Create datasets for each vendedor
        const datasets = Object.keys(groupedData).map((vendedorName, index) => {
          const colors = ['#2196F3', '#4CAF50', '#FF9800', '#9C27B0', '#E91E63', '#00BCD4', '#795548', '#607D8B']
          const color = colors[index % colors.length]
          
          const data = allPeriods.map(periodo => {
            const item = groupedData[vendedorName].find(d => d.periodo === periodo)
            return item ? item.ventas : 0
          })

          return {
            label: vendedorName,
            data: data,
            borderColor: color,
            backgroundColor: color + '20',
            borderWidth: 3,
            fill: false,
            tension: 0.4,
            pointBackgroundColor: color,
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 7
          }
        })

        vendedorChart.value = new Chart(ctx, {
          type: 'line',
          data: {
            labels: allPeriods,
            datasets: datasets
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'top',
                labels: {
                  usePointStyle: true,
                  padding: 15,
                  font: { size: 12 }
                }
              },
              tooltip: {
                mode: 'index',
                intersect: false,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleColor: '#ffffff',
                bodyColor: '#ffffff',
                borderColor: '#374151',
                borderWidth: 1,
                cornerRadius: 8,
                callbacks: {
                  afterBody: function(context) {
                    const dataIndex = context[0].dataIndex
                    const vendedorName = context[0].dataset.label
                    const periodData = vendedorData.value.find(item => 
                      item.vendedor_nombre === vendedorName && 
                      item.periodo_display === allPeriods[dataIndex]
                    )
                    
                    if (periodData) {
                      return [
                        `Pedidos: ${periodData.total_pedidos}`,
                        `Clientes: ${periodData.clientes_unicos}`,
                        `Promedio: Q${formatNumber(periodData.promedio_venta)}`
                      ]
                    }
                    return []
                  }
                }
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                grid: { color: 'rgba(229, 231, 235, 0.8)' },
                ticks: {
                  callback: function(value) {
                    return 'Q' + value.toLocaleString()
                  },
                  font: { size: 11 }
                }
              },
              x: {
                grid: { color: 'rgba(229, 231, 235, 0.8)' },
                ticks: { 
                  font: { size: 11 },
                  maxRotation: 45
                }
              }
            },
            interaction: {
              intersect: false,
              mode: 'index'
            }
          }
        })
      } catch (error) {
        console.error('Error creating vendedor chart:', error)
      }
    }

    // Create sales performance chart
    const createVentasChart = () => {
      if (!ventasData.value.length || activeChart.value !== 'ventas') return

      const ctx = document.getElementById('ventasChart')
      if (!ctx) {
        console.warn('Ventas chart canvas not found')
        return
      }

      // Destroy existing chart
      if (ventasChart.value) {
        ventasChart.value.destroy()
        ventasChart.value = null
      }

      try {
        const labels = ventasData.value.map(item => item.periodo_display)
        const ventasTotales = ventasData.value.map(item => parseFloat(item.ventas_totales))
        const ventasNacional = ventasData.value.map(item => parseFloat(item.ventas_nacional))
        const ventasImportadora = ventasData.value.map(item => parseFloat(item.ventas_importadora))
        const totalPedidos = ventasData.value.map(item => parseInt(item.total_pedidos))

        ventasChart.value = new Chart(ctx, {
          type: 'line',
          data: {
            labels: labels,
            datasets: [
              {
                label: 'Ventas Totales',
                data: ventasTotales,
                borderColor: '#333333',
                backgroundColor: 'rgba(51, 51, 51, 0.1)',
                borderWidth: 4,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#333333',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 6,
                pointHoverRadius: 8,
                yAxisID: 'y'
              },
              {
                label: 'Línea Nacional',
                data: ventasNacional,
                borderColor: '#2196F3',
                backgroundColor: 'rgba(33, 150, 243, 0.1)',
                borderWidth: 3,
                fill: false,
                tension: 0.4,
                pointBackgroundColor: '#2196F3',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7,
                yAxisID: 'y'
              },
              {
                label: 'Línea Importadora',
                data: ventasImportadora,
                borderColor: '#4CAF50',
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                borderWidth: 3,
                fill: false,
                tension: 0.4,
                pointBackgroundColor: '#4CAF50',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7,
                yAxisID: 'y'
              },
              {
                label: 'Total Pedidos',
                data: totalPedidos,
                type: 'bar',
                backgroundColor: 'rgba(255, 152, 0, 0.3)',
                borderColor: '#FF9800',
                borderWidth: 1,
                yAxisID: 'y1'
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'top',
                labels: {
                  usePointStyle: true,
                  padding: 15,
                  font: { size: 12 }
                }
              },
              tooltip: {
                mode: 'index',
                intersect: false,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleColor: '#ffffff',
                bodyColor: '#ffffff',
                borderColor: '#374151',
                borderWidth: 1,
                cornerRadius: 8,
                callbacks: {
                  afterBody: function(context) {
                    const dataIndex = context[0].dataIndex
                    const item = ventasData.value[dataIndex]
                    return [
                      `Clientes únicos: ${item.clientes_unicos}`,
                      `Vendedores activos: ${item.vendedores_activos}`,
                      `Promedio por pedido: Q${formatNumber(item.promedio_pedido)}`
                    ]
                  }
                }
              }
            },
            scales: {
              y: {
                type: 'linear',
                display: true,
                position: 'left',
                beginAtZero: true,
                grid: { color: 'rgba(229, 231, 235, 0.8)' },
                ticks: {
                  callback: function(value) {
                    return 'Q' + value.toLocaleString()
                  },
                  font: { size: 11 }
                }
              },
              y1: {
                type: 'linear',
                display: true,
                position: 'right',
                beginAtZero: true,
                grid: { drawOnChartArea: false },
                ticks: {
                  callback: function(value) {
                    return value + ' pedidos'
                  },
                  font: { size: 11 }
                }
              },
              x: {
                grid: { color: 'rgba(229, 231, 235, 0.8)' },
                ticks: { 
                  font: { size: 11 },
                  maxRotation: 45
                }
              }
            },
            interaction: {
              intersect: false,
              mode: 'index'
            }
          }
        })
      } catch (error) {
        console.error('Error creating ventas chart:', error)
      }
    }

    // Handle filter changes
    const handleFilterChange = () => {
      loadData()
    }

    // Watch for chart changes to update data tab
    watch(activeChart, (newChart) => {
      switch (newChart) {
        case 'comparison':
          activeDataTab.value = 'lines'
          break
        case 'products':
          activeDataTab.value = 'products'
          break
        case 'vendedor':
          activeDataTab.value = 'vendedor'
          break
        case 'ventas':
          activeDataTab.value = 'ventas'
          break
      }
    })

    // Lifecycle
    onMounted(async () => {
      // Load Chart.js
      if (!window.Chart) {
        const script = document.createElement('script')
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js'
        script.onload = () => {
          loadData()
        }
        document.head.appendChild(script)
      } else {
        loadData()
      }
    })

    return {
      // Data
      productLinesData,
      bestSellingData,
      summaryData,
      vendedorData,
      ventasData,
      vendedoresList,
      loading,
      error,
      
      // UI State
      activeChart,
      activeDataTab,
      
      // Filters
      selectedYear,
      selectedMonth,
      selectedLimit,
      selectedPeriod,
      selectedVendedor,
      availableYears,
      availableMonths,
      
      // Methods
      loadData,
      handleFilterChange,
      formatNumber,
      getRankClass,
      getVendedorName,
      clearError,
      switchChart
    }
  }
}
</script>

<style scoped src="../../styles/Rendimiento/rendimiento.css">

</style>
