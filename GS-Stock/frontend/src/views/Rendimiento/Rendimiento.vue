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
              <label for="limit-select">Top productos:</label>
              <select 
                id="limit-select"
                v-model="selectedLimit" 
                @change="handleFilterChange"
                class="filter-select"
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
          </div>

          <!-- Data Tables Section -->
          <div class="data-section">
            <h3 class="section-title">Datos Detallados</h3>
            <div class="tabs-navigation">
              <button 
                class="tab-button"
                :class="{ active: activeDataTab === 'lines' }"
                @click="activeDataTab = 'lines'"
              >
                Datos por Línea
              </button>
              <button 
                class="tab-button"
                :class="{ active: activeDataTab === 'products' }"
                @click="activeDataTab = 'products'"
              >
                Datos de Productos
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
            </div>
          </div>

          <!-- Empty State (when no data at all) -->
          <div v-if="!productLinesData.length && !bestSellingData.length && !loading" class="empty-state global">
            <h3>No hay datos disponibles</h3>
            <p>No se encontraron datos para los filtros seleccionados. Intenta con diferentes parámetros.</p>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import { ref, onMounted, computed, watch, nextTick } from 'vue'
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
    const loading = ref(false)
    const error = ref(null)
    
    // UI state
    const activeChart = ref('comparison')
    const activeDataTab = ref('lines')
    
    // Filter options
    const selectedYear = ref(new Date().getFullYear())
    const selectedMonth = ref('')
    const selectedLimit = ref(10)
    
    // Chart references
    const lineChart = ref(null)
    const barChart = ref(null)
    
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

    // Clear error
    const clearError = () => {
      error.value = null
    }

    // Switch chart function
    const switchChart = (chartType) => {
      activeChart.value = chartType
      nextTick(() => {
        setTimeout(() => {
          createActiveChart()
        }, 100)
      })
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

    // Load all data
    const loadData = async () => {
      loading.value = true
      error.value = null
      
      try {
        await Promise.all([
          fetchSummaryData(),
          fetchProductLinesData(),
          fetchBestSellingData()
        ])
        
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
      if (activeChart.value === 'comparison') {
        createLineChart()
      } else if (activeChart.value === 'products') {
        createBarChart()
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
                font: {
                  size: 14
                }
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
              grid: {
                color: 'rgba(229, 231, 235, 0.8)'
              },
              ticks: {
                callback: function(value) {
                  return 'Q' + value.toLocaleString()
                },
                font: {
                  size: 12
                }
              }
            },
            x: {
              grid: {
                color: 'rgba(229, 231, 235, 0.8)'
              },
              ticks: {
                font: {
                  size: 12
                }
              }
            }
          },
          interaction: {
            intersect: false,
            mode: 'index'
          }
        }
      })
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
            legend: {
              display: false
            },
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
              grid: {
                color: 'rgba(229, 231, 235, 0.8)'
              },
              ticks: {
                stepSize: 1,
                font: {
                  size: 12
                }
              }
            },
            x: {
              grid: {
                display: false
              },
              ticks: {
                maxRotation: 45,
                minRotation: 45,
                font: {
                  size: 11
                }
              }
            }
          }
        }
      })
    }

    // Handle filter changes
    const handleFilterChange = () => {
      loadData()
    }

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
      loading,
      error,
      
      // UI State
      activeChart,
      activeDataTab,
      
      // Filters
      selectedYear,
      selectedMonth,
      selectedLimit,
      availableYears,
      availableMonths,
      
      // Methods
      loadData,
      handleFilterChange,
      formatNumber,
      getRankClass,
      clearError,
      switchChart
    }
  }
}
</script>

<style scoped src="../../styles/Rendimiento/rendimiento.css">

</style>