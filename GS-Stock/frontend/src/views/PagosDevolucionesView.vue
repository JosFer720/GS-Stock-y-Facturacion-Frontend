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
            <!-- Cliente search -->
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
                  placeholder="Buscar por nombre o empresa..."
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

            <!-- Pedido dropdown -->
            <div class="form-group">
              <label for="pago-pedido">Pedido:</label>
              <select 
                id="pago-pedido" 
                v-model="nuevoPago.id_pedido" 
                :disabled="!clienteSeleccionadoPago || pedidosClientePago.length === 0"
                required
              >
                <option value="">Seleccione un pedido</option>
                <option 
                  v-for="pedido in pedidosClientePago" 
                  :key="pedido.id" 
                  :value="pedido.id"
                >
                  Pedido #{{ pedido.id }} - Q{{ formatCurrency(pedido.total) }} 
                  - {{ pedido.estado_pago === 'pagado' ? 'Pagado' : 'Pendiente' }}
                </option>
              </select>
              <div v-if="clienteSeleccionadoPago && pedidosClientePago.length === 0" class="no-orders-message">
                Este cliente no tiene pedidos pendientes de pago.
              </div>
            </div>

            <!-- Método de pago dropdown -->
            <div class="form-group">
              <label for="pago-metodo">Método de Pago:</label>
              <select id="pago-metodo" v-model="nuevoPago.id_metodo_pago" required>
                <option value="">Seleccione un método</option>
                <option v-for="metodo in metodosPago" :key="metodo.id" :value="metodo.id">
                  {{ metodo.tipo }} - {{ metodo.detalle }}
                </option>
              </select>
            </div>

            <!-- Monto pagado -->
            <div class="form-group">
              <label for="pago-monto">Monto Pagado:</label>
              <div class="currency-input">
                <span class="currency-symbol">Q</span>
                <input 
                  type="number" 
                  id="pago-monto" 
                  v-model.number="nuevoPago.monto_pagado" 
                  required
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                />
              </div>
            </div>

            <!-- Observaciones -->
            <div class="form-group">
              <label for="pago-observaciones">Observaciones:</label>
              <textarea 
                id="pago-observaciones" 
                v-model="nuevoPago.observaciones"
                placeholder="Detalles adicionales del pago..."
                rows="3"
              ></textarea>
            </div>

            <button 
              type="submit" 
              class="submit-button" 
              :disabled="procesandoPago || !clienteSeleccionadoPago || !nuevoPago.id_pedido || !nuevoPago.id_metodo_pago || !nuevoPago.monto_pagado"
            >
              {{ procesandoPago ? 'Procesando...' : 'Registrar Pago' }}
            </button>
          </form>
        </div>

        <!-- HISTORIAL DE PAGOS -->
        <div class="table-section">
          <h2 class="section-title">Historial de Pagos</h2>
          
          <PagosTable
            :data="pagosFiltrados"
            :loading="cargandoPagos"
            :filters="filtrosPagos"
            @update:filters="actualizarFiltrosPagos"
            @clear-filters="limpiarFiltrosPagos"
          />
        </div>
      </div>

      <!-- TAB DE DEVOLUCIONES (UNTOUCHED) -->
      <div v-show="activeTab === 'devoluciones'" class="tab-content">
        <div class="form-section">
          <h2 class="section-title">Registrar Nueva Devolución</h2>
          
          <form @submit.prevent="registrarDevolucion" class="return-form">
            <!-- Buscar cliente -->
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
                  placeholder="Buscar por nombre o empresa..."
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

            <!-- Mostrar pedidos del cliente seleccionado -->
            <div v-if="clienteSeleccionadoDev && pedidosClienteDev.length > 0" class="form-group">
              <label for="dev-pedido">Pedido del Cliente:</label>
              <select id="dev-pedido" v-model="nuevaDevolucion.id_pedido" required>
                <option value="">Seleccione un pedido</option>
                <option v-for="pedido in pedidosClienteDev" :key="pedido.id" :value="pedido.id">
                  Pedido #{{ pedido.id }} - {{ formatDate(pedido.fecha) }} (Q{{ formatCurrency(pedido.total) }})
                </option>
              </select>
            </div>

            <!-- Mensaje si no hay pedidos -->
            <div v-if="clienteSeleccionadoDev && pedidosClienteDev.length === 0" class="form-group">
              <div class="no-orders-message">
                Este cliente no tiene pedidos elegibles para devolución.
                <small>Solo se pueden devolver pedidos entregados que no tengan devoluciones previas.</small>
              </div>
            </div>

            <!-- Método de devolución -->
            <div class="form-group">
              <label for="dev-metodo">Método de Devolución:</label>
              <select id="dev-metodo" v-model="nuevaDevolucion.metodo" required>
                <option value="">Seleccione un método</option>
                <option v-for="metodo in metodosDevoluciones" :key="metodo.id" :value="metodo.metodo">
                  {{ metodo.metodo }}
                </option>
              </select>
            </div>

            <!-- Monto personalizado (opcional) -->
            <div class="form-group">
              <label for="dev-monto">Monto de Devolución (opcional):</label>
              <div class="currency-input">
                <span class="currency-symbol">Q</span>
                <input 
                  type="number" 
                  id="dev-monto" 
                  v-model.number="nuevaDevolucion.monto" 
                  step="0.01"
                  min="0"
                  placeholder="Dejar vacío para devolver el total del pedido"
                />
              </div>
              <small>Si no especifica un monto, se devolverá el total del pedido.</small>
            </div>

            <!-- Motivo de devolución -->
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

            <!-- Observaciones adicionales -->
            <div class="form-group">
              <label for="dev-observaciones-adicionales">Observaciones Adicionales:</label>
              <textarea 
                id="dev-observaciones-adicionales" 
                v-model="nuevaDevolucion.observaciones_adicionales"
                placeholder="Información adicional sobre la devolución..."
                rows="2"
              ></textarea>
            </div>

            <button 
              type="submit" 
              class="submit-button" 
              :disabled="procesandoDevolucion || !clienteSeleccionadoDev || pedidosClienteDev.length === 0"
            >
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
import PagosTable from '@/components/PagosTable.vue';
import TransactionsTable from '@/components/TransactionsTable.vue';
import { useRouter } from 'vue-router';

export default {
  name: 'PagosDevolucionesView',
  components: {
    HeaderComponent,
    ModalMessage,
    PagosTable,
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
    const metodosPago = ref([]);
    
    // Estados de pagos
    const pagos = ref([]);
    const cargandoPagos = ref(false);
    const procesandoPago = ref(false);
    const clienteSearchTermPago = ref('');
    const showClienteDropdownPago = ref(false);
    const clientesFiltradosPago = ref([]);
    const clienteSeleccionadoPago = ref(null);
    const pedidosClientePago = ref([]);
    
    const nuevoPago = ref({
      id_pedido: '',
      id_metodo_pago: '',
      monto_pagado: null,
      vuelto: null,
      observaciones: ''
    });
    
    const filtrosPagos = ref({
      cliente: '',
      fechaPago: ''
    });
    
    // Estados de devoluciones
    const devoluciones = ref([]);
    const cargandoDevoluciones = ref(false);
    const procesandoDevolucion = ref(false);
    const clienteSearchTermDev = ref('');
    const showClienteDropdownDev = ref(false);
    const clientesFiltradosDev = ref([]);
    const metodosDevoluciones = ref([]);
    const clienteSeleccionadoDev = ref(null);
    const pedidosClienteDev = ref([]);
    
    const nuevaDevolucion = ref({
      id_pedido: '',
      metodo: '',
      monto: null,
      observaciones: '',
      observaciones_adicionales: ''
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

    const fetchClientesConPagosPendientes = async () => {
      try {
        const token = checkAuth();
        if (!token) return;
        
        const response = await fetch('http://localhost:3000/api/pagos/clientes-pendientes', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Error al obtener clientes con pagos pendientes');
        
        const data = await response.json();
        clientes.value = data.data || [];
      } catch (err) {
        console.error('Error al obtener clientes con pagos pendientes:', err);
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

    const fetchMetodosDevoluciones = async () => {
      try {
        const token = checkAuth();
        if (!token) return;
        
        const response = await fetch('http://localhost:3000/api/devoluciones/metodos', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Error al obtener métodos de devolución');
        
        const data = await response.json();
        metodosDevoluciones.value = data.data || [];
      } catch (err) {
        console.error('Error al obtener métodos de devolución:', err);
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

    // Funciones específicas de pagos
    const fetchPedidosClientePago = async (clienteId) => {
      try {
        const token = checkAuth();
        if (!token) return;
        
        const response = await fetch(`http://localhost:3000/api/pagos/pedidos-cliente/${clienteId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Error al obtener pedidos del cliente');
        
        const data = await response.json();
        pedidosClientePago.value = data.data || [];
      } catch (err) {
        console.error('Error al obtener pedidos del cliente:', err);
        pedidosClientePago.value = [];
      }
    };

    const seleccionarClientePago = async (cliente) => {
      clienteSeleccionadoPago.value = cliente;
      nuevoPago.value.id_cliente = cliente.id;
      clienteSearchTermPago.value = `${cliente.nombre} ${cliente.apellido}`;
      showClienteDropdownPago.value = false;
      clientesFiltradosPago.value = [];
      
      // Cargar pedidos del cliente seleccionado
      await fetchPedidosClientePago(cliente.id);
    };

    const cargarPedidosCliente = async (clienteId) => {
      if (!clienteId) {
        pedidosClientePago.value = [];
        return;
      }
      
      await fetchPedidosClientePago(clienteId);
    };

    const registrarPago = async () => {
      if (!nuevoPago.value.id_pedido || !nuevoPago.value.id_metodo_pago || !nuevoPago.value.monto_pagado) {
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

        const result = await response.json();
        
        showMessage('Éxito', result.message, 'success');
        
        // Limpiar formulario
        nuevoPago.value = {
          id_pedido: '',
          id_metodo_pago: '',
          monto_pagado: null,
          vuelto: null,
          observaciones: ''
        };
        clienteSearchTermPago.value = '';
        clienteSeleccionadoPago.value = null;
        pedidosClientePago.value = [];
        
        // Recargar datos
        await fetchPagos();
        await fetchClientesConPagosPendientes();
        
      } catch (err) {
        showMessage('Error', err.message, 'error');
      } finally {
        procesandoPago.value = false;
      }
    };

    // Funciones específicas de devoluciones
    const fetchPedidosClienteDev = async (clienteId) => {
      try {
        const token = checkAuth();
        if (!token) return;
        
        const response = await fetch(`http://localhost:3000/api/devoluciones/pedidos-cliente/${clienteId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Error al obtener pedidos del cliente');
        
        const data = await response.json();
        pedidosClienteDev.value = data.data || [];
      } catch (err) {
        console.error('Error al obtener pedidos del cliente:', err);
        pedidosClienteDev.value = [];
      }
    };

    const seleccionarClienteDev = async (cliente) => {
      clienteSeleccionadoDev.value = cliente;
      nuevaDevolucion.value.id_cliente = cliente.id;
      clienteSearchTermDev.value = `${cliente.nombre} ${cliente.apellido}`;
      showClienteDropdownDev.value = false;
      clientesFiltradosDev.value = [];
      
      // Cargar pedidos del cliente seleccionado
      await fetchPedidosClienteDev(cliente.id);
    };

    const registrarDevolucion = async () => {
      if (!nuevaDevolucion.value.id_cliente || !nuevaDevolucion.value.id_pedido || !nuevaDevolucion.value.metodo) {
        showMessage('Error', 'Complete todos los campos requeridos', 'error');
        return;
      }

      procesandoDevolucion.value = true;
      try {
        const token = checkAuth();
        if (!token) return;

        const payload = {
          id_pedido: nuevaDevolucion.value.id_pedido,
          motivo: nuevaDevolucion.value.observaciones,
          id_metodo_devolucion: metodosDevoluciones.value.find(m => m.metodo === nuevaDevolucion.value.metodo)?.id,
          monto_devolucion: nuevaDevolucion.value.monto || null,
          observaciones_adicionales: nuevaDevolucion.value.observaciones_adicionales || ''
        };

        const response = await fetch('http://localhost:3000/api/devoluciones', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al registrar la devolución');
        }

        showMessage('Éxito', 'Devolución registrada correctamente', 'success');
        
        // Limpiar formulario
        nuevaDevolucion.value = {
          id_cliente: '',
          id_pedido: '',
          metodo: '',
          observaciones: '',
          monto: null,
          observaciones_adicionales: ''
        };
        clienteSearchTermDev.value = '';
        clienteSeleccionadoDev.value = null;
        pedidosClienteDev.value = [];
        
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
        result = result.filter(pago => {
          const nombreCompleto = `${pago.cliente_nombre || ''} ${pago.cliente_apellido || ''}`.toLowerCase();
          const empresa = pago.empresa?.toLowerCase() || '';
          return nombreCompleto.includes(clienteQuery) || empresa.includes(clienteQuery);
        });
      }

      if (filtrosPagos.value.fechaPago) {
        result = result.filter(pago => {
          if (!pago.fecha_de_pago) return false;
          const fechaPago = new Date(pago.fecha_de_pago).toISOString().split('T')[0];
          return fechaPago === filtrosPagos.value.fechaPago;
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
        fechaPago: ''
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
        fetchClientesConPagosPendientes(),
        fetchMetodosPago(),
        fetchMetodosDevoluciones(),
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
      metodosPago,
      
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
      clienteSeleccionadoPago,
      pedidosClientePago,
      
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
      metodosDevoluciones,
      clienteSeleccionadoDev,
      pedidosClienteDev,
      
      // Funciones
      showMessage,
      hideMessage,
      formatDate,
      formatCurrency,
      buscarClientesPago,
      buscarClientesDev,
      seleccionarClientePago,
      seleccionarClienteDev,
      cargarPedidosCliente,
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

<style scoped src="../styles/pagosYdevoluciones/pagosDevoluciones.css">

</style>