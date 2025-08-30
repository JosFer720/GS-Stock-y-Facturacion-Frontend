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
          Historial de Facturas
        </button>
      </div>

      <div v-show="activeTab === 'ventas'" class="tab-content">
        <div class="actions-section">
          <button class="action-button add-button" @click="openAddSaleModal">
            Agregar Venta
          </button>
          <button class="action-button view-button" @click="viewSaleDetails" :disabled="!selectedSale">
            Ver Detalles
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
        />
      </div>

      <div v-show="activeTab === 'historial'" class="tab-content">
        <historial-facturas 
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
          
          <!-- NUEVA SECCIÓN: Información del Vendedor Automática -->
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

          <div class="form-group">
            <label for="id_metodo_de_pago">Método de Pago:</label>
            <select id="id_metodo_de_pago" v-model="newSale.id_metodo_de_pago" required>
              <option value="">Seleccione un método</option>
              <option v-for="metodo in metodosPago" :key="metodo.id" :value="metodo.id">
                {{ metodo.tipo }} - {{ metodo.detalle }}
              </option>
            </select>
          </div>

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

          <!-- CAMBIO: Solo mostrar total, no subtotal -->
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
            <h3>Totales</h3>
            <p><strong>Total:</strong> Q{{ formatCurrency(selectedSale.total) }}</p>
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
import { ref, computed, onMounted } from 'vue';
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
    const metodosPago = ref([])
    const showEnvioDialog = ref(false);
    const lastPedidoId = ref(null);
    const lastTipoLinea = ref('');
    const downloadingEnvio = ref(false);;
    const estadosPedidos = ref([]);
    const clientes = ref([]);
    const zapatosDisponibles = ref([]);
    const clienteSearchTerm = ref('');
    const showClienteDropdown = ref(false);
    const clienteSeleccionado = ref(null);
    const clientesFiltrados = ref([]);
    const searchTimeout = ref(null);
    const tiposLineaProducto = ref([]);
    const vendedorActual = ref(null); // NUEVO
    
    const filters = ref({
      date: '',
      client: '',
      status: ''
    });

    // CAMBIO: Eliminamos id_vendedor del newSale
    const newSale = ref({
      id_cliente: '',
      id_tipo_linea_producto: '', // NUEVO campo obligatorio
      id_metodo_de_pago: '',
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

    // NUEVO: Obtener información del vendedor actual
    const fetchVendedorActual = async () => {
      try {
        const token = checkAuth();
        if (!token) return;

        const response = await fetch('http://localhost:3000/api/ventas/vendedor-actual', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Error al obtener vendedor actual');
        
        const result = await response.json();
        if (result.success) {
          vendedorActual.value = result.data;
          
          // CAMBIO: Permitir tanto Vendedor como Administrador
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

        const response = await fetch('http://localhost:3000/api/ventas/tipos-linea-producto', {
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
        
        const response = await fetch('http://localhost:3000/api/ventas/clientes', {
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
        
        const response = await fetch('http://localhost:3000/api/inventory', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Error al obtener zapatos');
        
        const data = await response.json();
        zapatosDisponibles.value = data.data || [];
      } catch (err) {
        console.error('Error al obtener zapatos:', err);
      }
    };
    
    const fetchMetodosPago = async () => {
      try {
        const token = checkAuth();
        if (!token) return;
        
        const response = await fetch('http://localhost:3000/api/ventas/metodos-pago', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Error al obtener métodos de pago');
        
        const data = await response.json();
        metodosPago.value = data.data || [];
      } catch (err) {
        console.error('Error al obtener métodos de pago:', err);
      }
    };

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
        
        const response = await fetch('http://localhost:3000/api/ventas/estados-pedidos', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Error al obtener estados de pedidos');
        
        const data = await response.json();
        estadosPedidos.value = data.data || [];
      } catch (err) {
        console.error('Error al obtener estados de pedidos:', err);
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

    // CAMBIO: Solo calculamos total, no subtotal
    const calculatedTotal = computed(() => {
      return newSale.value.productos.reduce((total, producto) => {
        return total + calcularSubtotalProducto(producto);
      }, 0);
    });

    const updateTotal = () => {
      // Función para forzar la reactividad
    };

    const isValidForm = computed(() => {
      // Validar datos básicos
      if (!newSale.value.id_cliente) return false;
      if (!newSale.value.id_tipo_linea_producto) return false; // NUEVO campo requerido
      if (!newSale.value.id_metodo_de_pago) return false;
      
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
        fetchMetodosPago(),
        fetchTiposLineaProducto(),
        fetchEstadosPedidos()
      ]);

      // CAMBIO: Ya no incluimos id_vendedor
      newSale.value = {
        id_cliente: '',
        id_tipo_linea_producto: '',
        id_metodo_de_pago: '',
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

        // FIXED: Transform the productos data structure correctly
        const productosParaEnviar = [];
        
        newSale.value.productos.forEach((producto, pIndex) => {
          // Each talla becomes a separate product entry
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

        // FIXED: Data structure that matches backend expectations
        const pedidoData = {
          id_cliente: parseInt(newSale.value.id_cliente),
          id_tipo_linea_producto: parseInt(newSale.value.id_tipo_linea_producto),
          id_metodo_de_pago: parseInt(newSale.value.id_metodo_de_pago),
          productos: productosParaEnviar
        };

        console.log('Sending pedido data:', pedidoData); // Debug log

        const response = await fetch('http://localhost:3000/api/ventas/pedidos', {
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

        // Success message with updated structure
        showMessage('Pedido Creado Exitosamente');

        // Ofrecer descarga de envío si aplica
        lastPedidoId.value = data.data.pedido.id;
        lastTipoLinea.value = data.data.resumen.tipo_linea;
        if (lastTipoLinea.value === 'Linea Nacional' || lastTipoLinea.value === 'Linea Importadora') {
          showEnvioDialog.value = true;
        }

        // Close modal and refresh
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
          ? 'http://localhost:3000/api/envios/nacional'
          : 'http://localhost:3000/api/envios/importadora';

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


    const fetchSales = async () => {
      const token = checkAuth();
      if (!token) return;
      
      loading.value = true;
      error.value = null;
      
      try {
        const response = await fetch('http://localhost:3000/api/ventas/pedidos', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Error al cargar las ventas');
        }
        
        const data = await response.json();
        sales.value = data.data || [];
        
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

    const viewSaleDetails = () => {
      if (!selectedSale.value) {
        showMessage('Error', 'No hay ninguna venta seleccionada', 'error');
        return;
      }
      showDetailsModal.value = true;
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
        const response = await fetch(`http://localhost:3000/api/ventas/pedidos/${pedido_id}/estado`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ estado: nuevo_estado })
        });

        if (!response.ok) {
          throw new Error('Error al actualizar estado');
        }

        sales.value = sales.value.map(sale => {
          if (sale.id === pedido_id) {
            return { ...sale, estado_pedido: nuevo_estado };
          }
          return sale;
        });

        showMessage('Éxito', 'Estado actualizado correctamente', 'success');
      } catch (err) {
        showMessage('Error', err.message, 'error');
        await fetchSales();
      }
    };

    const filteredSales = computed(() => {
      let result = sales.value;

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
      await fetchVendedorActual(); // NUEVO: Cargar vendedor actual al montar
      fetchSales();
      fetchEstadosPedidos();
    });

    return {
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
      metodosPago,
      estadosPedidos,
      filteredSales,
      istallaYaSeleccionada,
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
      descargarEnvio
    };;
  }
}
</script>

<style scoped>
/* Base Styles */
.sales-management-container {
  width: 100%;
  min-height: 100vh;
  box-sizing: border-box;
  overflow-x: hidden;
}

/* Content Section */
.content-section {
  padding: 15px;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  margin-top: 60px;
}

.page-title {
  font-size: clamp(20px, 4vw, 24px);
  font-weight: bold;
  margin-bottom: 20px;
  text-align: center;
  color: #333;
  width: 100%;
  word-wrap: break-word;
}

/* Tabs Navigation */
.tabs-navigation {
  display: flex;
  background-color: #f8f9fa;
  border-radius: 8px;
  padding: 4px;
  margin-bottom: 30px;
  width: 100%;
  max-width: min(600px, 100vw - 30px);
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  box-sizing: border-box;
}

.tab-button {
  flex: 1;
  padding: 12px 8px;
  border: none;
  background-color: transparent;
  color: #6c757d;
  font-weight: 500;
  font-size: clamp(12px, 3vw, 14px);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.tab-button:hover {
  background-color: #e9ecef;
  color: #495057;
}

.tab-button.active {
  background-color: #007bff;
  color: white;
  box-shadow: 0 2px 4px rgba(0, 123, 255, 0.3);
}

.tab-content {
  width: 100%;
  max-width: min(1200px, 100vw - 30px);
  animation: fadeIn 0.3s ease-in-out;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Actions Section */
.actions-section {
  margin: 20px 0;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: min(800px, 100vw - 30px);
  gap: 10px;
  box-sizing: border-box;
}

.action-button {
  padding: 12px 16px;
  border: 2px solid #007bff;
  border-radius: 6px;
  background-color: white;
  color: #007bff;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: clamp(14px, 3vw, 16px);
  font-weight: 500;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
  box-sizing: border-box;
}

.action-button:hover:not(:disabled) {
  background-color: #007bff;
  color: white;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 123, 255, 0.3);
}

.action-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.add-button {
  border-color: #28a745;
  color: #28a745;
}

.add-button:hover:not(:disabled) {
  background-color: #28a745;
  color: white;
}

/* Filter Section */
.filter-section {
  margin-bottom: 20px;
  width: 100%;
  max-width: min(800px, 100vw - 30px);
  display: flex;
  flex-direction: column;
  gap: 15px;
  padding: 20px;
  background-color: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #dee2e6;
  box-sizing: border-box;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}

.filter-group label {
  font-weight: 600;
  color: #495057;
  font-size: clamp(12px, 3vw, 14px);
  word-wrap: break-word;
}

.filter-group input {
  padding: 12px;
  border: 2px solid #e9ecef;
  border-radius: 6px;
  font-size: clamp(12px, 3vw, 14px);
  transition: border-color 0.2s ease;
  background-color: white;
  width: 100%;
  box-sizing: border-box;
}

.filter-group input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

.filter-buttons {
  display: flex;
  gap: 10px;
  margin-top: 10px;
  flex-direction: column;
  width: 100%;
}

.filter-button {
  padding: 12px 16px;
  border: none;
  border-radius: 6px;
  background-color: #007bff;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: clamp(12px, 3vw, 14px);
  font-weight: 500;
  width: 100%;
}

.filter-button:hover {
  background-color: #0056b3;
  transform: translateY(-1px);
}

.filter-button.reset {
  background-color: #6c757d;
}

.filter-button.reset:hover {
  background-color: #5a6268;
}

/* List Title */
.list-title {
  margin: 20px 0;
  font-size: clamp(18px, 4vw, 20px);
  font-weight: bold;
  text-align: center;
  width: 100%;
  color: #333;
  word-wrap: break-word;
}

/* Loading and Error States */
.loading-indicator {
  text-align: center;
  padding: 30px 15px;
  font-style: italic;
  color: #666;
  font-size: clamp(14px, 3vw, 16px);
  width: 100%;
}

.error-message {
  text-align: center;
  padding: 20px;
  color: #dc3545;
  font-weight: bold;
  border: 2px solid #dc3545;
  border-radius: 6px;
  background-color: #f8d7da;
  margin: 15px 0;
  width: 100%;
  max-width: min(600px, 100vw - 30px);
  box-sizing: border-box;
  font-size: clamp(12px, 3vw, 14px);
}

/* Modal Styles */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  z-index: 1000;
  padding: 10px;
  box-sizing: border-box;
  overflow-y: auto;
  padding-top: 20px;
}

.modal-content {
  background: white;
  padding: clamp(15px, 4vw, 25px);
  border-radius: 8px;
  width: 100%;
  max-width: min(800px, 100vw - 20px);
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  box-sizing: border-box;
  -webkit-overflow-scrolling: touch;
}

.details-modal {
  max-width: min(900px, 100vw - 20px);
}

.modal-content h2 {
  margin-top: 0;
  margin-bottom: 20px;
  color: #333;
  border-bottom: 2px solid #f0f0f0;
  padding-bottom: 10px;
  font-size: clamp(18px, 4vw, 22px);
  word-wrap: break-word;
}

.close {
  float: right;
  font-size: clamp(20px, 4vw, 28px);
  cursor: pointer;
  padding: 5px;
  line-height: 0.8;
  color: #666;
  margin-top: -10px;
}

.close:hover {
  color: #333;
}

/* Vendedor Section */
.vendedor-section {
  margin: 20px 0;
  padding: clamp(12px, 3vw, 20px);
  border: 2px solid #28a745;
  border-radius: 8px;
  background-color: #f8fff8;
  width: 100%;
  box-sizing: border-box;
}

.vendedor-section h3 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #28a745;
  font-size: clamp(16px, 4vw, 18px);
  border-bottom: 2px solid #dee2e6;
  padding-bottom: 8px;
}

.vendedor-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.vendedor-badge {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 15px;
  background-color: #28a745;
  color: white;
  border-radius: 6px;
  font-weight: bold;
  flex-wrap: wrap;
}

.vendedor-nombre {
  font-size: clamp(14px, 3vw, 16px);
}

.vendedor-rol {
  background-color: rgba(255,255,255,0.2);
  padding: 4px 8px;
  border-radius: 12px;
  font-size: clamp(11px, 3vw, 12px);
  font-weight: 600;
}

.vendedor-usuario {
  color: #6c757d;
  font-style: italic;
  padding-left: 15px;
  font-size: clamp(11px, 3vw, 13px);
}

/* Cliente Section */
.cliente-section {
  margin: 20px 0;
  padding: clamp(15px, 4vw, 25px);
  border: 2px solid #007bff;
  border-radius: 8px;
  background-color: #f8f9ff;
  width: 100%;
  box-sizing: border-box;
}

.cliente-section h3 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #007bff;
  font-size: clamp(16px, 4vw, 18px);
  border-bottom: 2px solid #dee2e6;
  padding-bottom: 8px;
}

.cliente-search-container {
  position: relative;
  width: 100%;
}

.cliente-search-input {
  width: 100%;
  padding: 12px 15px;
  border: 2px solid #e9ecef;
  border-radius: 6px;
  font-size: clamp(14px, 3vw, 16px);
  transition: border-color 0.3s ease;
  box-sizing: border-box;
}

.cliente-search-input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

.cliente-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  max-height: 250px;
  overflow-y: auto;
  background-color: white;
  border: 2px solid #e9ecef;
  border-top: none;
  border-radius: 0 0 6px 6px;
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  z-index: 1000;
  -webkit-overflow-scrolling: touch;
}

.cliente-option {
  padding: 12px 15px;
  cursor: pointer;
  border-bottom: 1px solid #f8f9fa;
  transition: background-color 0.2s ease;
  word-break: break-word;
}

.cliente-option:hover {
  background-color: #f8f9fa;
}

.cliente-option:last-child {
  border-bottom: none;
}

.cliente-info {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 4px;
  flex-wrap: wrap;
}

.cliente-info strong {
  color: #2c3e50;
  font-size: clamp(12px, 3vw, 14px);
}

.empresa-tag {
  background-color: #17a2b8;
  color: white;
  padding: 2px 6px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 500;
}

.cliente-detalles small {
  color: #6c757d;
  font-size: clamp(11px, 3vw, 12px);
}

.no-cliente-found {
  padding: 15px;
  text-align: center;
  color: #6c757d;
  font-style: italic;
  font-size: clamp(12px, 3vw, 14px);
}

.btn-link {
  background: none;
  border: none;
  color: #007bff;
  text-decoration: underline;
  cursor: pointer;
  font-size: inherit;
}

.btn-link:hover {
  color: #0056b3;
}

.cliente-seleccionado {
  margin-top: 20px;
  padding: 15px;
  background-color: #e8f5e8;
  border: 1px solid #28a745;
  border-radius: 6px;
  width: 100%;
  box-sizing: border-box;
}

.cliente-seleccionado h4 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #28a745;
  font-size: clamp(14px, 3vw, 16px);
}

.cliente-details-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  margin-bottom: 15px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-item label {
  font-weight: 600;
  color: #495057;
  font-size: clamp(11px, 3vw, 13px);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.detail-item span {
  color: #2c3e50;
  font-size: clamp(12px, 3vw, 14px);
  padding: 6px 8px;
  background-color: white;
  border-radius: 4px;
  border: 1px solid #dee2e6;
  word-break: break-word;
}

.btn-limpiar-cliente {
  background-color: #6c757d;
  color: white;
  border: none;
  padding: 10px 15px;
  border-radius: 4px;
  cursor: pointer;
  font-size: clamp(12px, 3vw, 13px);
  transition: background-color 0.2s;
  width: 100%;
}

.btn-limpiar-cliente:hover {
  background-color: #5a6268;
}

/* Form Group Styles */
.form-group {
  margin-bottom: 20px;
  text-align: left;
  width: 100%;
  box-sizing: border-box;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 600;
  color: #495057;
  font-size: clamp(12px, 3vw, 14px);
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 12px;
  border: 2px solid #e9ecef;
  border-radius: 6px;
  font-size: clamp(14px, 3vw, 16px);
  box-sizing: border-box;
  transition: border-color 0.2s ease;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

/* Products Section */
.productos-section {
  margin: 25px 0;
  padding: clamp(15px, 4vw, 25px);
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  background-color: #f9f9f9;
  width: 100%;
  box-sizing: border-box;
}

.productos-section > label {
  display: block;
  margin-bottom: 20px;
  font-weight: bold;
  color: #333;
  font-size: clamp(14px, 3vw, 16px);
}

.producto-item {
  margin-bottom: 25px;
  padding: clamp(15px, 4vw, 20px);
  border: 2px solid #dee2e6;
  border-radius: 8px;
  background-color: white;
  position: relative;
  width: 100%;
  box-sizing: border-box;
}

.producto-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #dee2e6;
}

.producto-header h4 {
  margin: 0;
  color: #495057;
  font-size: clamp(14px, 3vw, 16px);
}

.remove-product-button-header {
  background-color: #dc3545;
  color: white;
  border: none;
  width: clamp(28px, 8vw, 35px);
  height: clamp(28px, 8vw, 35px);
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: clamp(12px, 3vw, 16px);
  flex-shrink: 0;
}

.remove-product-button-header:hover {
  background-color: #c82333;
}

.zapato-selection {
  margin-bottom: 20px;
  width: 100%;
}

.zapato-selection label {
  display: block;
  font-weight: bold;
  color: #555;
  font-size: clamp(12px, 3vw, 14px);
  margin-bottom: 6px;
}

.zapato-select {
  width: 100%;
  padding: 10px;
  border: 2px solid #e9ecef;
  border-radius: 6px;
  font-size: clamp(12px, 3vw, 14px);
  box-sizing: border-box;
}

/* Tallas Section */
.tallas-section {
  margin-top: 20px;
  padding: 15px;
  background-color: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #dee2e6;
  width: 100%;
  box-sizing: border-box;
}

.tallas-label {
  display: block;
  font-weight: bold;
  color: #495057;
  font-size: clamp(13px, 3vw, 15px);
  margin-bottom: 15px;
}

.tallas-grid {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.talla-item {
  padding: 15px;
  background-color: white;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  width: 100%;
  box-sizing: border-box;
}

.talla-row {
  display: grid;
  grid-template-columns: 1fr;
  gap: 15px;
  align-items: end;
  width: 100%;
}

.talla-selector,
.cantidad-input-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}

.talla-selector label,
.cantidad-input-group label {
  font-weight: 600;
  color: #555;
  font-size: clamp(11px, 3vw, 13px);
}

.talla-select,
.cantidad-input {
  padding: 10px;
  border: 2px solid #e9ecef;
  border-radius: 6px;
  font-size: clamp(12px, 3vw, 14px);
  box-sizing: border-box;
  width: 100%;
}

.talla-select option.talla-agotada {
  color: #dc3545;
  font-style: italic;
}

.talla-repetida {
  color: #dc3545 !important;
  font-style: italic;
}

.stock-info-container {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 10px;
  width: 100%;
}

.stock-info-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background-color: #e3f2fd;
  border: 1px solid #2196f3;
  border-radius: 8px;
  text-align: center;
}

.stock-label {
  font-size: clamp(10px, 3vw, 11px);
  color: #1565c0;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stock-number {
  font-size: clamp(12px, 3vw, 14px);
  font-weight: bold;
  color: #1976d2;
}

.remove-talla-button {
  background-color: #dc3545;
  color: white;
  border: none;
  width: 100%;
  padding: 10px;
  margin-top: 10px;
  border-radius: 6px;
  cursor: pointer;
  font-size: clamp(11px, 3vw, 12px);
}

.remove-talla-button:hover {
  background-color: #c82333;
}

.stock-error {
  color: #dc3545;
  font-size: clamp(11px, 3vw, 12px);
  margin-top: 8px;
  padding: 8px;
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
}

.add-talla-button {
  background-color: #17a2b8;
  color: white;
  padding: 10px 15px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: clamp(12px, 3vw, 13px);
  margin-top: 15px;
  width: 100%;
}

.add-talla-button:hover {
  background-color: #138496;
}

/* Precio Section */
.precio-section {
  margin-top: 15px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.precio-section label {
  font-weight: bold;
  color: #555;
  font-size: clamp(12px, 3vw, 14px);
}

.precio-display {
  font-size: clamp(16px, 4vw, 18px);
  font-weight: bold;
  color: #28a745;
  padding: 10px 15px;
  background-color: #e8f5e8;
  border-radius: 6px;
  text-align: center;
}

.subtotal-producto {
  margin-top: 15px;
  text-align: center;
  color: #495057;
  font-size: clamp(14px, 3vw, 16px);
  padding: 12px;
  background-color: #f8f9fa;
  border-radius: 6px;
}

.add-product-button {
  background-color: #28a745;
  color: white;
  padding: 12px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: clamp(14px, 3vw, 16px);
  margin-top: 20px;
  width: 100%;
}

.add-product-button:hover {
  background-color: #218838;
}

/* Totales Section */
.totales-section {
  background-color: #e9ecef;
  padding: 20px;
  border-radius: 8px;
  margin: 25px 0;
  width: 100%;
  box-sizing: border-box;
}

.totales-display {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.total-final {
  font-size: clamp(18px, 4vw, 22px);
  color: #28a745;
  background-color: white;
  padding: 15px 25px;
  border-radius: 8px;
  border: 2px solid #28a745;
  box-shadow: 0 2px 4px rgba(40,167,69,0.2);
  text-align: center;
  width: 100%;
  box-sizing: border-box;
}

/* Modal Actions */
.modal-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 25px;
  width: 100%;
}

.submit-button,
.cancel-button {
  padding: 14px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: clamp(14px, 3vw, 16px);
  font-weight: 600;
  transition: all 0.3s ease;
  width: 100%;
}

.submit-button {
  background-color: #28a745;
  color: white;
}

.submit-button:hover:not(:disabled) {
  background-color: #218838;
  transform: translateY(-1px);
}

.submit-button:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
  transform: none;
}

.cancel-button {
  background-color: #6c757d;
  color: white;
}

.cancel-button:hover {
  background-color: #5a6268;
}

/* Sale Details */
.sale-details {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.detail-section {
  padding: 15px;
  background-color: #f8f9fa;
  border-radius: 6px;
  border-left: 4px solid #007bff;
}

.detail-section h3 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #007bff;
  font-size: clamp(14px, 3vw, 16px);
}

.detail-section p {
  margin: 8px 0;
  font-size: clamp(12px, 3vw, 14px);
  line-height: 1.5;
  word-wrap: break-word;
}

.detail-section strong {
  color: #495057;
  font-weight: 600;
}

/* Utility Classes */
.btn-secondary {
  background-color: #6c757d;
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: clamp(12px, 3vw, 14px);
}

.btn-secondary:hover {
  background-color: #5a6268;
}

.btn-primary {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: clamp(12px, 3vw, 14px);
}

.btn-primary:hover:not(:disabled) {
  background-color: #0056b3;
}

.btn-primary:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

/* Status Styles */
.status-completed {
  background-color: #4caf50;
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
}

.status-pending {
  background-color: #ff9800;
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
}

.status-cancelled {
  background-color: #f44336;
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
}

.status-processing {
  background-color: #2196f3;
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
}

.status-default {
  background-color: #9e9e9e;
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
}

/* Responsive Breakpoints */

/* Mobile Devices - up to 768px */
@media (max-width: 768px) {
  .content-section {
    padding: 10px;
    margin-top: 50px;
  }
  
  .tabs-navigation {
    flex-direction: column;
    gap: 4px;
    max-width: 100%;
  }
  
  .tab-button {
    width: 100%;
    padding: 14px 16px;
  }
  
  .actions-section {
    gap: 8px;
  }
  
  .filter-section {
    padding: 15px;
  }
  
  .filter-buttons {
    gap: 8px;
  }
  
  .modal {
    padding: 5px;
    align-items: flex-start;
    padding-top: 10px;
  }
  
  .modal-content {
    max-height: 95vh;
    padding: 15px;
  }
  
  .vendedor-badge {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }
  
  .cliente-details-grid {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  
  .talla-row {
    gap: 10px;
  }
  
  .stock-info-container {
    justify-content: flex-start;
  }
  
  .precio-section {
    align-items: stretch;
  }
  
  .sale-details {
    gap: 15px;
  }
  
  .detail-section {
    padding: 12px;
  }
}

/* Small Mobile - up to 480px */
@media (max-width: 480px) {
  .content-section {
    padding: 8px;
  }
  
  .modal {
    padding: 5px;
  }
  
  .modal-content {
    padding: 12px;
  }
  
  .cliente-dropdown {
    max-height: 200px;
  }
  
  .vendedor-section,
  .cliente-section,
  .productos-section {
    padding: 12px;
  }
  
  .producto-item {
    padding: 12px;
  }
  
  .tallas-section {
    padding: 12px;
  }
  
  .talla-item {
    padding: 12px;
  }
}

/* Tablet - 768px to 1024px */
@media (min-width: 768px) and (max-width: 1024px) {
  .actions-section {
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
    gap: 15px;
  }
  
  .action-button {
    flex: 1;
    min-width: 150px;
    max-width: 200px;
  }
  
  .filter-section {
    padding: 20px;
  }
  
  .filter-buttons {
    flex-direction: row;
    justify-content: center;
  }
  
  .filter-button {
    flex: 1;
    max-width: 150px;
  }
  
  .cliente-details-grid {
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  
  .talla-row {
    grid-template-columns: 1fr 1fr;
    gap: 15px;
  }
  
  .remove-talla-button {
    grid-column: span 2;
    margin-top: 10px;
  }
  
  .modal-actions {
    flex-direction: row;
    justify-content: center;
    gap: 15px;
  }
  
  .submit-button,
  .cancel-button {
    flex: 1;
    max-width: 200px;
  }
  
  .sale-details {
    flex-direction: row;
    gap: 25px;
  }
  
  .detail-section {
    flex: 1;
  }
}

/* Desktop - 1024px and up */
@media (min-width: 1024px) {
  .content-section {
    max-width: 1400px;
    margin-left: auto;
    margin-right: auto;
    margin-top: 80px;
  }
  
  .actions-section {
    flex-direction: row;
    justify-content: space-between;
    max-width: 800px;
    margin-left: auto;
    margin-right: auto;
  }
  
  .action-button {
    min-width: 150px;
    width: auto;
  }
  
  .filter-section {
    flex-direction: row;
    align-items: flex-end;
    gap: 20px;
  }
  
  .filter-group {
    flex: 1;
    min-width: 200px;
  }
  
  .filter-buttons {
    flex-direction: row;
    margin-top: 0;
    align-items: flex-end;
    flex: 0 0 auto;
  }
  
  .filter-button {
    min-width: 120px;
    width: auto;
  }
  
  .cliente-details-grid {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 15px;
  }
  
  .talla-row {
    grid-template-columns: 2fr 1fr 1fr auto;
    gap: 20px;
  }
  
  .remove-talla-button {
    width: 35px;
    height: 35px;
    border-radius: 50%;
    margin-top: 0;
    padding: 0;
  }
  
  .stock-info-container {
    justify-content: center;
    margin-top: 0;
  }
}

/* Touch Device Optimizations */
@media (hover: none) and (pointer: coarse) {
  .tab-button, 
  .action-button, 
  .filter-button,
  .cliente-option,
  .remove-product-button-header,
  .remove-talla-button,
  .add-talla-button,
  .add-product-button,
  .submit-button,
  .cancel-button,
  .btn-limpiar-cliente {
    min-height: 44px;
    padding-top: 12px;
    padding-bottom: 12px;
  }
  
  /* Prevent zoom on iOS */
  input, select, textarea {
    font-size: 16px !important;
  }
}

/* Landscape Mobile */
@media (max-width: 768px) and (orientation: landscape) {
  .modal {
    align-items: flex-start;
    padding-top: 10px;
  }
  
  .modal-content {
    max-height: 90vh;
  }
  
  .cliente-dropdown {
    max-height: 120px;
  }
}

/* High Contrast Mode */
@media (prefers-contrast: high) {
  .tab-button.active,
  .action-button:focus,
  .filter-button:focus {
    outline: 2px solid #000;
  }
}

/* Reduced Motion */
@media (prefers-reduced-motion: reduce) {
  .tab-button,
  .action-button,
  .filter-button,
  .cliente-option {
    transition: none;
  }
  
  .tab-content {
    animation: none;
  }
}

/* Print Styles */
@media print {
  .modal,
  .tabs-navigation,
  .actions-section,
  .filter-section {
    display: none;
  }
  
  .content-section {
    margin-top: 0;
    padding: 0;
  }
}

/* Scrolling Improvements */
.modal {
  -webkit-overflow-scrolling: touch;
}

.cliente-dropdown {
  -webkit-overflow-scrolling: touch;
}

/* Text Overflow Prevention */
.tab-button,
.action-button,
.filter-button {
  word-wrap: break-word;
}

/* Form Element Safety */
input, select, textarea {
  max-width: 100%;
  box-sizing: border-box;
}

/* Additional Small Screen Safety */
@media (max-width: 320px) {
  .content-section {
    padding: 5px;
  }
  
  .modal-content {
    padding: 10px;
  }
  
  .vendedor-section,
  .cliente-section,
  .productos-section {
    padding: 10px;
  }
  
  .producto-item {
    padding: 8px;
  }
  
  .talla-item {
    padding: 8px;
  }
}
</style>