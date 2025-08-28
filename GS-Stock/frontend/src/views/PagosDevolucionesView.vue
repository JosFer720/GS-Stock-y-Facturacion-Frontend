<template>
  <div class="pagos-devoluciones-container">
    <header-component />

    <div class="content-section">
      <div class="page-title">Pagos y Devoluciones</div>

      <div class="tabs-navigation">
        <button 
          class="tab-button"
          :class="{ active: activeTab === 'pagos' }"
          @click="activeTab = 'pagos'"
        >
          Gestión de Pagos
        </button>
        <button 
          class="tab-button"
          :class="{ active: activeTab === 'devoluciones' }"
          @click="activeTab = 'devoluciones'"
        >
          Gestión de Devoluciones
        </button>
      </div>

      <!-- TAB DE PAGOS -->
      <div v-show="activeTab === 'pagos'" class="tab-content">
        <div class="form-section">
          <h2 class="section-title">Registrar Nuevo Pago</h2>
          
          <form @submit.prevent="registrarPago" class="payment-form">
            <div class="form-row">
              <div class="form-group">
                <label for="pago-vendedor">Vendedor:</label>
                <select id="pago-vendedor" v-model="nuevoPago.id_vendedor" required>
                  <option value="">Seleccione un vendedor</option>
                  <option v-for="vendedor in vendedores" :key="vendedor.id" :value="vendedor.id">
                    {{ vendedor.nombre_completo }} - {{ vendedor.ruta }}
                  </option>
                </select>
              </div>

              <div class="form-group">
                <label for="pago-cliente">Cliente:</label>
                <div class="cliente-search-container">
                  <input 
                    type="text"
                    id="pago-cliente"
                    v-model="clienteSearchTermPago"
                    @input="buscarClientesPago"
                    @focus="showClienteDropdownPago = true"
                    @blur="setTimeout(() => showClienteDropdownPago = false, 200)"
                    placeholder="Buscar cliente..."
                    required
                  />
                  
                  <div 
                    v-if="showClienteDropdownPago && clientesFiltradosPago.length > 0" 
                    class="cliente-dropdown"
                  >
                    <div 
                      v-for="cliente in clientesFiltradosPago" 
                      :key="cliente.id"
                      @click="seleccionarClientePago(cliente)"
                      class="cliente-option"
                    >
                      <div class="cliente-info">
                        <strong>{{ cliente.nombre }} {{ cliente.apellido }}</strong>
                        <span v-if="cliente.empresa" class="empresa-tag">{{ cliente.empresa }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="pago-linea">Línea de Producto:</label>
                <select id="pago-linea" v-model="nuevoPago.id_tipo_linea_producto" required>
                  <option value="">Seleccione una línea</option>
                  <option v-for="tipo in tiposLineaProducto" :key="tipo.id" :value="tipo.id">
                    {{ tipo.nombre }}
                  </option>
                </select>
              </div>

              <div class="form-group">
                <label for="pago-metodo">Método de Pago:</label>
                <select id="pago-metodo" v-model="nuevoPago.id_metodo_pago" required>
                  <option value="">Seleccione un método</option>
                  <option v-for="metodo in metodosPago" :key="metodo.id" :value="metodo.id">
                    {{ metodo.tipo }} - {{ metodo.detalle }}
                  </option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="pago-monto">Monto Pagado:</label>
                <div class="currency-input">
                  <span class="currency-symbol">Q</span>
                  <input 
                    type="number" 
                    id="pago-monto" 
                    v-model.number="nuevoPago.monto" 
                    required
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            <div class="form-group">
              <label for="pago-observaciones">Observaciones:</label>
              <textarea 
                id="pago-observaciones" 
                v-model="nuevoPago.observaciones"
                placeholder="Detalles adicionales del pago..."
                rows="3"
              ></textarea>
            </div>

            <button type="submit" class="submit-button" :disabled="procesandoPago">
              {{ procesandoPago ? 'Procesando...' : 'Registrar Pago' }}
            </button>
          </form>
        </div>

        <!-- HISTORIAL DE PAGOS -->
        <div class="table-section">
          <h2 class="section-title">Historial de Pagos</h2>
          
          <transactions-table
            :type="'pagos'"
            :data="pagosFiltrados"
            :loading="cargandoPagos"
            :filters="filtrosPagos"
            @update:filters="actualizarFiltrosPagos"
            @clear-filters="limpiarFiltrosPagos"
          />
        </div>
      </div>

      <!-- TAB DE DEVOLUCIONES -->
      <div v-show="activeTab === 'devoluciones'" class="tab-content">
        <div class="form-section">
          <h2 class="section-title">Registrar Nueva Devolución</h2>
          
          <form @submit.prevent="registrarDevolucion" class="return-form">
            <div class="form-row">
              <div class="form-group">
                <label for="dev-vendedor">Vendedor:</label>
                <select id="dev-vendedor" v-model="nuevaDevolucion.id_vendedor" required>
                  <option value="">Seleccione un vendedor</option>
                  <option v-for="vendedor in vendedores" :key="vendedor.id" :value="vendedor.id">
                    {{ vendedor.nombre_completo }} - {{ vendedor.ruta }}
                  </option>
                </select>
              </div>

              <div class="form-group">
                <label for="dev-cliente">Cliente:</label>
                <div class="cliente-search-container">
                  <input 
                    type="text"
                    id="dev-cliente"
                    v-model="clienteSearchTermDev"
                    @input="buscarClientesDev"
                    @focus="showClienteDropdownDev = true"
                    @blur="setTimeout(() => showClienteDropdownDev = false, 200)"
                    placeholder="Buscar cliente..."
                    required
                  />
                  
                  <div 
                    v-if="showClienteDropdownDev && clientesFiltradosDev.length > 0" 
                    class="cliente-dropdown"
                  >
                    <div 
                      v-for="cliente in clientesFiltradosDev" 
                      :key="cliente.id"
                      @click="seleccionarClienteDev(cliente)"
                      class="cliente-option"
                    >
                      <div class="cliente-info">
                        <strong>{{ cliente.nombre }} {{ cliente.apellido }}</strong>
                        <span v-if="cliente.empresa" class="empresa-tag">{{ cliente.empresa }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="dev-linea">Línea de Producto:</label>
                <select id="dev-linea" v-model="nuevaDevolucion.id_tipo_linea_producto" required>
                  <option value="">Seleccione una línea</option>
                  <option v-for="tipo in tiposLineaProducto" :key="tipo.id" :value="tipo.id">
                    {{ tipo.nombre }}
                  </option>
                </select>
              </div>

              <div class="form-group">
                <label for="dev-codigo">Código de Producto:</label>
                <div class="producto-search-container">
                  <input 
                    type="text"
                    id="dev-codigo"
                    v-model="productoSearchTermDev"
                    @input="buscarProductosDev"
                    @focus="showProductoDropdownDev = true"
                    @blur="setTimeout(() => showProductoDropdownDev = false, 200)"
                    placeholder="Buscar por código o nombre..."
                    required
                  />
                  
                  <div 
                    v-if="showProductoDropdownDev && productosFiltradosDev.length > 0" 
                    class="producto-dropdown"
                  >
                    <div 
                      v-for="producto in productosFiltradosDev" 
                      :key="producto.id"
                      @click="seleccionarProductoDev(producto)"
                      class="producto-option"
                    >
                      <div class="producto-info">
                        <strong>{{ producto.codigo }}</strong>
                        <span>{{ producto.nombre }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="dev-talla">Talla:</label>
                <select id="dev-talla" v-model="nuevaDevolucion.id_talla" required :disabled="!nuevaDevolucion.id_zapato">
                  <option value="">Seleccione una talla</option>
                  <option 
                    v-for="talla in tallasDisponiblesDevolucion" 
                    :key="talla.talla_id" 
                    :value="talla.talla_id"
                  >
                    EU {{ talla.talla_eu }} / US {{ talla.talla_us }}
                  </option>
                </select>
              </div>

              <div class="form-group">
                <label for="dev-cantidad">Cantidad:</label>
                <input 
                  type="number" 
                  id="dev-cantidad" 
                  v-model.number="nuevaDevolucion.cantidad" 
                  required
                  min="1"
                  placeholder="1"
                />
              </div>
            </div>

            <div class="form-group">
              <label for="dev-observaciones">Motivo de Devolución:</label>
              <textarea 
                id="dev-observaciones" 
                v-model="nuevaDevolucion.observaciones"
                placeholder="Describa el motivo de la devolución..."
                rows="3"
                required
              ></textarea>
            </div>

            <button type="submit" class="submit-button" :disabled="procesandoDevolucion">
              {{ procesandoDevolucion ? 'Procesando...' : 'Registrar Devolución' }}
            </button>
          </form>
        </div>

        <!-- HISTORIAL DE DEVOLUCIONES -->
        <div class="table-section">
          <h2 class="section-title">Historial de Devoluciones</h2>
          
          <transactions-table
            :type="'devoluciones'"
            :data="devolucionesFiltradas"
            :loading="cargandoDevoluciones"
            :filters="filtrosDevoluciones"
            @update:filters="actualizarFiltrosDevoluciones"
            @clear-filters="limpiarFiltrosDevoluciones"
          />
        </div>
      </div>
    </div>

    <!-- Modal de Mensajes -->
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
import HeaderComponent from '@/components/HeaderComponent.vue';
import ModalMessage from '@/components/ModalMessage.vue';
import TransactionsTable from '@/components/TransactionsTable.vue';
import { useRouter } from 'vue-router';

export default {
  name: 'PagosDevolucionesView',
  components: {
    HeaderComponent,
    ModalMessage,
    TransactionsTable
  },
  setup() {
    const router = useRouter();
    
    // Estados principales
    const activeTab = ref('pagos');
    const showMessageModal = ref(false);
    const messageTitle = ref('');
    const messageContent = ref('');
    const messageType = ref('info');
    
    // Datos generales
    const vendedores = ref([]);
    const clientes = ref([]);
    const tiposLineaProducto = ref([]);
    const metodosPago = ref([]);
    const zapatosDisponibles = ref([]);
    
    // Estados de pagos
    const pagos = ref([]);
    const cargandoPagos = ref(false);
    const procesandoPago = ref(false);
    const clienteSearchTermPago = ref('');
    const showClienteDropdownPago = ref(false);
    const clientesFiltradosPago = ref([]);
    
    const nuevoPago = ref({
      id_vendedor: '',
      id_cliente: '',
      id_tipo_linea_producto: '',
      id_metodo_pago: '',
      monto: null,
      observaciones: ''
    });
    
    const filtrosPagos = ref({
      cliente: '',
      fechaDesde: '',
      fechaHasta: ''
    });
    
    // Estados de devoluciones
    const devoluciones = ref([]);
    const cargandoDevoluciones = ref(false);
    const procesandoDevolucion = ref(false);
    const clienteSearchTermDev = ref('');
    const showClienteDropdownDev = ref(false);
    const clientesFiltradosDev = ref([]);
    const productoSearchTermDev = ref('');
    const showProductoDropdownDev = ref(false);
    const productosFiltradosDev = ref([]);
    
    const nuevaDevolucion = ref({
      id_vendedor: '',
      id_cliente: '',
      id_tipo_linea_producto: '',
      id_zapato: '',
      id_talla: '',
      cantidad: 1,
      observaciones: ''
    });
    
    const filtrosDevoluciones = ref({
      cliente: '',
      fechaDesde: '',
      fechaHasta: ''
    });

    // Utilidades
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
      if (!amount && amount !== 0) return '0.00';
      return parseFloat(amount).toFixed(2);
    };

    // Funciones de carga de datos
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
      } catch (err) {
        console.error('Error al obtener clientes:', err);
      }
    };

    const fetchTiposLineaProducto = async () => {
      try {
        const token = checkAuth();
        if (!token) return;
        
        const response = await fetch('http://localhost:3000/api/tipos-linea-producto', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Error al obtener tipos de línea');
        
        const data = await response.json();
        tiposLineaProducto.value = data.data || [];
      } catch (err) {
        console.error('Error al obtener tipos de línea:', err);
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

    const fetchZapatos = async () => {
      try {
        const token = checkAuth();
        if (!token) return;
        
        const response = await fetch('http://localhost:3000/api/inventory', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Error al obtener productos');
        
        const data = await response.json();
        zapatosDisponibles.value = data.data || [];
      } catch (err) {
        console.error('Error al obtener productos:', err);
      }
    };

    // Funciones de búsqueda de clientes
    const buscarClientesPago = () => {
      if (clienteSearchTermPago.value.length < 2) {
        clientesFiltradosPago.value = [];
        return;
      }
      
      const term = clienteSearchTermPago.value.toLowerCase();
      clientesFiltradosPago.value = clientes.value.filter(cliente => {
        const nombreCompleto = `${cliente.nombre} ${cliente.apellido}`.toLowerCase();
        const empresa = cliente.empresa?.toLowerCase() || '';
        return nombreCompleto.includes(term) || empresa.includes(term);
      }).slice(0, 8);
    };

    const buscarClientesDev = () => {
      if (clienteSearchTermDev.value.length < 2) {
        clientesFiltradosDev.value = [];
        return;
      }
      
      const term = clienteSearchTermDev.value.toLowerCase();
      clientesFiltradosDev.value = clientes.value.filter(cliente => {
        const nombreCompleto = `${cliente.nombre} ${cliente.apellido}`.toLowerCase();
        const empresa = cliente.empresa?.toLowerCase() || '';
        return nombreCompleto.includes(term) || empresa.includes(term);
      }).slice(0, 8);
    };

    // Funciones de búsqueda de productos
    const buscarProductosDev = () => {
      if (productoSearchTermDev.value.length < 2) {
        productosFiltradosDev.value = [];
        return;
      }
      
      const term = productoSearchTermDev.value.toLowerCase();
      productosFiltradosDev.value = zapatosDisponibles.value.filter(producto => {
        const codigo = producto.codigo?.toLowerCase() || '';
        const nombre = producto.nombre?.toLowerCase() || '';
        return codigo.includes(term) || nombre.includes(term);
      }).slice(0, 8);
    };

    const seleccionarClientePago = (cliente) => {
      nuevoPago.value.id_cliente = cliente.id;
      clienteSearchTermPago.value = `${cliente.nombre} ${cliente.apellido}`;
      showClienteDropdownPago.value = false;
      clientesFiltradosPago.value = [];
    };

    const seleccionarClienteDev = (cliente) => {
      nuevaDevolucion.value.id_cliente = cliente.id;
      clienteSearchTermDev.value = `${cliente.nombre} ${cliente.apellido}`;
      showClienteDropdownDev.value = false;
      clientesFiltradosDev.value = [];
    };

    const seleccionarProductoDev = (producto) => {
      nuevaDevolucion.value.id_zapato = producto.id;
      productoSearchTermDev.value = `${producto.codigo} - ${producto.nombre}`;
      showProductoDropdownDev.value = false;
      productosFiltradosDev.value = [];
    };

    // Funciones específicas de devoluciones
    const tallasDisponiblesDevolucion = computed(() => {
      if (!nuevaDevolucion.value.id_zapato) return [];
      
      const zapato = zapatosDisponibles.value.find(z => z.id === parseInt(nuevaDevolucion.value.id_zapato));
      return zapato?.tallas_disponibles || [];
    });

    // Funciones de registro
    const registrarPago = async () => {
      if (!nuevoPago.value.id_cliente || !nuevoPago.value.monto) {
        showMessage('Error', 'Complete todos los campos requeridos', 'error');
        return;
      }

      procesandoPago.value = true;
      try {
        const token = checkAuth();
        if (!token) return;

        const response = await fetch('http://localhost:3000/api/pagos', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(nuevoPago.value)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al registrar el pago');
        }

        showMessage('Éxito', 'Pago registrado correctamente', 'success');
        
        // Limpiar formulario
        nuevoPago.value = {
          id_vendedor: '',
          id_cliente: '',
          id_tipo_linea_producto: '',
          id_metodo_pago: '',
          monto: null,
          observaciones: ''
        };
        clienteSearchTermPago.value = '';
        
        // Recargar datos
        await fetchPagos();
        
      } catch (err) {
        showMessage('Error', err.message, 'error');
      } finally {
        procesandoPago.value = false;
      }
    };

    const registrarDevolucion = async () => {
      if (!nuevaDevolucion.value.id_cliente || !nuevaDevolucion.value.id_zapato || !nuevaDevolucion.value.id_talla) {
        showMessage('Error', 'Complete todos los campos requeridos', 'error');
        return;
      }

      procesandoDevolucion.value = true;
      try {
        const token = checkAuth();
        if (!token) return;

        const response = await fetch('http://localhost:3000/api/devoluciones', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(nuevaDevolucion.value)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al registrar la devolución');
        }

        showMessage('Éxito', 'Devolución registrada correctamente', 'success');
        
        // Limpiar formulario
        nuevaDevolucion.value = {
          id_vendedor: '',
          id_cliente: '',
          id_tipo_linea_producto: '',
          id_zapato: '',
          id_talla: '',
          cantidad: 1,
          observaciones: ''
        };
        clienteSearchTermDev.value = '';
        productoSearchTermDev.value = '';
        
        // Recargar datos
        await fetchDevoluciones();
        
      } catch (err) {
        showMessage('Error', err.message, 'error');
      } finally {
        procesandoDevolucion.value = false;
      }
    };

    // Funciones de carga de historiales
    const fetchPagos = async () => {
      cargandoPagos.value = true;
      try {
        const token = checkAuth();
        if (!token) return;
        
        const response = await fetch('http://localhost:3000/api/pagos', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Error al obtener pagos');
        
        const data = await response.json();
        pagos.value = data.data || [];
      } catch (err) {
        console.error('Error al obtener pagos:', err);
      } finally {
        cargandoPagos.value = false;
      }
    };

    const fetchDevoluciones = async () => {
      cargandoDevoluciones.value = true;
      try {
        const token = checkAuth();
        if (!token) return;
        
        const response = await fetch('http://localhost:3000/api/devoluciones', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Error al obtener devoluciones');
        
        const data = await response.json();
        devoluciones.value = data.data || [];
      } catch (err) {
        console.error('Error al obtener devoluciones:', err);
      } finally {
        cargandoDevoluciones.value = false;
      }
    };

    // Funciones de filtrado
    const pagosFiltrados = computed(() => {
      let result = pagos.value;

      if (filtrosPagos.value.cliente) {
        const clienteQuery = filtrosPagos.value.cliente.toLowerCase();
        result = result.filter(pago => 
          pago.cliente_nombre?.toLowerCase().includes(clienteQuery)
        );
      }

      if (filtrosPagos.value.fechaDesde) {
        result = result.filter(pago => {
          const fechaPago = new Date(pago.fecha).toISOString().split('T')[0];
          return fechaPago >= filtrosPagos.value.fechaDesde;
        });
      }

      if (filtrosPagos.value.fechaHasta) {
        result = result.filter(pago => {
          const fechaPago = new Date(pago.fecha).toISOString().split('T')[0];
          return fechaPago <= filtrosPagos.value.fechaHasta;
        });
      }

      return result;
    });

    const devolucionesFiltradas = computed(() => {
      let result = devoluciones.value;

      if (filtrosDevoluciones.value.cliente) {
        const clienteQuery = filtrosDevoluciones.value.cliente.toLowerCase();
        result = result.filter(devolucion => 
          devolucion.cliente_nombre?.toLowerCase().includes(clienteQuery)
        );
      }

      if (filtrosDevoluciones.value.fechaDesde) {
        result = result.filter(devolucion => {
          const fechaDevolucion = new Date(devolucion.fecha).toISOString().split('T')[0];
          return fechaDevolucion >= filtrosDevoluciones.value.fechaDesde;
        });
      }

      if (filtrosDevoluciones.value.fechaHasta) {
        result = result.filter(devolucion => {
          const fechaDevolucion = new Date(devolucion.fecha).toISOString().split('T')[0];
          return fechaDevolucion <= filtrosDevoluciones.value.fechaHasta;
        });
      }

      return result;
    });

    const actualizarFiltrosPagos = (nuevosFiltros) => {
      filtrosPagos.value = nuevosFiltros;
    };

    const actualizarFiltrosDevoluciones = (nuevosFiltros) => {
      filtrosDevoluciones.value = nuevosFiltros;
    };

    const limpiarFiltrosPagos = () => {
      filtrosPagos.value = {
        cliente: '',
        fechaDesde: '',
        fechaHasta: ''
      };
    };

    const limpiarFiltrosDevoluciones = () => {
      filtrosDevoluciones.value = {
        cliente: '',
        fechaDesde: '',
        fechaHasta: ''
      };
    };

    // Inicialización
    onMounted(async () => {
      await Promise.all([
        fetchVendedores(),
        fetchClientes(),
        fetchTiposLineaProducto(),
        fetchMetodosPago(),
        fetchZapatos(),
        fetchPagos(),
        fetchDevoluciones()
      ]);
    });

    return {
      // Estados principales
      activeTab,
      showMessageModal,
      messageTitle,
      messageContent,
      messageType,
      
      // Datos
      vendedores,
      clientes,
      tiposLineaProducto,
      metodosPago,
      zapatosDisponibles,
      
      // Pagos
      pagos,
      pagosFiltrados,
      cargandoPagos,
      procesandoPago,
      nuevoPago,
      filtrosPagos,
      clienteSearchTermPago,
      showClienteDropdownPago,
      clientesFiltradosPago,
      
      // Devoluciones
      devoluciones,
      devolucionesFiltradas,
      cargandoDevoluciones,
      procesandoDevolucion,
      nuevaDevolucion,
      filtrosDevoluciones,
      clienteSearchTermDev,
      showClienteDropdownDev,
      clientesFiltradosDev,
      productoSearchTermDev,
      showProductoDropdownDev,
      productosFiltradosDev,
      tallasDisponiblesDevolucion,
      
      // Funciones
      showMessage,
      hideMessage,
      formatDate,
      formatCurrency,
      buscarClientesPago,
      buscarClientesDev,
      buscarProductosDev,
      seleccionarClientePago,
      seleccionarClienteDev,
      seleccionarProductoDev,
      registrarPago,
      registrarDevolucion,
      actualizarFiltrosPagos,
      actualizarFiltrosDevoluciones,
      limpiarFiltrosPagos,
      limpiarFiltrosDevoluciones
    };
  }
}
</script>

<style scoped>
.pagos-devoluciones-container {
  width: 100%;
  min-height: 100vh;
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
  font-size: clamp(20px, 4vw, 24px);
  font-weight: bold;
  margin-bottom: 20px;
  text-align: center;
  color: #333;
  width: 100%;
  word-wrap: break-word;
}

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

.form-section {
  background-color: white;
  border-radius: 8px;
  padding: clamp(15px, 4vw, 25px);
  margin-bottom: 30px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  border: 1px solid #e9ecef;
  width: 100%;
  box-sizing: border-box;
}

.section-title {
  font-size: clamp(18px, 4vw, 20px);
  font-weight: bold;
  color: #2c3e50;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 2px solid #e9ecef;
  word-wrap: break-word;
}

.payment-form,
.return-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
  box-sizing: border-box;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr;
  gap: 15px;
  width: 100%;
}

@media (min-width: 768px) {
  .form-row {
    grid-template-columns: 1fr 1fr;
  }
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  min-width: 0;
}

.form-group label {
  font-weight: 600;
  color: #495057;
  font-size: clamp(12px, 3vw, 14px);
  word-wrap: break-word;
}

.form-group input,
.form-group select,
.form-group textarea {
  padding: 12px;
  border: 2px solid #e9ecef;
  border-radius: 6px;
  font-size: clamp(12px, 3vw, 14px);
  transition: border-color 0.2s ease;
  background-color: white;
  width: 100%;
  box-sizing: border-box;
  min-width: 0;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

.form-group input:disabled,
.form-group select:disabled {
  background-color: #f8f9fa;
  color: #6c757d;
  cursor: not-allowed;
}

.currency-input {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
}

.currency-symbol {
  position: absolute;
  left: 12px;
  font-weight: bold;
  color: #28a745;
  z-index: 1;
  pointer-events: none;
}

.currency-input input {
  padding-left: 30px;
}

.cliente-search-container,
.producto-search-container {
  position: relative;
  width: 100%;
}

.cliente-dropdown,
.producto-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background-color: white;
  border: 2px solid #e9ecef;
  border-top: none;
  border-radius: 0 0 6px 6px;
  max-height: 200px;
  overflow-y: auto;
  z-index: 1000;
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.cliente-option,
.producto-option {
  padding: 12px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  border-bottom: 1px solid #f1f3f4;
}

.cliente-option:last-child,
.producto-option:last-child {
  border-bottom: none;
}

.cliente-option:hover,
.producto-option:hover {
  background-color: #f8f9fa;
}

.cliente-info,
.producto-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.cliente-info strong,
.producto-info strong {
  font-size: clamp(12px, 3vw, 14px);
  color: #2c3e50;
}

.cliente-info span,
.producto-info span {
  font-size: clamp(11px, 3vw, 13px);
  color: #6c757d;
}

.empresa-tag {
  background-color: #e3f2fd;
  color: #1976d2;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  align-self: flex-start;
}

.submit-button {
  background-color: #28a745;
  color: white;
  padding: 14px 20px;
  border: none;
  border-radius: 6px;
  font-size: clamp(14px, 3vw, 16px);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 10px;
  width: 100%;
  max-width: 300px;
  align-self: center;
}

.submit-button:hover:not(:disabled) {
  background-color: #218838;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(40, 167, 69, 0.3);
}

.submit-button:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.table-section {
  background-color: white;
  border-radius: 8px;
  padding: clamp(15px, 4vw, 25px);
  margin-bottom: 30px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  border: 1px solid #e9ecef;
  width: 100%;
  box-sizing: border-box;
  overflow-x: auto;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .content-section {
    padding: 10px;
    margin-top: 50px;
  }
  
  .tabs-navigation {
    flex-direction: column;
    gap: 4px;
  }
  
  .tab-button {
    width: 100%;
  }
  
  .form-section,
  .table-section {
    padding: 15px;
  }
  
  .submit-button {
    max-width: 100%;
  }
}

@media (max-width: 480px) {
  .form-group input,
  .form-group select,
  .form-group textarea {
    padding: 10px;
  }
  
  .cliente-option,
  .producto-option {
    padding: 10px;
  }
}
</style>