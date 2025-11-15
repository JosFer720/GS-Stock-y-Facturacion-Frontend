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
                <canvas ref="lineChartCanvas" id="lineChart" width="400" height="200"></canvas>
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
                <canvas ref="barChartCanvas" id="barChart" width="400" height="200"></canvas>
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
                <canvas ref="vendedorChartCanvas" id="vendedorChart" width="400" height="200"></canvas>
              </div>
              <div v-if="!vendedorData.length" class="empty-state">
                <p>No hay datos disponibles para rendimiento de vendedores</p>
              </div>
            </div>

            <!-- Ventas Performance Chart -->
            <div v-if="activeChart === 'ventas'" class="chart-card">
              <div class="chart-header">
                <h4 class="chart-title">Análisis de Ventas</h4>
                <p class="chart-subtitle">
                  Rendimiento general de ventas - {{ selectedPeriod === 'week' ? 'Por semana' : 'Por mes' }}
                </p>
              </div>
              <div class="chart-wrapper">
                <canvas ref="ventasChartCanvas" id="ventasChart" width="400" height="200"></canvas>
              </div>
              <div v-if="!ventasData.length" class="empty-state">
                <p>No hay datos disponibles para análisis de ventas</p>
              </div>
            </div>
          </div>

          <!-- Data Tables Section -->
          <div class="data-section">
            <div class="tabs-navigation">
              <button 
                @click="activeDataTab = 'lines'"
                :class="['tab-button', { active: activeDataTab === 'lines' }]"
              >
                Líneas de Producto
              </button>
              <button 
                @click="activeDataTab = 'products'"
                :class="['tab-button', { active: activeDataTab === 'products' }]"
              >
                Productos
              </button>
              <button 
                @click="activeDataTab = 'vendedor'"
                :class="['tab-button', { active: activeDataTab === 'vendedor' }]"
              >
                Vendedores
              </button>
              <button 
                @click="activeDataTab = 'ventas'"
                :class="['tab-button', { active: activeDataTab === 'ventas' }]"
              >
                Ventas
              </button>
            </div>

            <div class="data-content">
              <!-- Product Lines Data Table -->
              <div v-if="activeDataTab === 'lines'" class="data-card">
                <div class="table-container">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>Línea de Producto</th>
                        <th>Período</th>
                        <th>Total Pedidos</th>
                        <th>Venta Total</th>
                        <th>Promedio</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(item, index) in productLinesData" :key="index">
                        <td>
                          <span :class="['line-badge', item.tipo_linea_producto === 'Linea Nacional' ? 'nacional' : 'importadora']">
                            {{ item.tipo_linea_producto }}
                          </span>
                        </td>
                        <td>{{ item.nombre_mes }} {{ item.año }}</td>
                        <td>{{ item.total_pedidos }}</td>
                        <td>Q{{ formatNumber(item.venta_total) }}</td>
                        <td>Q{{ formatNumber(item.promedio_venta) }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div v-if="!productLinesData.length" class="empty-state">
                  <p>No hay datos disponibles</p>
                </div>
              </div>

              <!-- Best Selling Products Data Table -->
              <div v-if="activeDataTab === 'products'" class="data-card">
                <div class="table-container">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Código</th>
                        <th>Nombre</th>
                        <th>Tipo</th>
                        <th>Total Vendido</th>
                        <th>Ingresos</th>
                        <th>Precio Promedio</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(item, index) in bestSellingData" :key="index">
                        <td>
                          <span :class="['rank-badge', getRankClass(index)]">
                            {{ index + 1 }}
                          </span>
                        </td>
                        <td><code>{{ item.codigo_zapato }}</code></td>
                        <td>{{ item.nombre_zapato }}</td>
                        <td>{{ item.tipo_calzado }}</td>
                        <td>{{ item.total_vendido }}</td>
                        <td>Q{{ formatNumber(item.ingresos_totales) }}</td>
                        <td>Q{{ formatNumber(item.precio_promedio) }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div v-if="!bestSellingData.length" class="empty-state">
                  <p>No hay datos disponibles</p>
                </div>
              </div>

              <!-- Vendedor Performance Data Table -->
              <div v-if="activeDataTab === 'vendedor'" class="data-card">
                <div class="table-container">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>Vendedor</th>
                        <th>Período</th>
                        <th>Total Pedidos</th>
                        <th>Ventas Totales</th>
                        <th>Promedio Venta</th>
                        <th>Clientes Únicos</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(item, index) in vendedorData" :key="index">
                        <td>
                          <span class="vendedor-badge">
                            {{ item.vendedor_nombre }}
                          </span>
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
                <div v-if="!vendedorData.length" class="empty-state">
                  <p>No hay datos disponibles</p>
                </div>
              </div>

              <!-- Ventas Performance Data Table -->
              <div v-if="activeDataTab === 'ventas'" class="data-card">
                <div class="table-container">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>Período</th>
                        <th>Total Pedidos</th>
                        <th>Ventas Totales</th>
                        <th>Promedio Pedido</th>
                        <th>Clientes Únicos</th>
                        <th>Vendedores Activos</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(item, index) in ventasData" :key="index">
                        <td>{{ item.periodo_display }}</td>
                        <td>{{ item.total_pedidos }}</td>
                        <td>Q{{ formatNumber(item.ventas_totales) }}</td>
                        <td>Q{{ formatNumber(item.promedio_pedido) }}</td>
                        <td>{{ item.clientes_unicos }}</td>
                        <td>{{ item.vendedores_activos }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div v-if="!ventasData.length" class="empty-state">
                  <p>No hay datos disponibles</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Global Empty State -->
        <div v-else class="empty-state global">
          <h3>No hay datos disponibles</h3>
          <p>Selecciona diferentes filtros para ver información</p>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import { ref, computed, onMounted, nextTick, watch, onBeforeUnmount } from 'vue'
import axios from 'axios'
import HeaderComponent from '@/components/HeaderComponent.vue'

export default {
  name: 'RendimientoView',
  components: {
    HeaderComponent
  },
  setup() {
    // Data references
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
    
    // Chart references - using template refs
    const lineChartCanvas = ref(null)
    const barChartCanvas = ref(null)
    const vendedorChartCanvas = ref(null)
    const ventasChartCanvas = ref(null)
    
    // Chart instances
    const lineChart = ref(null)
    const barChart = ref(null)
    const vendedorChart = ref(null)
    const ventasChart = ref(null)
    
    // Chart.js loaded flag
    const chartJsLoaded = ref(false)
    
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
const API_BASE_URL = '/api'


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

    // Switch chart function - IMPROVED
    const switchChart = async (chartType) => {
      console.log('Switching to chart:', chartType)
      
      // Destroy current chart before switching
      destroyCharts()
      
      activeChart.value = chartType
      activeDataTab.value = chartType === 'comparison' ? 'lines' : chartType
      
      // Load data for the new chart
      await loadData()
    }

    // Fetch dashboard summary
    const fetchSummaryData = async () => {
      try {
        const token = localStorage.getItem('jwtToken')
        const params = { year: selectedYear.value }
        
        const response = await axios.get(`/api/graphics/dashboard/summary`, {
          headers: { Authorization: `Bearer ${token}` },
          params
        })
        
        if (response.data.success) {
          summaryData.value = response.data.data
        }
      } catch (err) {
        console.error('Error fetching summary data:', err)
        error.value = 'Error al cargar datos de resumen'
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
        
        const response = await axios.get(`/api/graphics/comparison/product-lines`, {
          headers: { Authorization: `Bearer ${token}` },
          params
        })
        
        if (response.data.success) {
          productLinesData.value = response.data.data
        }
      } catch (err) {
        console.error('Error fetching product lines data:', err)
        error.value = 'Error al cargar datos de comparación de líneas'
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
        
        const response = await axios.get(`/api/graphics/analytics/best-selling-products`, {
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
        
        const response = await axios.get(`/api/graphics/analytics/vendedor-performance`, {
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
        
        const response = await axios.get(`/api/graphics/analytics/sales-performance`, {
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
        
        const response = await axios.get(`/api/graphics/analytics/vendedores-list`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        
        if (response.data.success) {
          vendedoresList.value = response.data.data
        }
      } catch (err) {
        console.error('Error fetching vendedores list:', err)
      }
    }

    // Load all data based on active chart - IMPROVED
    const loadData = async () => {
      loading.value = true
      error.value = null
      
      try {
        console.log('Loading data for chart:', activeChart.value)
        
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
        
        console.log('Data loaded, creating chart...')
        
        // After data is loaded, wait for DOM and create chart
        await nextTick()
        
        // Use multiple attempts with increasing delays to ensure chart creation
        let attempts = 0
        const maxAttempts = 5
        const attemptChart = () => {
          attempts++
          console.log(`Chart creation attempt ${attempts}/${maxAttempts}`)
          
          const success = createActiveChart()
          
          if (!success && attempts < maxAttempts) {
            // Try again with increasing delay
            setTimeout(attemptChart, attempts * 100)
          } else if (success) {
            console.log('Chart created successfully')
          } else {
            console.warn('Failed to create chart after all attempts')
          }
        }
        
        setTimeout(attemptChart, 150)
        
      } catch (err) {
        console.error('Error loading data:', err)
        error.value = 'Error al cargar los datos'
      } finally {
        loading.value = false
      }
    }

    // Create only the active chart - IMPROVED with better error handling
    const createActiveChart = () => {
      if (!chartJsLoaded.value) {
        console.warn('Chart.js not loaded yet')
        return false
      }
      
      console.log('Creating active chart:', activeChart.value)
      
      try {
        switch (activeChart.value) {
          case 'comparison':
            return createLineChart()
          case 'products':
            return createBarChart()
          case 'vendedor':
            return createVendedorChart()
          case 'ventas':
            return createVentasChart()
        }
      } catch (error) {
        console.error('Error in createActiveChart:', error)
        return false
      }
      
      return false
    }

    // Destroy all charts
    const destroyCharts = () => {
      console.log('Destroying all charts')
      
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

    // Create line chart for product lines comparison - IMPROVED
    const createLineChart = () => {
      console.log('Creating line chart, data length:', productLinesData.value.length)
      
      if (!productLinesData.value.length) {
        console.log('No product lines data available')
        return false
      }
      
      if (activeChart.value !== 'comparison') {
        console.log('Active chart is not comparison')
        return false
      }

      const canvas = lineChartCanvas.value || document.getElementById('lineChart')
      if (!canvas) {
        console.warn('Line chart canvas not found')
        return false
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

        lineChart.value = new Chart(canvas, {
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
                borderColor: '#2C3E50',
                backgroundColor: 'rgba(44, 62, 80, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#2C3E50',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7
              },
              {
                label: 'Línea Importadora',
                data: importadoraData,
                borderColor: '#34495E',
                backgroundColor: 'rgba(52, 73, 94, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#34495E',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7
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
                  label: function(context) {
                    let label = context.dataset.label || ''
                    if (label) {
                      label += ': '
                    }
                    label += 'Q' + formatNumber(context.parsed.y)
                    return label
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
        
        console.log('Line chart created successfully')
        return true
      } catch (error) {
        console.error('Error creating line chart:', error)
        return false
      }
    }

    // Create bar chart for best selling products - IMPROVED
    const createBarChart = () => {
      console.log('Creating bar chart, data length:', bestSellingData.value.length)
      
      if (!bestSellingData.value.length) {
        console.log('No best selling data available')
        return false
      }
      
      if (activeChart.value !== 'products') {
        console.log('Active chart is not products')
        return false
      }

      const canvas = barChartCanvas.value || document.getElementById('barChart')
      if (!canvas) {
        console.warn('Bar chart canvas not found')
        return false
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
        const charcoalColor = '#2C3E50'

        barChart.value = new Chart(canvas, {
          type: 'bar',
          data: {
            labels,
            datasets: [{
              label: 'Cantidad Vendida',
              data,
              backgroundColor: charcoalColor,
              borderColor: '#1A252F',
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
        
        console.log('Bar chart created successfully')
        return true
      } catch (error) {
        console.error('Error creating bar chart:', error)
        return false
      }
    }

    // Create vendedor performance chart - IMPROVED
    const createVendedorChart = () => {
      console.log('Creating vendedor chart, data length:', vendedorData.value.length)
      
      if (!vendedorData.value.length) {
        console.log('No vendedor data available')
        return false
      }
      
      if (activeChart.value !== 'vendedor') {
        console.log('Active chart is not vendedor')
        return false
      }

      const canvas = vendedorChartCanvas.value || document.getElementById('vendedorChart')
      if (!canvas) {
        console.warn('Vendedor chart canvas not found')
        return false
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
          const colors = ['#2C3E50', '#34495E', '#1A252F', '#607D8B', '#546E7A', '#455A64', '#37474F', '#263238']
          const color = colors[index % colors.length]
          
          const data = allPeriods.map(periodo => {
            const item = groupedData[vendedorName].find(d => d.periodo === periodo)
            return item ? item.ventas : 0
          })

          return {
            label: vendedorName,
            data: data,
            borderColor: color,
            backgroundColor: 'transparent',
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

        vendedorChart.value = new Chart(canvas, {
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
                  label: function(context) {
                    return context.dataset.label + ': Q' + formatNumber(context.parsed.y)
                  },
                  afterBody: function(context) {
                    const dataIndex = context[0].dataIndex
                    const vendedorName = context[0].dataset.label
                    const item = groupedData[vendedorName][dataIndex]
                    if (item) {
                      return [`Pedidos: ${item.pedidos}`]
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
        
        console.log('Vendedor chart created successfully')
        return true
      } catch (error) {
        console.error('Error creating vendedor chart:', error)
        return false
      }
    }

    // Create ventas performance chart - IMPROVED
    const createVentasChart = () => {
      console.log('Creating ventas chart, data length:', ventasData.value.length)
      
      if (!ventasData.value.length) {
        console.log('No ventas data available')
        return false
      }
      
      if (activeChart.value !== 'ventas') {
        console.log('Active chart is not ventas')
        return false
      }

      const canvas = ventasChartCanvas.value || document.getElementById('ventasChart')
      if (!canvas) {
        console.warn('Ventas chart canvas not found')
        return false
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

        ventasChart.value = new Chart(canvas, {
          type: 'line',
          data: {
            labels: labels,
            datasets: [
              {
                label: 'Ventas Totales',
                data: ventasTotales,
                borderColor: '#2C3E50',
                backgroundColor: 'rgba(44, 62, 80, 0.1)',
                borderWidth: 4,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#2C3E50',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 6,
                pointHoverRadius: 8,
                yAxisID: 'y'
              },
              {
                label: 'Línea Nacional',
                data: ventasNacional,
                borderColor: '#34495E',
                backgroundColor: 'transparent',
                borderWidth: 3,
                fill: false,
                tension: 0.4,
                pointBackgroundColor: '#34495E',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7,
                yAxisID: 'y'
              },
              {
                label: 'Línea Importadora',
                data: ventasImportadora,
                borderColor: '#607D8B',
                backgroundColor: 'transparent',
                borderWidth: 3,
                fill: false,
                tension: 0.4,
                pointBackgroundColor: '#607D8B',
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
                backgroundColor: 'rgba(26, 37, 47, 0.4)',
                borderColor: '#1A252F',
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
        
        console.log('Ventas chart created successfully')
        return true
      } catch (error) {
        console.error('Error creating ventas chart:', error)
        return false
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

    // Load Chart.js library
    const loadChartJs = () => {
      return new Promise((resolve, reject) => {
        if (window.Chart) {
          chartJsLoaded.value = true
          resolve()
          return
        }

        const script = document.createElement('script')
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js'
        script.onload = () => {
          chartJsLoaded.value = true
          console.log('Chart.js loaded successfully')
          resolve()
        }
        script.onerror = () => {
          console.error('Failed to load Chart.js')
          reject(new Error('Failed to load Chart.js'))
        }
        document.head.appendChild(script)
      })
    }

    // Lifecycle - onMounted
    onMounted(async () => {
      try {
        // Load Chart.js first
        await loadChartJs()
        
        // Then load initial data
        await loadData()
      } catch (error) {
        console.error('Error in onMounted:', error)
        error.value = 'Error al inicializar el dashboard'
      }
    })

    // Cleanup on unmount
    onBeforeUnmount(() => {
      destroyCharts()
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
      
      // Template refs for canvas elements
      lineChartCanvas,
      barChartCanvas,
      vendedorChartCanvas,
      ventasChartCanvas,
      
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