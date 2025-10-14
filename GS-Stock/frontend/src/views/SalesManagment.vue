<template>
  <div class="sales-management-container">
    <header-component />

    <div class="content-section">
      <div class="page-title">Sistema de Ventas</div>

      <div class="tabs-navigation">
        <button 
          class="tab-button"
          :class="{ active: activeTab === 'ventas' }"
          @click="activeTab = 'ventas'"
        >
          Gestión de Ventas
        </button>
        <button 
          class="tab-button"
          :class="{ active: activeTab === 'historial' }"
          @click="activeTab = 'historial'"
        >
          Historial Ventas
        </button>
      </div>

      <div v-show="activeTab === 'ventas'" class="tab-content">
        <div class="actions-section">
          <button class="action-button add-button" @click="openAddSaleModal">
            Agregar Venta
          </button>
          <button class="action-button refresh-button" @click="fetchSales">
            Actualizar Lista
          </button>
        </div>

        <div class="filter-section">
          <div class="filter-group">
            <label for="filter-date">Filtrar por fecha:</label>
            <input 
              type="date" 
              id="filter-date" 
              v-model="filters.date"
            />
          </div>
          <div class="filter-group">
            <label for="filter-client">Filtrar por cliente:</label>
            <input 
              v-model="filters.client" 
              id="filter-client"
              placeholder="Nombre del cliente"
            />
          </div>
          <div class="filter-buttons">
            <button class="filter-button" @click="applyFilters">Aplicar Filtros</button>
            <button class="filter-button reset" @click="resetFilters">Restablecer</button>
          </div>
        </div>

        <h2 class="list-title">Lista de Ventas Registradas ({{ filteredSales.length }})</h2>

        <div v-if="loading" class="loading-indicator">
          Cargando ventas...
        </div>
        
        <div v-if="error" class="error-message">
          {{ error }}
        </div>

        <ventas-tabla
          v-if="!loading && !error"
          :sales="filteredSales"
          :estados-pedidos="estadosPedidos"
          @sale-selected="handleSaleSelection"
          @status-updated="handleStatusUpdate"
          @view-details="handleViewDetails"
          @download-envio="handleDownloadEnvio"
        />

        <!-- Paginación (reutiliza estilos de UserManagement) -->
        <div class="pagination" v-if="total > 0">
          <button @click="previousPage" :disabled="currentPage === 1" class="pagination-nav">‹</button>

          <div class="page-numbers">
            <button
              v-for="pageNum in displayedPageNumbers"
              :key="pageNum"
              @click="currentPage = pageNum"
              :class="{ active: currentPage === pageNum }"
            >
              {{ pageNum }}
            </button>
          </div>

          <button @click="nextPage" :disabled="currentPage === totalPages" class="pagination-nav">›</button>
        </div>
      </div>

      <div v-show="activeTab === 'historial'" class="tab-content">
        <historial-facturas 
          ref="historialRef"
          :estados-pedidos="estadosPedidos"
          @factura-seleccionada="handleFacturaSeleccionada"
          @ver-detalles="handleVerDetalles"
          @descargar-factura="handleDescargarFactura"
        />
      </div>
    </div>

    <div v-if="showAddSaleModal" class="modal" @click="cerrarDropdownCliente">
      <div class="modal-content">
        <span class="close" @click="showAddSaleModal = false">&times;</span>
        <h2>Agregar Nueva Venta</h2>
        <form @submit.prevent="addSale">
          
          <!-- SECCIÓN: Información del Vendedor Automática -->
          <div class="vendedor-section" v-if="vendedorActual">
            <h3>Vendedor</h3>
            <div class="vendedor-info">
              <div class="vendedor-badge">
                <span class="vendedor-nombre">{{ vendedorActual.nombre_completo }}</span>
                <span class="vendedor-rol">{{ vendedorActual.rol }}</span>
              </div>
              <small class="vendedor-usuario">Usuario: {{ vendedorActual.usuario }}</small>
            </div>
          </div>
          
          <div class="cliente-section">
            <h3>Información del Cliente</h3>
            
            <div class="form-group">
              <label for="cliente-search">Buscar Cliente:</label>
              <div class="cliente-search-container">
                <input 
                  type="text"
                  id="cliente-search"
                  v-model="clienteSearchTerm"
                  @input="buscarClientes"
                  @focus="showClienteDropdown = true"
                  placeholder="Buscar por nombre (Ana González) o empresa (Zapatería Ana)"
                  class="cliente-search-input"
                />
                
                <div 
                  v-if="showClienteDropdown && clientesFiltrados.length > 0" 
                  class="cliente-dropdown"
                >
                  <div 
                    v-for="cliente in clientesFiltrados" 
                    :key="cliente.id"
                    @click="seleccionarCliente(cliente)"
                    class="cliente-option"
                  >
                    <div class="cliente-info">
                      <strong>{{ cliente.nombre }} {{ cliente.apellido }}</strong>
                      <span v-if="cliente.empresa" class="empresa-tag">{{ cliente.empresa }}</span>
                    </div>
                    <div class="cliente-detalles">
                      <small>{{ cliente.telefonos[0]?.telefono || 'Sin teléfono' }}</small>
                    </div>
                  </div>
                </div>
                
                <div 
                  v-if="showClienteDropdown && clienteSearchTerm && clientesFiltrados.length === 0"
                  class="no-cliente-found"
                >
                  No se encontraron clientes. <button type="button" @click="abrirModalNuevoCliente" class="btn-link">Crear nuevo cliente</button>
                </div>
              </div>
            </div>

            <div v-if="clienteSeleccionado" class="cliente-seleccionado">
              <h4>Cliente Seleccionado:</h4>
              <div class="cliente-details-grid">
                <div class="detail-item">
                  <label>Nombre:</label>
                  <span>{{ clienteSeleccionado.nombre }} {{ clienteSeleccionado.apellido }}</span>
                </div>
                
                <div class="detail-item" v-if="clienteSeleccionado.empresa">
                  <label>Empresa:</label>
                  <span>{{ clienteSeleccionado.empresa }}</span>
                </div>
                
                <div class="detail-item">
                  <label>NIT:</label>
                  <span>{{ clienteSeleccionado.nit || 'C/F' }}</span>
                </div>
                
                <div class="detail-item">
                  <label>Teléfono:</label>
                  <span>{{ clienteSeleccionado.telefonos[0]?.telefono || 'Sin teléfono' }}</span>
                </div>
                
                <div class="detail-item">
                  <label>Dirección:</label>
                  <span>{{ clienteSeleccionado.direcciones[0]?.direccion || 'Sin dirección' }}</span>
                </div>
              </div>
              
              <button type="button" @click="limpiarClienteSeleccionado" class="btn-limpiar-cliente">
                Cambiar Cliente
              </button>
            </div>
          </div>

          <div class="form-group">
            <label for="id_tipo_linea_producto">Línea de Producto:</label>
            <select 
              id="id_tipo_linea_producto" 
              v-model="newSale.id_tipo_linea_producto" 
              required
            >
              <option value="">Seleccione una línea</option>
              <option 
                v-for="tipo in tiposLineaProducto" 
                :key="tipo.id" 
                :value="tipo.id"
              >
                {{ tipo.nombre }}
              </option>
            </select>
          </div>

          <!-- REMOVIDO: Sección de método de pago completamente eliminada -->

          <div class="productos-section">
            <label>Productos con Tallas:</label>
            <div 
              v-for="(producto, index) in newSale.productos" 
              :key="index"
              class="producto-item"
            >
              <div class="producto-header">
                <h4>Producto {{ index + 1 }}</h4>
                <button 
                  type="button" 
                  @click="eliminarProducto(index)"
                  v-if="newSale.productos.length > 1"
                  class="remove-product-button-header"
                  title="Eliminar producto"
                >
                  ✕
                </button>
              </div>
              
              <div class="zapato-selection">
                <label>Zapato:</label>
                <select 
                  v-model="producto.id_zapato" 
                  @change="onZapatoChange(index)"
                  required
                  class="zapato-select"
                >
                  <option value="">Seleccione zapato</option>
                  <option v-for="zapato in zapatosDisponibles" :key="zapato.id" :value="zapato.id">
                    {{ zapato.codigo }} - {{ zapato.nombre }} (Q{{ formatPrice(zapato.precio_par) }})
                  </option>
                </select>
              </div>

              <div v-if="producto.id_zapato" class="tallas-section">
                <label class="tallas-label">Tallas y Cantidades:</label>
                
                <div class="tallas-grid">
                  <div 
                    v-for="(tallaItem, tallaIndex) in producto.tallas" 
                    :key="tallaIndex"
                    class="talla-item"
                  >
                    <div class="talla-row">
                      <div class="talla-selector">
                        <label>Talla:</label>
                        <select 
                          v-model="tallaItem.id_talla" 
                          @change="onTallaChange(index, tallaIndex)"
                          required
                          class="talla-select"
                        >
                          <option value="" disabled>Seleccione talla</option>
                          <option 
                            v-for="talla in getTallasDisponiblesParaProducto(producto.id_zapato, index)" 
                            :key="`${talla.talla_id}-${index}-${tallaIndex}`"
                            :value="talla.talla_id"
                            :disabled="talla.stock <= 0 || istallaYaSeleccionada(producto, talla.talla_id, tallaIndex)"
                            :class="{ 
                              'talla-agotada': talla.stock <= 0,
                              'talla-repetida': istallaYaSeleccionada(producto, talla.talla_id, tallaIndex)
                            }"
                          >
                            EU {{ talla.talla_eu }} / US {{ talla.talla_us }} 
                            (Stock: {{ talla.stock }})
                            {{ talla.stock <= 0 ? ' - SIN STOCK' : '' }}
                            {{ istallaYaSeleccionada(producto, talla.talla_id, tallaIndex) ? ' - YA SELECCIONADA' : '' }}
                          </option>
                        </select>
                      </div>
                      <div class="cantidad-input-group">
                        <label>Cantidad:</label>
                        <input 
                          type="number" 
                          v-model.number="tallaItem.cantidad" 
                          required
                          min="1"
                          :max="getMaxStockForTalla(producto.id_zapato, tallaItem.id_talla)"
                          class="cantidad-input"
                          @change="updateTotal"
                        >
                      </div>

                      <div class="stock-info-container" v-if="tallaItem.id_talla">
                        <div class="stock-info-badge">
                          <span class="stock-label">Disponible:</span>
                          <span class="stock-number">{{ getMaxStockForTalla(producto.id_zapato, tallaItem.id_talla) }}</span>
                        </div>
                      </div>

                      <button 
                        type="button" 
                        @click="eliminarTalla(index, tallaIndex)"
                        v-if="producto.tallas.length > 1"
                        class="remove-talla-button"
                        title="Eliminar talla"
                      >
                        ✕
                      </button>
                    </div>

                    <div v-if="tallaItem.error_stock" class="stock-error">
                      {{ tallaItem.error_stock }}
                    </div>
                  </div>
                </div>

                <button type="button" @click="agregarTalla(index)" class="add-talla-button">
                  + Agregar Talla
                </button>
              </div>

              <div class="precio-section" v-if="producto.id_zapato">
                <label>Precio Unitario:</label>
                <div class="precio-display">
                  Q{{ formatPrice(producto.precio_unitario) }}
                </div>
              </div>

              <div class="subtotal-producto" v-if="producto.id_zapato">
                <strong>Subtotal Producto: Q{{ formatPrice(calcularSubtotalProducto(producto)) }}</strong>
              </div>
            </div>

            <button type="button" @click="agregarProducto" class="add-product-button">
              + Agregar Producto
            </button>
          </div>

          <div class="totales-section">
            <div class="totales-display">
              <div class="total-row total-final">
                <strong>TOTAL: Q{{ formatPrice(calculatedTotal) }}</strong>
              </div>
            </div>
          </div>

          <div class="modal-actions">
            <button type="submit" class="submit-button" :disabled="!isValidForm || creatingPedido">
              {{ creatingPedido ? 'Procesando...' : 'Crear Pedido' }}
            </button>
            <button type="button" @click="showAddSaleModal = false" class="cancel-button">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>

    <div v-if="showDetailsModal" class="modal">
      <div class="modal-content details-modal">
        <span class="close" @click="showDetailsModal = false">&times;</span>
        <h2>Detalles de la Venta</h2>
        <div v-if="selectedSale" class="sale-details">
          <div class="detail-section">
            <h3>Información General</h3>
            <p><strong>ID Pedido:</strong> #{{ selectedSale.id }}</p>
            <p><strong>Cliente:</strong> {{ selectedSale.cliente_nombre }}</p>
            <p><strong>Vendedor:</strong> {{ selectedSale.vendedor_nombre }}</p>
            <p><strong>Fecha:</strong> {{ formatDate(selectedSale.fecha) }}</p>
            <p><strong>Estado:</strong> {{ selectedSale.estado_pedido }}</p>
            <p><strong>Línea de Producto:</strong> {{ selectedSale.tipo_linea_producto }}</p>
          </div>
          
          <div class="detail-section">
            <h3>Productos del Pedido</h3>
            <div v-if="loadingDetails" class="loading-products">
              Cargando productos...
            </div>
            <div v-else-if="saleProducts.length > 0" class="products-list">
              <div v-for="product in saleProducts" :key="product.id" class="product-item">
                <div class="product-header">
                  <h4>{{ product.codigo }} - {{ product.nombre }}</h4>
                  <span class="product-price">Q{{ formatCurrency(product.precio_par) }}</span>
                  <span class="product-linea" v-if="product.tipo_linea">{{ product.tipo_linea }}</span>
                </div>
                <div class="tallas-info">
                  <div v-for="talla in product.tallas" :key="talla.id" class="talla-item">
                    <span class="talla-detail">
                      <strong>Talla:</strong> EU {{ talla.talla_eu }} / US {{ talla.talla_us }}
                      <strong>Cantidad:</strong> {{ talla.cantidad }}
                      <strong>Subtotal:</strong> Q{{ formatCurrency(talla.cantidad * product.precio_par) }}
                    </span>
                  </div>
                </div>
                <div class="product-total">
                  <strong>Total Producto: Q{{ formatCurrency(product.subtotal) }}</strong>
                </div>
              </div>
            </div>
            <div v-else class="no-products">
              No se encontraron productos para este pedido
            </div>
          </div>
          
          <div class="detail-section">
            <h3>Totales</h3>
            <div class="totals-breakdown">
              <p><strong>Subtotal Productos:</strong> Q{{ formatCurrency(calculateProductsSubtotal()) }}</p>
              <p class="total-final"><strong>TOTAL PEDIDO:</strong> Q{{ formatCurrency(selectedSale.total) }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de descarga de envío -->
    <div v-if="showEnvioDialog" class="modal">
      <div class="modal-content">
        <h3 style="margin-top:0">¿Quieres descargar el envío?</h3>
        <p>Se generará el PDF del envío para el <strong>pedido #{{ lastPedidoId }}</strong> con el formato de <strong>{{ lastTipoLinea }}</strong>.</p>
        <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:16px">
          <button class="btn-secondary" @click="showEnvioDialog=false">No</button>
          <button class="btn-primary" :disabled="downloadingEnvio" @click="descargarEnvio">
            {{ downloadingEnvio ? 'Generando...' : 'Sí, descargar' }}
          </button>
        </div>
      </div>
    </div>
    
    <modal-message 
      :show="showMessageModal"
      :title="messageTitle"
      :message="messageContent"
      :type="messageType"
      @close="hideMessage"
    />
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue';
import VentasTabla from '@/components/VentasTabla.vue';
import HeaderComponent from '@/components/HeaderComponent.vue';
import ModalMessage from '@/components/ModalMessage.vue';
import HistorialFacturas from '@/components/HistorialFacturas.vue';
import { useRouter } from 'vue-router';

export default {
  name: 'SalesManagementView',
  components: {
    VentasTabla,
    HeaderComponent,
    ModalMessage,
    HistorialFacturas
  },
  setup() {
    const router = useRouter();

    const saleProducts = ref([]);
    const loadingDetails = ref(false);
    const sales = ref([]);
    const loading = ref(true);
    const error = ref(null);
    const selectedSale = ref(null);
    const showDetailsModal = ref(false);
    const showAddSaleModal = ref(false);
    const showMessageModal = ref(false);
    const messageTitle = ref('');
    const messageContent = ref('');
    const messageType = ref('info');
    const creatingPedido = ref(false);
    const activeTab = ref('ventas');
    // REMOVIDO: metodosPago ref
    const showEnvioDialog = ref(false);
    const lastPedidoId = ref(null);
    const lastTipoLinea = ref('');
    const downloadingEnvio = ref(false);
    const estadosPedidos = ref([]);
    const clientes = ref([]);
    const zapatosDisponibles = ref([]);
    const clienteSearchTerm = ref('');
    const showClienteDropdown = ref(false);
    const clienteSeleccionado = ref(null);
    const clientesFiltrados = ref([]);
    const searchTimeout = ref(null);
    const tiposLineaProducto = ref([]);
    const vendedorActual = ref(null);
    
    // Pagination state
    const currentPage = ref(1);
    const perPage = ref(10);
    const total = ref(0);
    const totalPages = ref(1);
    const isMobile = ref(false);
    
    const filters = ref({
      date: '',
      client: '',
      status: ''
    });

    // ACTUALIZADO: newSale sin id_metodo_de_pago
    const newSale = ref({
      id_cliente: '',
      id_tipo_linea_producto: '',
      productos: [{ 
        id_zapato: '', 
        tallas: [{ 
          id_talla: '', 
          cantidad: 1,
          error_stock: ''
        }],
        precio_unitario: 0
      }]
    });

    const showMessage = (title, message, type = 'info') => {
      messageTitle.value = title;
      messageContent.value = message;
      messageType.value = type;
      showMessageModal.value = true;
    };

    const hideMessage = () => {
      showMessageModal.value = false;
    };

    const checkAuth = () => {
      const token = localStorage.getItem('jwtToken');
      if (!token) {
        showMessage('Error', 'No has iniciado sesión', 'error');
        setTimeout(() => {
          router.push('/login');
        }, 1500);
        return false;
      }
      return token;
    };

    const fetchVendedorActual = async () => {
      try {
        const token = checkAuth();
        if (!token) return;

        const response = await fetch('/api/ventas/vendedor-actual', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Error al obtener vendedor actual');
        
        const result = await response.json();
        if (result.success) {
          vendedorActual.value = result.data;
          
          if (!result.data.es_vendedor && !result.data.es_administrador) {
            showMessage('Error de Permisos', 
              'Tu usuario no tiene permisos de vendedor o administrador. Contacta al administrador.', 
              'error'
            );
            setTimeout(() => router.push('/dashboard'), 2000);
            return;
          }
          
          console.log('Usuario actual:', vendedorActual.value);
        }
      } catch (err) {
        console.error('Error al obtener vendedor actual:', err);
        showMessage('Error', 'No se pudo obtener la información del vendedor', 'error');
      }
    };

    const fetchTiposLineaProducto = async () => {
      try {
        const token = checkAuth();
        if (!token) return;

        const response = await fetch('/api/ventas/tipos-linea-producto', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Error al obtener tipos de línea');
        
        const result = await response.json();
        if (result.success && Array.isArray(result.data)) {
          tiposLineaProducto.value = result.data;
        }
      } catch (err) {
        console.error('Error al obtener tipos de línea:', err);
        showMessage('Error', 'No se pudieron cargar los tipos de línea de producto', 'error');
      }
    };

    const checkScreenSize = () => {
      isMobile.value = window.innerWidth < 768;
      perPage.value = isMobile.value ? 5 : 10;
    };

    const handleFacturaSeleccionada = (factura) => {
      console.log('Factura seleccionada:', factura);
    };

    const handleVerDetalles = (factura) => {
      showMessage('Detalles de Factura', 
        `ID: ${factura.id}\nCliente: ${factura.nombre_cliente} ${factura.apellido_cliente}\nTotal: Q${factura.total}`,
        'info'
      );
    };

    const handleDescargarFactura = (factura) => {
      showMessage('Descarga de Factura', 
        `Preparando descarga de factura #${factura.id}...\nEsta funcionalidad se implementará próximamente.`,
        'info'
      );
    };

    const buscarClientes = () => {
      clearTimeout(searchTimeout.value);
      
      searchTimeout.value = setTimeout(() => {
        if (clienteSearchTerm.value.length < 2) {
          clientesFiltrados.value = [];
          return;
        }
        
        const term = clienteSearchTerm.value.toLowerCase();
        
        clientesFiltrados.value = clientes.value.filter(cliente => {
          const nombreCompleto = `${cliente.nombre} ${cliente.apellido}`.toLowerCase();
          const empresa = cliente.empresa?.toLowerCase() || '';
          
          return nombreCompleto.includes(term) || empresa.includes(term);
        }).slice(0, 8);
        
      }, 300);
    };

    const seleccionarCliente = (cliente) => {
      clienteSeleccionado.value = cliente;
      newSale.value.id_cliente = parseInt(cliente.id);
      clienteSearchTerm.value = `${cliente.nombre} ${cliente.apellido}${cliente.empresa ? ' - ' + cliente.empresa : ''}`;
      showClienteDropdown.value = false;
      clientesFiltrados.value = [];
    };

    const limpiarClienteSeleccionado = () => {
      clienteSeleccionado.value = null;
      newSale.value.id_cliente = '';
      clienteSearchTerm.value = '';
      showClienteDropdown.value = false;
      clientesFiltrados.value = [];
    };

    const abrirModalNuevoCliente = () => {
      showMessage('Crear Cliente', 
        'La funcionalidad de crear nuevo cliente se implementará próximamente.\nPor ahora, crea el cliente desde el módulo de Clientes.',
        'info'
      );
    };

    const cerrarDropdownCliente = (event) => {
      if (!event.target.closest('.cliente-search-container')) {
        showClienteDropdown.value = false;
      }
    };

    const fetchClientes = async () => {
      try {
        const token = checkAuth();
        if (!token) return;
        
        const response = await fetch('/api/ventas/clientes', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Error al obtener clientes');
        
        const data = await response.json();
        clientes.value = data.data || [];
        
      } catch (err) {
        console.error('Error al obtener clientes:', err);
      }
    };

    const fetchZapatosDisponibles = async () => {
      try {
        const token = checkAuth();
        if (!token) return;
        
        const response = await fetch('/api/inventory', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Error al obtener zapatos');
        
        const data = await response.json();
        zapatosDisponibles.value = data.data || [];
      } catch (err) {
        console.error('Error al obtener zapatos:', err);
      }
    };
    
    // REMOVIDO: fetchMetodosPago function completamente

    const getTallasDisponiblesParaProducto = (zapatoId, productoIndex) => {
      if (!zapatoId) return [];
      
      const zapato = zapatosDisponibles.value.find(z => z.id === parseInt(zapatoId));
      if (!zapato) return [];
      
      return zapato.tallas_disponibles || [];
    };

    const getMaxStockForTalla = (zapatoId, tallaId) => {
      if (!zapatoId || !tallaId) return 0;
      const zapato = zapatosDisponibles.value.find(z => z.id === parseInt(zapatoId));
      if (!zapato) return 0;
      const talla = zapato.tallas_disponibles.find(t => t.talla_id === parseInt(tallaId));
      return talla?.stock || 0;
    };

    const onZapatoChange = (index) => {
      const producto = newSale.value.productos[index];
      
      producto.tallas = [{ 
        id_talla: '', 
        cantidad: 1,
        error_stock: ''
      }];
      producto.precio_unitario = 0;
      
      if (producto.id_zapato) {
        const zapato = zapatosDisponibles.value.find(z => z.id === parseInt(producto.id_zapato));
        if (zapato) {
          producto.precio_unitario = parseFloat(zapato.precio_par);
        }
      }
      
      updateTotal();
    };

    const fetchEstadosPedidos = async () => {
      try {
        const token = checkAuth();
        if (!token) return;
        
        const response = await fetch('/api/ventas/estados-pedidos', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Error al obtener estados de pedidos');
        
        const data = await response.json();
        console.log('Estados de pedidos cargados:', data.data);
        
        if (data.success && Array.isArray(data.data)) {
          estadosPedidos.value = data.data;
          console.log('Estados disponibles:', estadosPedidos.value.map(e => e.estado));
        }
      } catch (err) {
        console.error('Error al obtener estados de pedidos:', err);
        showMessage('Error', 'No se pudieron cargar los estados de pedidos', 'error');
      }
    };

    const onTallaChange = (productoIndex, tallaIndex) => {
      const tallaItem = newSale.value.productos[productoIndex].tallas[tallaIndex];
      tallaItem.error_stock = '';
      
      const tallasDelProducto = newSale.value.productos[productoIndex].tallas;
      const tallaRepetida = tallasDelProducto.find((t, index) => 
        index !== tallaIndex && 
        t.id_talla === tallaItem.id_talla && 
        t.id_talla !== ''
      );
      
      if (tallaRepetida) {
        tallaItem.error_stock = 'Esta talla ya está seleccionada en este producto';
        tallaItem.id_talla = '';
        return;
      }
      
      if (tallaItem.id_talla && tallaItem.cantidad) {
        const stockDisponible = getMaxStockForTalla(
          newSale.value.productos[productoIndex].id_zapato, 
          tallaItem.id_talla
        );
        
        if (tallaItem.cantidad > stockDisponible) {
          tallaItem.error_stock = `Solo hay ${stockDisponible} unidades disponibles`;
          if (stockDisponible > 0) {
            tallaItem.cantidad = stockDisponible;
          }
        }
      }
      
      updateTotal();
    };

    const agregarTalla = (productoIndex) => {
      newSale.value.productos[productoIndex].tallas.push({
        id_talla: '',
        cantidad: 1,
        error_stock: ''
      });
    };

    const eliminarTalla = (productoIndex, tallaIndex) => {
      if (newSale.value.productos[productoIndex].tallas.length > 1) {
        newSale.value.productos[productoIndex].tallas.splice(tallaIndex, 1);
        updateTotal();
      }
    };

    const calcularSubtotalProducto = (producto) => {
      return producto.tallas.reduce((total, talla) => {
        return total + ((talla.cantidad || 0) * (producto.precio_unitario || 0));
      }, 0);
    };

    const formatPrice = (price) => {
      if (!price && price !== 0) return '0.00';
      return parseFloat(price).toFixed(2);
    };

    const calculatedTotal = computed(() => {
      return newSale.value.productos.reduce((total, producto) => {
        return total + calcularSubtotalProducto(producto);
      }, 0);
    });

    const updateTotal = () => {
      // Función para forzar la reactividad
    };

    // ACTUALIZADO: isValidForm sin validar metodo de pago
    const isValidForm = computed(() => {
      // Validar datos básicos
      if (!newSale.value.id_cliente) return false;
      if (!newSale.value.id_tipo_linea_producto) return false;
      // REMOVIDO: validación de id_metodo_de_pago
      
      // Validar productos
      for (let i = 0; i < newSale.value.productos.length; i++) {
        const producto = newSale.value.productos[i];
        
        if (!producto.id_zapato) return false;
        
        let tieneAlMenosUnaTallaValida = false;
        
        for (let j = 0; j < producto.tallas.length; j++) {
          const talla = producto.tallas[j];
          
          if (talla.id_talla && talla.cantidad > 0 && !talla.error_stock) {
            tieneAlMenosUnaTallaValida = true;
          }
        }
        
        if (!tieneAlMenosUnaTallaValida) return false;
      }
      
      return true;
    });

    const agregarProducto = () => {
      newSale.value.productos.push({ 
        id_zapato: '', 
        tallas: [{ 
          id_talla: '', 
          cantidad: 1,
          error_stock: ''
        }],
        precio_unitario: 0
      });
    };

    const eliminarProducto = (index) => {
      if (newSale.value.productos.length > 1) {
        newSale.value.productos.splice(index, 1);
        updateTotal();
      }
    };

    const openAddSaleModal = async () => {
      // Verificar permisos de vendedor antes de abrir modal
      if (!vendedorActual.value || (!vendedorActual.value.es_vendedor && !vendedorActual.value.es_administrador)) {
        showMessage('Error de Permisos', 
          'Solo los usuarios con rol de vendedor o administrador pueden crear ventas.', 
          'error'
        );
        return;
      }

      await Promise.all([
        fetchClientes(),
        fetchZapatosDisponibles(),
        // REMOVIDO: fetchMetodosPago(),
        fetchTiposLineaProducto(),
        fetchEstadosPedidos()
      ]);

      // ACTUALIZADO: newSale sin id_metodo_de_pago
      newSale.value = {
        id_cliente: '',
        id_tipo_linea_producto: '',
        productos: [{ 
          id_zapato: '', 
          tallas: [{ 
            id_talla: '', 
            cantidad: 1,
            error_stock: ''
          }],
          precio_unitario: 0
        }]
      };
      
      clienteSeleccionado.value = null;
      clienteSearchTerm.value = '';
      showClienteDropdown.value = false;
      clientesFiltrados.value = [];
      
      showAddSaleModal.value = true;
    };

    const addSale = async () => {
      if (!isValidForm.value) {
        showMessage('Error', 'Complete todos los campos correctamente', 'error');
        return;
      }

      creatingPedido.value = true;

      try {
        const token = checkAuth();
        if (!token) return;

        const productosParaEnviar = [];
        
        newSale.value.productos.forEach((producto, pIndex) => {
          producto.tallas.forEach((talla, tIndex) => {
            if (talla.id_talla && talla.cantidad > 0 && !talla.error_stock) {
              productosParaEnviar.push({
                id_zapato: parseInt(producto.id_zapato),
                id_talla: parseInt(talla.id_talla),
                cantidad: parseInt(talla.cantidad),
                precio_unitario: parseFloat(producto.precio_unitario)
              });
            }
          });
        });

        if (productosParaEnviar.length === 0) {
          showMessage('Error', 'No hay productos válidos para el pedido', 'error');
          return;
        }

        // ACTUALIZADO: pedidoData sin id_metodo_de_pago
        const pedidoData = {
          id_cliente: parseInt(newSale.value.id_cliente),
          id_tipo_linea_producto: parseInt(newSale.value.id_tipo_linea_producto),
          productos: productosParaEnviar
        };

        console.log('Sending pedido data:', pedidoData);

        const response = await fetch('/api/ventas/pedidos', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(pedidoData)
        });

        if (!response.ok) {
          const errorData = await response.json();
          
          if (errorData.codigo_error === 'STOCK_INSUFICIENTE') {
            showMessage(
              'Stock Insuficiente', 
              `${errorData.error}\n\nZapato: ${errorData.detalles.zapato}\nTalla: EU ${errorData.detalles.talla_eu}\nDisponible: ${errorData.detalles.stock_disponible}\nSolicitado: ${errorData.detalles.cantidad_solicitada}`,
              'error'
            );
            return;
          }
          
          throw new Error(errorData.error || `HTTP Error: ${response.status}`);
        }

        const data = await response.json();

        showMessage('Pedido Creado Exitosamente', 'El pedido se ha creado correctamente', 'success');

        // Ofrecer descarga de envío si aplica
        lastPedidoId.value = data.data.pedido.id;
        lastTipoLinea.value = data.data.resumen.tipo_linea;
        if (lastTipoLinea.value === 'Linea Nacional' || lastTipoLinea.value === 'Linea Importadora') {
          showEnvioDialog.value = true;
        }

        showAddSaleModal.value = false;
        fetchSales();
        
      } catch (error) {
        console.error('Error al crear pedido:', error);
        showMessage('Error', `Error al crear el pedido: ${error.message}`, 'error');
      } finally {
        creatingPedido.value = false;
      }
    };

    const descargarEnvio = async () => {
      try {
        const token = checkAuth();
        if (!token) return;
        downloadingEnvio.value = true;

        const endpoint = (lastTipoLinea.value === 'Linea Nacional')
          ? '/api/envios/nacional'
          : '/api/envios/importadora';

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ pedido_id: lastPedidoId.value })
        });

        if (!res.ok) {
          let err = 'No se pudo generar el PDF';
          try { const e = await res.json(); if (e && e.error) err = e.error; } catch (_) {}
          showMessage('Error', err, 'error');
          return;
        }

        const blob = await res.blob();
        const cd = res.headers.get('Content-Disposition') || '';
        const m = /filename="([^"]+)"/i.exec(cd);
        const fileName = m?.[1] || 'envio.pdf';

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);

        showMessage('Descarga lista', `Se descargó ${fileName}`, 'success');
      } catch (e) {
        console.error('descargarEnvio error', e);
        showMessage('Error', 'No se pudo descargar el envío', 'error');
      } finally {
        downloadingEnvio.value = false;
        showEnvioDialog.value = false;
      }
    };

    const handleDownloadEnvio = async (sale) => {
      try {
        const token = checkAuth();
        if (!token) return;

        showMessage('Generando PDF', `Generando PDF de envío para pedido #${sale.id}...`, 'info');

        const endpoint = (sale.tipo_linea_producto && sale.tipo_linea_producto.toLowerCase().includes('import'))
          ? '/api/envios/importadora'
          : '/api/envios/nacional';

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('jwtToken')}`
          },
          body: JSON.stringify({ pedido_id: sale.id })
        });

        if (!res.ok) {
          let err = 'No se pudo generar el PDF';
          try { const e = await res.json(); if (e && e.error) err = e.error; } catch (_) {}
          showMessage('Error', err, 'error');
          return;
        }

        const blob = await res.blob();
        const cd = res.headers.get('Content-Disposition') || '';
        const m = /filename="([^\"]+)"/i.exec(cd);
        const fileName = m?.[1] || `envio_pedido_${sale.id}.pdf`;

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);

        showMessage('Descarga lista', `Se descargó ${fileName}`, 'success');
      } catch (e) {
        console.error('handleDownloadEnvio error', e);
        showMessage('Error', 'No se pudo generar el PDF', 'error');
      }
    };

    const fetchSales = async () => {
      const token = checkAuth();
      if (!token) return;

      loading.value = true;
      error.value = null;

      try {
        const params = new URLSearchParams();
        params.set('limit', String(perPage.value));
        params.set('page', String(currentPage.value));

        const url = `/api/ventas/pedidos?${params.toString()}`;

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Error al cargar las ventas');
        }

        const data = await response.json();
        sales.value = data.data || [];
        total.value = data.total || 0;
        currentPage.value = data.page || currentPage.value;
        perPage.value = data.perPage || perPage.value;
        totalPages.value = data.totalPages || Math.max(1, Math.ceil((data.total || 0) / perPage.value));

      } catch (err) {
        error.value = `Error: ${err.message}`;
        console.error('Error al obtener ventas:', err);
      } finally {
        loading.value = false;
      }
    };

    const formatDate = (dateString) => {
      if (!dateString) return 'N/A';
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    const formatCurrency = (amount) => {
      if (!amount) return '0.00';
      return parseFloat(amount).toFixed(2);
    };

    const istallaYaSeleccionada = (producto, tallaId, tallaIndexActual) => {
      return producto.tallas.some((talla, index) => 
        index !== tallaIndexActual && 
        parseInt(talla.id_talla) === parseInt(tallaId) &&
        talla.id_talla !== ''
      );
    };

    const getStatusClass = (status) => {
      switch (status?.toLowerCase()) {
        case 'completado':
        case 'entregado':
          return 'status-completed';
        case 'pendiente':
        case 'en bodega':
          return 'status-pending';
        case 'cancelado':
          return 'status-cancelled';
        case 'procesando':
        case 'empacado':
        case 'en ruta':
          return 'status-processing';
        default:
          return 'status-default';
      }
    };

    // Pagination helpers
    const displayedPageNumbers = computed(() => {
      const maxVisibleButtons = isMobile.value ? 3 : 5;
      const tp = totalPages.value || 1;

      if (tp <= maxVisibleButtons) {
        return Array.from({ length: tp }, (_, i) => i + 1);
      }

      let start = Math.max(1, currentPage.value - Math.floor(maxVisibleButtons / 2));
      const end = Math.min(tp, start + maxVisibleButtons - 1);

      if (end === tp) {
        start = Math.max(1, tp - maxVisibleButtons + 1);
      }

      return Array.from({ length: end - start + 1 }, (_, i) => start + i);
    });

    const previousPage = () => {
      if (currentPage.value > 1) currentPage.value--;
    };

    const nextPage = () => {
      if (currentPage.value < totalPages.value) currentPage.value++;
    };

    const viewSaleDetails = async (sale) => {
      try {
        selectedSale.value = sale;
        showDetailsModal.value = true;
        loadingDetails.value = true;
        saleProducts.value = [];
        
        console.log('Cargando detalles del pedido:', sale.id);
        
        const token = localStorage.getItem('jwtToken');
        
        const response = await fetch(`/api/ventas/pedidos/${sale.id}/productos`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Productos del pedido cargados:', data);
        
        saleProducts.value = data.productos || [];
        loadingDetails.value = false;
        
      } catch (error) {
        console.error('Error al cargar detalles del pedido:', error);
        loadingDetails.value = false;
        showMessage('Error al cargar los detalles del pedido', 'error');
      }
    };

    const handleViewDetails = (sale) => {
      viewSaleDetails(sale);
    };

    const calculateProductsSubtotal = () => {
      return saleProducts.value.reduce((total, product) => {
        return total + (product.subtotal || 0);
      }, 0);
    };

    const applyFilters = () => {
      showMessage('Filtros aplicados', 'Los filtros se han aplicado correctamente', 'success');
    };

    const resetFilters = () => {
      filters.value = {
        date: '',
        client: '',
        status: ''
      };
      showMessage('Filtros restablecidos', 'Todos los filtros han sido restablecidos', 'info');
    };

    const handleSaleSelection = (sale) => {
      selectedSale.value = sale;
    };

    const handleStatusUpdate = async ({ pedido_id, nuevo_estado }) => {
      try {
        const token = checkAuth();
        if (!token) return;

        console.log('Actualizando estado:', { pedido_id, nuevo_estado });

        const response = await fetch(`/api/ventas/pedidos/${pedido_id}/estado`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ estado: nuevo_estado })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al actualizar estado');
        }

        const data = await response.json();
        console.log('Respuesta del servidor:', data);

        if (data.success) {
          showMessage('Estado Actualizado', 
            `El pedido #${pedido_id} ahora está en estado: ${nuevo_estado}`, 
            'success'
          );
          
          // Si el estado cambió a Despachado, recargar la lista para que desaparezca de Gestión de Ventas
          if (nuevo_estado.toLowerCase() === 'despachado') {
            setTimeout(() => {
              fetchSales(); // Recargar lista de ventas pendientes
            }, 1000);
          } else {
            // Para otros estados, actualizar localmente
            const saleToUpdate = sales.value.find(sale => sale.id === pedido_id);
            if (saleToUpdate) {
              saleToUpdate.estado_pedido = nuevo_estado;
            }
          }
        }

      } catch (err) {
        console.error('Error al actualizar estado:', err);
        showMessage('Error al Actualizar', 
          `No se pudo actualizar el estado: ${err.message}`, 
          'error'
        );
        
        await fetchSales();
      }
    };

    const filteredSales = computed(() => {
      // Solo mostrar ventas PENDIENTES en la gestión de ventas
      let result = sales.value.filter(sale => {
        const estado = (sale.estado_pedido || '').toLowerCase();
        return estado === 'pendiente';
      });

      if (filters.value.date) {
        result = result.filter(sale => {
          const saleDate = new Date(sale.fecha).toISOString().split('T')[0];
          return saleDate === filters.value.date;
        });
      }

      if (filters.value.client) {
        const clientQuery = filters.value.client.toLowerCase();
        result = result.filter(sale => 
          sale.cliente_nombre?.toLowerCase().includes(clientQuery)
        );
      }

      return result;
    });

    onMounted(async () => {
      await fetchVendedorActual();
      checkScreenSize();
      window.addEventListener('resize', checkScreenSize);
      await fetchSales();
      fetchEstadosPedidos();
    });

    watch([currentPage, perPage], () => {
      fetchSales();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    const historialRef = ref(null);
    
    // Watcher para recargar el historial cuando se cambia a esa pestaña
    watch(activeTab, (newTab) => {
      if (newTab === 'historial' && historialRef.value) {
        // Recargar el historial cuando se activa la pestaña
        setTimeout(() => {
          if (historialRef.value && typeof historialRef.value.cargarFacturas === 'function') {
            historialRef.value.cargarFacturas();
          }
        }, 100);
      }
    });

    return {
      // pagination
      currentPage,
      perPage,
      total,
      totalPages,
      isMobile,
      // pagination helpers
      displayedPageNumbers,
      previousPage,
      nextPage,
      sales,
      loading,
      error,
      selectedSale,
      showDetailsModal,
      showAddSaleModal,
      showMessageModal,
      messageTitle,
      messageContent,
      messageType,
      creatingPedido,
      filters,
      newSale,
      clientes,
      zapatosDisponibles,
      // REMOVIDO: metodosPago,
      estadosPedidos,
      filteredSales,
      istallaYaSeleccionada,
      historialRef,
      fetchEstadosPedidos,
      activeTab,
      clienteSearchTerm,
      showClienteDropdown,
      clienteSeleccionado,
      clientesFiltrados,
      calculatedTotal,
      isValidForm,
      tiposLineaProducto,
      vendedorActual,
      showMessage,
      hideMessage,
      fetchSales,
      addSale,
      openAddSaleModal,
      viewSaleDetails,
      applyFilters,
      resetFilters,
      handleSaleSelection,
      handleStatusUpdate,
      agregarProducto,
      eliminarProducto,
      getTallasDisponiblesParaProducto,
      getMaxStockForTalla,
      onZapatoChange,
      onTallaChange,
      updateTotal,
      agregarTalla,
      eliminarTalla,
      calcularSubtotalProducto,
      formatDate,
      formatCurrency,
      formatPrice,
      getStatusClass,
      handleFacturaSeleccionada,
      handleVerDetalles,
      handleDescargarFactura,
      buscarClientes,
      seleccionarCliente,
      limpiarClienteSeleccionado,
      abrirModalNuevoCliente,
      cerrarDropdownCliente,
      showEnvioDialog,
      lastPedidoId,
      lastTipoLinea,
      downloadingEnvio,
      descargarEnvio,
      handleDownloadEnvio,
      saleProducts,          
      loadingDetails, 
      viewSaleDetails,       
      handleViewDetails,      
      calculateProductsSubtotal,
    };
  }
}
</script>

<style scoped src="../styles/salesManagment.css">
</style>