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
            <label for="id_vendedor">Vendedor:</label>
            <select id="id_vendedor" v-model="newSale.id_vendedor" required>
              <option value="">Seleccione un vendedor</option>
              <option v-for="vendedor in vendedores" :key="vendedor.id" :value="vendedor.id">
                {{ vendedor.nombre_completo }} - {{ vendedor.ruta }}
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
                        
                        <small v-if="tallaItem.id_talla" class="debug-info">
                          Talla seleccionada: {{ tallaItem.id_talla }}
                        </small>
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
                          @change="updateSubtotal"
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
              <div class="total-row">
                <strong>Subtotal: Q{{ formatPrice(calculatedSubtotal) }}</strong>
              </div>
              <div class="total-row">
                <strong>Total: Q{{ formatPrice(calculatedTotal) }}</strong>
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
          </div>
          <div class="detail-section">
            <h3>Totales</h3>
            <p><strong>Subtotal:</strong> Q{{ formatCurrency(selectedSale.subtotal) }}</p>
            <p><strong>Total:</strong> Q{{ formatCurrency(selectedSale.total) }}</p>
          </div>
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
    const vendedores = ref([]);
    const metodosPago = ref([]);
    const estadosPedidos = ref([]);
    const clientes = ref([]);
    const zapatosDisponibles = ref([]);
    const clienteSearchTerm = ref('');
    const showClienteDropdown = ref(false);
    const clienteSeleccionado = ref(null);
    const clientesFiltrados = ref([]);
    const searchTimeout = ref(null);
    
    const filters = ref({
      date: '',
      client: '',
      status: ''
    });

    const newSale = ref({
      id_cliente: '',
      id_vendedor: '',
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
      console.log('Seleccionando cliente:', cliente);
      clienteSeleccionado.value = cliente;
      
      newSale.value.id_cliente = parseInt(cliente.id);
      
      console.log('ID cliente guardado:', newSale.value.id_cliente);
      
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
        
        const response = await fetch('http://localhost:3000/api/clientes', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Error al obtener clientes');
        
        const data = await response.json();
        clientes.value = data.data || [];
        
        console.log('Clientes cargados:', clientes.value.length);
        
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

    const fetchVendedores = async () => {
      try {
        const token = checkAuth();
        if (!token) return;
        
        const response = await fetch('http://localhost:3000/api/ventas/vendedores', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Error al obtener vendedores');
        
        const data = await response.json();
        vendedores.value = data.data || [];
      } catch (err) {
        console.error('Error al obtener vendedores:', err);
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
      
      updateSubtotal();
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
        console.log('Estados cargados:', estadosPedidos.value);
      } catch (err) {
        console.error('Error al obtener estados de pedidos:', err);
      }
    };

    const onTallaChange = (productoIndex, tallaIndex) => {
      const tallaItem = newSale.value.productos[productoIndex].tallas[tallaIndex];
      tallaItem.error_stock = '';
      
      console.log('Talla seleccionada:', tallaItem.id_talla);
      
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
      
      updateSubtotal();
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
        updateSubtotal();
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

    const calculatedSubtotal = computed(() => {
      return newSale.value.productos.reduce((total, producto) => {
        return total + calcularSubtotalProducto(producto);
      }, 0);
    });

    const calculatedTotal = computed(() => {
      return calculatedSubtotal.value;
    });

    const updateSubtotal = () => {
    };

    const isValidForm = computed(() => {
      console.log('=== DEBUG VALIDACIÓN ===');
      console.log('Cliente ID:', newSale.value.id_cliente);
      console.log('Vendedor ID:', newSale.value.id_vendedor);  
      console.log('Método Pago ID:', newSale.value.id_metodo_de_pago);
      console.log('Productos:', newSale.value.productos);
      
      // Validar datos básicos
      if (!newSale.value.id_cliente) {
        console.log('❌ Falta cliente');
        return false;
      }
      
      if (!newSale.value.id_vendedor) {
        console.log('❌ Falta vendedor');
        return false;
      }
      
      if (!newSale.value.id_metodo_de_pago) {
        console.log('❌ Falta método de pago');
        return false;
      }
      
      // Validar productos
      for (let i = 0; i < newSale.value.productos.length; i++) {
        const producto = newSale.value.productos[i];
        console.log(`Producto ${i + 1}:`, producto);
        
        if (!producto.id_zapato) {
          console.log(`❌ Producto ${i + 1}: Falta zapato`);
          return false;
        }
        
        let tieneAlMenosUnaTallaValida = false;
        
        for (let j = 0; j < producto.tallas.length; j++) {
          const talla = producto.tallas[j];
          console.log(`  Talla ${j + 1}:`, talla);
          
          if (talla.id_talla && talla.cantidad > 0 && !talla.error_stock) {
            console.log(`  ✅ Talla ${j + 1} válida`);
            tieneAlMenosUnaTallaValida = true;
          } else {
            console.log(`  ❌ Talla ${j + 1} inválida - ID: ${talla.id_talla}, Cantidad: ${talla.cantidad}, Error: ${talla.error_stock}`);
          }
        }
        
        if (!tieneAlMenosUnaTallaValida) {
          console.log(`❌ Producto ${i + 1}: No hay tallas válidas`);
          return false;
        }
      }
      
      console.log('✅ Formulario VÁLIDO');
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
        updateSubtotal();
      }
    };

    const openAddSaleModal = async () => {
      await Promise.all([
        fetchClientes(),
        fetchZapatosDisponibles(),
        fetchVendedores(),
        fetchMetodosPago(),
        fetchEstadosPedidos()
      ]);

      newSale.value = {
        id_cliente: '',
        id_vendedor: '',
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
      console.log('=== INTENTANDO CREAR PEDIDO ===');
      console.log('isValidForm:', isValidForm.value);
      console.log('creatingPedido:', creatingPedido.value);
      
      if (!isValidForm.value) {
        console.log('❌ Formulario no válido');
        showMessage('Error', 'Complete todos los campos correctamente', 'error');
        return;
      }

      console.log('✅ Validación pasada, creando pedido...');
      creatingPedido.value = true;

      try {
        const token = checkAuth();
        if (!token) {
          console.log('❌ No hay token');
          return;
        }

        const productosParaEnviar = [];
        
        newSale.value.productos.forEach((producto, pIndex) => {
          console.log(`Procesando producto ${pIndex + 1}:`, producto);
          
          producto.tallas.forEach((talla, tIndex) => {
            console.log(`  Procesando talla ${tIndex + 1}:`, talla);
            
            if (talla.id_talla && talla.cantidad > 0) {
              productosParaEnviar.push({
                id_zapato: parseInt(producto.id_zapato),
                id_talla: parseInt(talla.id_talla),
                cantidad: parseInt(talla.cantidad),
                precio_unitario: parseFloat(producto.precio_unitario)
              });
              console.log('  ✅ Talla agregada al pedido');
            } else {
              console.log('  ❌ Talla omitida del pedido');
            }
          });
        });

        const pedidoData = {
          id_cliente: parseInt(newSale.value.id_cliente),
          id_vendedor: parseInt(newSale.value.id_vendedor),
          id_metodo_de_pago: parseInt(newSale.value.id_metodo_de_pago),
          productos: productosParaEnviar
        };

        console.log('📦 Datos del pedido a enviar:', pedidoData);
        console.log('📦 Productos preparados:', productosParaEnviar.length);

        if (productosParaEnviar.length === 0) {
          console.log('❌ No hay productos para enviar');
          showMessage('Error', 'No hay productos válidos para el pedido', 'error');
          return;
        }

        const response = await fetch('http://localhost:3000/api/ventas/pedidos', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(pedidoData)
        });

        console.log('📡 Respuesta del servidor:', response.status);

        if (!response.ok) {
          const errorData = await response.json();
          console.log('❌ Error del servidor:', errorData);
          
          if (errorData.codigo_error === 'STOCK_INSUFICIENTE') {
            showMessage(
              'Stock Insuficiente', 
              `${errorData.error}\n\nZapato: ${errorData.detalles.zapato}\nTalla: EU ${errorData.detalles.talla_eu}\nDisponible: ${errorData.detalles.stock_disponible}\nSolicitado: ${errorData.detalles.cantidad_solicitada}`,
              'error'
            );
            return;
          }
          
          throw new Error(errorData.error || 'Error al crear el pedido');
        }

        const data = await response.json();
        console.log('✅ Pedido creado exitosamente:', data);

        showMessage('Éxito', 
          `Pedido creado exitosamente!\n\nID: ${data.data.pedido.id}\nSubtotal: Q${data.data.resumen.subtotal}\nTotal: Q${data.data.resumen.total}\nProductos: ${data.data.resumen.productos_vendidos}`,
          'success'
        );
        
        showAddSaleModal.value = false;
        fetchSales();
        
      } catch (err) {
        console.error('❌ Error completo:', err);
        showMessage('Error', err.message, 'error');
      } finally {
        creatingPedido.value = false;
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
        console.log('Datos de ventas recibidos:', data);
        
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
      console.log('Venta seleccionada:', sale);
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

    onMounted(() => {
      fetchSales();
      fetchEstadosPedidos();

    });

    return {
      // Estados
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
      vendedores,
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
      calculatedSubtotal,
      calculatedTotal,
      isValidForm,
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
      updateSubtotal,
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
      cerrarDropdownCliente
    };
  }
}
</script>

<style scoped>

.sales-management-container {
  width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
}

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
  font-size: 20px;
  font-weight: bold;
  margin-bottom: 15px;
  text-align: center;
  color: #333;
  width: 100%;
}

.tabs-navigation {
  display: flex;
  background-color: #f8f9fa;
  border-radius: 8px;
  padding: 4px;
  margin-bottom: 20px;
  width: 100%;
  max-width: 600px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.tab-button {
  flex: 1;
  padding: 12px 20px;
  border: none;
  background-color: transparent;
  color: #6c757d;
  font-weight: 500;
  font-size: 14px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: center;
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
  animation: fadeIn 0.3s ease-in-out;
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

.cliente-section {
  margin: 20px 0;
  padding: 20px;
  border: 2px solid #007bff;
  border-radius: 8px;
  background-color: #f8f9ff;
}

.cliente-section h3 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #007bff;
  font-size: 18px;
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
  font-size: 16px;
  transition: border-color 0.3s ease;
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
  max-height: 300px;
  overflow-y: auto;
  background-color: white;
  border: 1px solid #dee2e6;
  border-top: none;
  border-radius: 0 0 6px 6px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  z-index: 1000;
}

.cliente-option {
  padding: 12px 15px;
  cursor: pointer;
  border-bottom: 1px solid #f8f9fa;
  transition: background-color 0.2s ease;
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
}

.cliente-info strong {
  color: #2c3e50;
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
  font-size: 12px;
}

.no-cliente-found {
  padding: 15px;
  text-align: center;
  color: #6c757d;
  font-style: italic;
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
}

.cliente-seleccionado h4 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #28a745;
  font-size: 16px;
}

.cliente-details-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
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
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.detail-item span {
  color: #2c3e50;
  font-size: 14px;
  padding: 6px 8px;
  background-color: white;
  border-radius: 4px;
  border: 1px solid #dee2e6;
}

.btn-limpiar-cliente {
  background-color: #6c757d;
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  transition: background-color 0.2s;
}

.btn-limpiar-cliente:hover {
  background-color: #5a6268;
}

.productos-section {
  margin: 20px 0;
  padding: 20px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  background-color: #f9f9f9;
}

.productos-section > label {
  display: block;
  margin-bottom: 15px;
  font-weight: bold;
  color: #333;
  font-size: 16px;
}

.producto-item {
  margin-bottom: 25px;
  padding: 20px;
  border: 2px solid #dee2e6;
  border-radius: 8px;
  background-color: white;
  position: relative;
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
  font-size: 16px;
}

.remove-product-button-header {
  background-color: #dc3545;
  color: white;
  border: none;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.remove-product-button-header:hover {
  background-color: #c82333;
}

.zapato-selection {
  margin-bottom: 20px;
}

.zapato-selection label {
  display: block;
  font-weight: bold;
  color: #555;
  font-size: 14px;
  margin-bottom: 5px;
}

.zapato-select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.tallas-section {
  margin-top: 20px;
  padding: 15px;
  background-color: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #dee2e6;
}

.tallas-label {
  display: block;
  font-weight: bold;
  color: #495057;
  font-size: 15px;
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
}

.talla-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr auto;
  gap: 15px;
  align-items: end;
}

.talla-selector,
.cantidad-input-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.talla-selector label,
.cantidad-input-group label {
  font-weight: bold;
  color: #555;
  font-size: 13px;
}

.talla-select,
.cantidad-input {
  padding: 8px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.talla-select option.talla-agotada {
  color: #dc3545;
  font-style: italic;
}

.stock-info-container {
  display: flex;
  align-items: center;
  justify-content: center;
}

.stock-info-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 12px;
  background-color: #e3f2fd;
  border: 1px solid #2196f3;
  border-radius: 8px;
  text-align: center;
}

.stock-label {
  font-size: 11px;
  color: #1565c0;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 2px;
}

.stock-number {
  font-size: 16px;
  font-weight: bold;
  color: #1976d2;
}

.remove-talla-button {
  background-color: #dc3545;
  color: white;
  border: none;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

.remove-talla-button:hover {
  background-color: #c82333;
}

.stock-error {
  color: #dc3545;
  font-size: 12px;
  margin-top: 8px;
  padding: 5px 8px;
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
}

.add-talla-button {
  background-color: #17a2b8;
  color: white;
  padding: 8px 15px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  margin-top: 10px;
}

.add-talla-button:hover {
  background-color: #138496;
}

.precio-section {
  margin-top: 15px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.precio-section label {
  font-weight: bold;
  color: #555;
  font-size: 14px;
}

.precio-display {
  font-size: 18px;
  font-weight: bold;
  color: #28a745;
  padding: 8px 12px;
  background-color: #e8f5e8;
  border-radius: 4px;
}

.subtotal-producto {
  margin-top: 15px;
  text-align: right;
  color: #495057;
  font-size: 16px;
  padding: 10px;
  background-color: #f8f9fa;
  border-radius: 4px;
}

.add-product-button {
  background-color: #28a745;
  color: white;
  padding: 12px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  margin-top: 15px;
  width: 100%;
}

.add-product-button:hover {
  background-color: #218838;
}

.totales-section {
  background-color: #e9ecef;
  padding: 20px;
  border-radius: 6px;
  margin: 20px 0;
}

.totales-display {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.total-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 16px;
}

.total-row:last-child {
  font-size: 18px;
  color: #28a745;
  border-top: 2px solid #dee2e6;
  padding-top: 10px;
  margin-top: 10px;
}

.modal-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.submit-button {
  flex: 1;
  padding: 12px;
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.2s;
}

.submit-button:hover:not(:disabled) {
  background-color: #218838;
}

.submit-button:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

.cancel-button {
  flex: 1;
  padding: 12px;
  background-color: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

.cancel-button:hover {
  background-color: #5a6268;
}

.actions-section {
  margin: 15px 0;
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: 8px;
}

.filter-section {
  margin-bottom: 15px;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 15px;
  background-color: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #dee2e6;
}

.action-button {
  padding: 12px 16px;
  border: 1px solid #333;
  border-radius: 4px;
  background-color: white;
  cursor: pointer;
  transition: background-color 0.2s;
  color: #333;
  width: 100%;
  font-size: 16px;
  text-align: center;
}

.modal {
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
  padding: 10px;
  box-sizing: border-box;
}

.modal-content {
  background: white;
  padding: 20px;
  border-radius: 8px;
  width: 100%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
}

.details-modal {
  max-width: 700px;
}

.modal-content h2 {
  margin-top: 0;
  margin-bottom: 20px;
  color: #333;
  border-bottom: 2px solid #f0f0f0;
  padding-bottom: 10px;
}

.close {
  float: right;
  font-size: 24px;
  cursor: pointer;
  padding: 5px;
  line-height: 0.8;
  color: #666;
}

.close:hover {
  color: #333;
}

.form-group {
  margin-bottom: 15px;
  text-align: left;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
  box-sizing: border-box;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.filter-group label {
  font-weight: bold;
  color: #333;
  font-size: 14px;
}

.filter-group input {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
  background-color: white;
}

.filter-buttons {
  display: flex;
  gap: 10px;
  margin-top: 10px;
  flex-direction: column;
}

.filter-button {
  padding: 10px 15px;
  border: none;
  border-radius: 4px;
  background-color: #4CAF50;
  color: white;
  cursor: pointer;
  transition: background-color 0.2s;
  font-size: 14px;
}

.filter-button:hover {
  background-color: #45a049;
}

.filter-button.reset {
  background-color: #6c757d;
}

.filter-button.reset:hover {
  background-color: #5a6268;
}

.action-button:hover {
  background-color: #f0f0f0;
}

.action-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.add-button:hover {
  color: #4CAF50;
  border-color: #4CAF50;
}

.view-button:hover {
  color: #2196F3;
  border-color: #2196F3;
}

.refresh-button:hover {
  color: #4CAF50;
  border-color: #4CAF50;
}

.list-title {
  margin-top: 15px;
  margin-bottom: 10px;
  font-size: 18px;
  font-weight: bold;
  text-align: center;
  width: 100%;
  color: #333;
}

.loading-indicator {
  text-align: center;
  padding: 40px 20px;
  font-style: italic;
  color: #666;
  font-size: 16px;
}

.error-message {
  text-align: center;
  padding: 20px;
  color: #dc3545;
  font-weight: bold;
  border: 1px solid #dc3545;
  border-radius: 4px;
  background-color: #f8d7da;
  margin: 15px 0;
}

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
  font-size: 18px;
}

.detail-section p {
  margin: 8px 0;
  font-size: 14px;
  line-height: 1.5;
}

.detail-section strong {
  color: #495057;
  font-weight: 600;
}

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


@media (max-width: 576px) {
  .tabs-navigation {
    flex-direction: column;
    gap: 4px;
  }
  
  .tab-button {
    padding: 10px 15px;
    font-size: 13px;
  }
  
  .cliente-details-grid {
    grid-template-columns: 1fr;
  }
  
  .cliente-section {
    padding: 15px;
  }
  
  .talla-row {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  
  .remove-talla-button {
    width: 100%;
    height: auto;
    border-radius: 4px;
    padding: 8px;
    margin-top: 10px;
  }

  .totales-display {
    text-align: center;
  }

  .modal-actions {
    flex-direction: column;
  }
  
  .detail-section {
    padding: 12px;
  }
  
  .detail-section h3 {
    font-size: 16px;
  }
  
  .stock-info-badge {
    padding: 6px 10px;
  }
  
  .stock-label {
    font-size: 10px;
  }
  
  .stock-number {
    font-size: 14px;
  }
}

@media (min-width: 577px) {
  .content-section {
    padding: 20px;
    margin-top: 70px;
  }
  
  .page-title {
    font-size: 22px;
  }
  
  .tabs-navigation {
    max-width: 500px;
  }
  
  .tab-button {
    padding: 14px 24px;
    font-size: 15px;
  }
  
  .actions-section {
    flex-direction: row;
    justify-content: center;
    gap: 15px;
  }
  
  .action-button {
    width: auto;
    min-width: 150px;
  }
  
  .filter-section {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 15px;
  }
  
  .filter-group {
    flex: 1;
    min-width: 200px;
  }
  
  .filter-buttons {
    flex-direction: row;
    margin-top: 0;
    align-items: flex-end;
  }
  
  .filter-button {
    min-width: 100px;
  }

  .talla-row {
    grid-template-columns: 2fr 1fr 1fr auto;
  }
  
  .cliente-details-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (min-width: 768px) {
  .content-section {
    max-width: 1400px;
    margin-left: auto;
    margin-right: auto;
    margin-top: 100px;
  }
  
  .page-title {
    font-size: 24px;
  }
  
  .tabs-navigation {
    max-width: 600px;
  }
  
  .tab-button {
    padding: 16px 28px;
    font-size: 16px;
  }
  
  .list-title {
    font-size: 20px;
  }
  
  .modal-content {
    max-width: 900px;
  }

  .talla-row {
    grid-template-columns: 2.5fr 1fr 1fr auto;
  }

  .totales-section {
    max-width: 400px;
    margin-left: auto;
    margin-right: auto;
  }
  
  .sale-details {
    flex-direction: row;
    gap: 30px;
  }
  
  .detail-section {
    flex: 1;
  }
  
  .cliente-details-grid {
    grid-template-columns: 1fr 1fr 1fr;
  }
}

@media (min-width: 1200px) {
  .tabs-navigation {
    max-width: 700px;
  }
  
  .talla-row {
    grid-template-columns: 3fr 1fr 1fr auto;
  }
  
  .modal-content {
    max-width: 1000px;
  }
}

.tab-button {
  position: relative;
  overflow: hidden;
}

.tab-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
  transition: left 0.5s;
}

.tab-button:hover::before {
  left: 100%;
}

.tabs-navigation {
  border: 1px solid #e9ecef;
}

.tab-content {
  min-height: 400px;
}

.tab-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  color: #6c757d;
  font-style: italic;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}

.talla-repetida {
  color: #dc3545 !important;
  font-style: italic;
}

.debug-info {
  color: #28a745;
  font-weight: bold;
  font-size: 11px;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

.tallas-grid:empty::after {
  content: 'No hay tallas agregadas';
  display: block;
  text-align: center;
  color: #6c757d;
  font-style: italic;
  padding: 20px;
}

.producto-item:hover {
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  transform: translateY(-2px);
  transition: all 0.2s ease;
}

.stock-info-badge:hover {
  transform: scale(1.05);
  transition: transform 0.2s ease;
}
</style>