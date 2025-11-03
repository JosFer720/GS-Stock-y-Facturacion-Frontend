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
                  @blur="cerrarDropdownPago"
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

      <!-- TAB DE DEVOLUCIONES -->
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
                  @blur="cerrarDropdownDev"
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

            <!-- Selección de pedido -->
            <div v-if="clienteSeleccionadoDev && pedidosClienteDev.length > 0" class="form-group">
              <label for="dev-pedido">Pedido del Cliente:</label>
              <select 
                id="dev-pedido" 
                v-model="pedidoSeleccionado" 
                @change="cargarProductosPedido"
                required
              >
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
                <small>Solo se pueden devolver pedidos despachados que no tengan devoluciones previas.</small>
              </div>
            </div>

            <!-- Selección de productos a devolver -->
            <div v-if="pedidoSeleccionado && productosDisponibles.length > 0" class="productos-devolucion-section">
              <h3 class="subsection-title">Seleccionar Productos a Devolver</h3>
              
              <div class="productos-list">
                <div 
                  v-for="producto in productosDisponibles" 
                  :key="producto.detalle_id"
                  class="producto-item"
                  :class="{ 'selected': isProductoSeleccionado(producto.detalle_id) }"
                >
                  <div class="producto-header">
                    <input 
                      type="checkbox"
                      :id="`producto-${producto.detalle_id}`"
                      :value="producto.detalle_id"
                      v-model="productosSeleccionados"
                      @change="toggleProducto(producto)"
                    />
                    <label :for="`producto-${producto.detalle_id}`" class="producto-label">
                      <div class="producto-info">
                        <span class="producto-codigo">{{ producto.codigo }}</span>
                        <span class="producto-nombre">{{ producto.nombre }}</span>
                        <span class="producto-talla">Talla: {{ producto.talla_eu }} EU</span>
                      </div>
                      <div class="producto-cantidad-disponible">
                        Disponible: {{ producto.cantidad }} unidades
                      </div>
                    </label>
                  </div>
                  
                  <!-- Campo para cantidad a devolver -->
                  <div v-if="isProductoSeleccionado(producto.detalle_id)" class="cantidad-devolver-container">
                    <label :for="`cantidad-${producto.detalle_id}`">Cantidad a devolver:</label>
                    <input 
                      type="number"
                      :id="`cantidad-${producto.detalle_id}`"
                      :value="cantidadesDevolver[producto.detalle_id] || producto.cantidad"
                      @input="updateCantidadDevolver(producto.detalle_id, $event)"
                      :max="producto.cantidad"
                      :min="1"
                      required
                      class="cantidad-input"
                    />
                    <span class="cantidad-max">/ {{ producto.cantidad }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Motivo de devolución -->
            <div class="form-group">
              <label for="dev-motivo">Motivo de Devolución:</label>
              <textarea 
                id="dev-motivo" 
                v-model="nuevaDevolucion.motivo"
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

            <!-- Resumen de la devolución -->
            <div v-if="productosSeleccionados.length > 0" class="resumen-devolucion">
              <h4>Resumen de la Devolución</h4>
              <div class="resumen-items">
                <div v-for="item in resumenDevolucion" :key="item.detalle_id" class="resumen-item">
                  <span>{{ item.codigo }} - {{ item.nombre }} (Talla {{ item.talla_eu }} EU)</span>
                  <span>{{ item.cantidad }} unidad(es)</span>
                  <span class="resumen-precio">Q{{ formatCurrency(item.monto) }}</span>
                </div>
              </div>
              <div class="resumen-total">
                <strong>Monto Total a Devolver:</strong>
                <strong class="total-amount">Q{{ formatCurrency(montoTotalDevolucion) }}</strong>
              </div>
            </div>

            <button 
              type="submit" 
              class="submit-button" 
              :disabled="procesandoDevolucion || !clienteSeleccionadoDev || pedidosClienteDev.length === 0 || productosSeleccionados.length === 0"
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
import { ref, computed, onMounted, watch } from 'vue';
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
    
    // Estados de devoluciones - NUEVOS Y MODIFICADOS
    const devoluciones = ref([]);
    const cargandoDevoluciones = ref(false);
    const procesandoDevolucion = ref(false);
    const clienteSearchTermDev = ref('');
    const showClienteDropdownDev = ref(false);
    const clientesFiltradosDev = ref([]);
    const clienteSeleccionadoDev = ref(null);
    const pedidosClienteDev = ref([]);
    const pedidoSeleccionado = ref('');
    const productosDisponibles = ref([]);
    const productosSeleccionados = ref([]);
    const cantidadesDevolver = ref({});
    
    const nuevaDevolucion = ref({
      id_pedido: '',
      motivo: '',
      observaciones_adicionales: '',
      productos: []
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

    // Funciones para cerrar dropdowns
    const cerrarDropdownPago = () => {
      setTimeout(() => {
        showClienteDropdownPago.value = false;
      }, 200);
    };

    const cerrarDropdownDev = () => {
      setTimeout(() => {
        showClienteDropdownDev.value = false;
      }, 200);
    };

    // Funciones de carga de datos
    const fetchVendedores = async () => {
      try {
        const token = checkAuth();
        if (!token) return;
        
        const response = await fetch('/api/ventas/vendedores', {
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
        
        const response = await fetch('/api/ventas/clientes', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Error al obtener clientes');
        
        const data = await response.json();
        clientes.value = data.data || [];
        
        console.log('Clientes cargados:', clientes.value.length);
      } catch (err) {
        console.error('Error al obtener clientes:', err);
        clientes.value = [];
      }
    };

    const fetchMetodosPago = async () => {
      try {
        const token = checkAuth();
        if (!token) return;
        
        const response = await fetch('/api/ventas/metodos-pago', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Error al obtener métodos de pago');
        
        const data = await response.json();
        metodosPago.value = data.data || [];
      } catch (err) {
        console.error('Error al obtener métodos de pago:', err);
      }
    };

    // Funciones de búsqueda de clientes
    const buscarClientesPago = () => {
      if (clienteSearchTermPago.value.length < 2) {
        clientesFiltradosPago.value = [];
        return;
      }
      
      const term = clienteSearchTermPago.value.toLowerCase().trim();
      
      clientesFiltradosPago.value = clientes.value.filter(cliente => {
        const nombreCompleto = `${cliente.nombre || ''} ${cliente.apellido || ''}`.toLowerCase().trim();
        const empresa = (cliente.empresa || '').toLowerCase().trim();
        
        return nombreCompleto.includes(term) || empresa.includes(term);
      }).slice(0, 10);
      
      console.log(`Búsqueda pagos: "${term}" encontró ${clientesFiltradosPago.value.length} clientes`);
    };

    const buscarClientesDev = () => {
      if (clienteSearchTermDev.value.length < 2) {
        clientesFiltradosDev.value = [];
        return;
      }
      
      const term = clienteSearchTermDev.value.toLowerCase().trim();
      
      clientesFiltradosDev.value = clientes.value.filter(cliente => {
        const nombreCompleto = `${cliente.nombre || ''} ${cliente.apellido || ''}`.toLowerCase().trim();
        const empresa = (cliente.empresa || '').toLowerCase().trim();
        
        return nombreCompleto.includes(term) || empresa.includes(term);
      }).slice(0, 10);
      
      console.log(`Búsqueda dev: "${term}" encontró ${clientesFiltradosDev.value.length} clientes`);
    };

    // Funciones específicas de pagos
    const fetchPedidosClientePago = async (clienteId) => {
      try {
        const token = checkAuth();
        if (!token) return;
        
        console.log(`Obteniendo pedidos para cliente ID: ${clienteId}`);
        
        const response = await fetch(`/api/pagos/pedidos-cliente/${clienteId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
          console.error(`Error HTTP ${response.status}: ${response.statusText}`);
          throw new Error('Error al obtener pedidos del cliente');
        }
        
        const data = await response.json();
        pedidosClientePago.value = data.data || [];
        
        console.log(`Pedidos encontrados para cliente ${clienteId}:`, pedidosClientePago.value.length);
        
        if (pedidosClientePago.value.length === 0) {
          showMessage('Sin pedidos pendientes', 
            `El cliente seleccionado no tiene pedidos pendientes de pago.`, 
            'warning'
          );
        }
        
      } catch (err) {
        console.error('Error al obtener pedidos del cliente:', err);
        pedidosClientePago.value = [];
        showMessage('Error', 
          `Error al cargar pedidos del cliente: ${err.message}`, 
          'error'
        );
      }
    };

    const seleccionarClientePago = async (cliente) => {
      console.log('Cliente seleccionado para pago:', cliente);
      
      clienteSeleccionadoPago.value = cliente;
      nuevoPago.value.id_cliente = cliente.id;
      clienteSearchTermPago.value = `${cliente.nombre} ${cliente.apellido}${cliente.empresa ? ' - ' + cliente.empresa : ''}`;
      showClienteDropdownPago.value = false;
      clientesFiltradosPago.value = [];
      
      nuevoPago.value.id_pedido = '';
      
      await fetchPedidosClientePago(cliente.id);
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

        console.log('Registrando pago:', nuevoPago.value);

        const response = await fetch('/api/pagos', {
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
        
        await fetchPagos();
        
      } catch (err) {
        showMessage('Error', err.message, 'error');
      } finally {
        procesandoPago.value = false;
      }
    };

    // Funciones específicas de devoluciones - NUEVAS Y MODIFICADAS
    const fetchPedidosClienteDev = async (clienteId) => {
      try {
        const token = checkAuth();
        if (!token) return;
        
        const response = await fetch(`/api/devoluciones/pedidos-cliente/${clienteId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Error al obtener pedidos del cliente');
        
        const data = await response.json();
        pedidosClienteDev.value = data.data || [];
        
        console.log('Pedidos despachados encontrados:', pedidosClienteDev.value);
      } catch (err) {
        console.error('Error al obtener pedidos del cliente:', err);
        pedidosClienteDev.value = [];
      }
    };

    const seleccionarClienteDev = async (cliente) => {
      clienteSeleccionadoDev.value = cliente;
      nuevaDevolucion.value.id_cliente = cliente.id;
      clienteSearchTermDev.value = `${cliente.nombre} ${cliente.apellido}${cliente.empresa ? ' - ' + cliente.empresa : ''}`;
      showClienteDropdownDev.value = false;
      clientesFiltradosDev.value = [];
      
      // Limpiar selección anterior
      pedidoSeleccionado.value = '';
      productosDisponibles.value = [];
      productosSeleccionados.value = [];
      cantidadesDevolver.value = {};
      
      await fetchPedidosClienteDev(cliente.id);
    };

    const cargarProductosPedido = () => {
      if (!pedidoSeleccionado.value) {
        productosDisponibles.value = [];
        return;
      }
      
      const pedido = pedidosClienteDev.value.find(p => p.id === pedidoSeleccionado.value);
      
      if (pedido && pedido.productos) {
        productosDisponibles.value = pedido.productos;
        console.log('Productos disponibles para devolución:', productosDisponibles.value);
      }
      
      // Limpiar selecciones previas
      productosSeleccionados.value = [];
      cantidadesDevolver.value = {};
    };

    const isProductoSeleccionado = (detalleId) => {
      return productosSeleccionados.value.includes(detalleId);
    };

    const toggleProducto = (producto) => {
      if (!isProductoSeleccionado(producto.detalle_id)) {
        // Inicializar cantidad a devolver con la cantidad disponible
        cantidadesDevolver.value[producto.detalle_id] = producto.cantidad;
      } else {
        // Limpiar cantidad si se deselecciona
        delete cantidadesDevolver.value[producto.detalle_id];
      }
    };

    const getCantidadDevolver = (detalleId) => {
      const producto = productosDisponibles.value.find(p => p.detalle_id === detalleId);
      return cantidadesDevolver.value[detalleId] ?? producto?.cantidad ?? 1;
    };

    const updateCantidadDevolver = (detalleId, event) => {
      const producto = productosDisponibles.value.find(p => p.detalle_id === detalleId);
      if (!producto) return;
      
      let cantidad = parseInt(event.target.value);
      
      // Validar que no exceda la cantidad disponible
      if (cantidad > producto.cantidad) {
        cantidad = producto.cantidad;
        event.target.value = cantidad;
      }
      
      if (cantidad < 1) {
        cantidad = 1;
        event.target.value = cantidad;
      }
      
      cantidadesDevolver.value[detalleId] = cantidad;
    };

    // Computed para el resumen de devolución
    const resumenDevolucion = computed(() => {
      return productosSeleccionados.value.map(detalleId => {
        const producto = productosDisponibles.value.find(p => p.detalle_id === detalleId);
        const cantidad = cantidadesDevolver.value[detalleId] ?? producto?.cantidad ?? 1;
        
        if (!producto) return null;
        
        return {
          detalle_id: detalleId,
          codigo: producto.codigo,
          nombre: producto.nombre,
          talla_eu: producto.talla_eu,
          cantidad: cantidad,
          precio_unitario: producto.precio_unitario,
          monto: cantidad * parseFloat(producto.precio_unitario || 0)
        };
      }).filter(item => item !== null);
    });

    const montoTotalDevolucion = computed(() => {
      return resumenDevolucion.value.reduce((total, item) => total + item.monto, 0);
    });

    const registrarDevolucion = async () => {
      if (!clienteSeleccionadoDev.value || !pedidoSeleccionado.value) {
        showMessage('Error', 'Debe seleccionar un cliente y un pedido', 'error');
        return;
      }

      if (productosSeleccionados.value.length === 0) {
        showMessage('Error', 'Debe seleccionar al menos un producto para devolver', 'error');
        return;
      }

      if (!nuevaDevolucion.value.motivo) {
        showMessage('Error', 'Complete el motivo de la devolución', 'error');
        return;
      }

      procesandoDevolucion.value = true;
      try {
        const token = checkAuth();
        if (!token) return;

        // Preparar array de productos a devolver
        const productosADevolver = productosSeleccionados.value.map(detalleId => {
          const producto = productosDisponibles.value.find(p => p.detalle_id === detalleId);
          return {
            detalle_id: detalleId,
            zapato_id: producto.zapato_id,
            talla_id: producto.talla_id,
            cantidad: cantidadesDevolver.value[detalleId] ?? producto.cantidad
          };
        });

        const payload = {
          id_pedido: pedidoSeleccionado.value,
          productos: productosADevolver,
          motivo: nuevaDevolucion.value.motivo,
          observaciones_adicionales: nuevaDevolucion.value.observaciones_adicionales || ''
        };

        console.log('Enviando devolución:', payload);

        const response = await fetch('/api/devoluciones', {
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

        const result = await response.json();

        showMessage('Éxito', result.mensaje || 'Devolución registrada correctamente', 'success');
        
        // Limpiar formulario
        nuevaDevolucion.value = {
          id_cliente: '',
          id_pedido: '',
          motivo: '',
          observaciones_adicionales: '',
          productos: []
        };
        clienteSearchTermDev.value = '';
        clienteSeleccionadoDev.value = null;
        pedidosClienteDev.value = [];
        pedidoSeleccionado.value = '';
        productosDisponibles.value = [];
        productosSeleccionados.value = [];
        cantidadesDevolver.value = {};
        
        // Recargar devoluciones
        await fetchDevoluciones();
        
      } catch (err) {
        console.error('Error al registrar devolución:', err);
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
        
        const response = await fetch('/api/pagos', {
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
        
        const response = await fetch('/api/devoluciones', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Error al obtener devoluciones');
        
        const data = await response.json();
        devoluciones.value = data.data || [];
        
        console.log('Devoluciones cargadas:', devoluciones.value);
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
      console.log('Iniciando carga de datos...');
      
      await Promise.all([
        fetchVendedores(),
        fetchClientes(),
        fetchMetodosPago(),
        fetchPagos(),
        fetchDevoluciones()
      ]);
      
      console.log('Datos cargados. Clientes:', clientes.value.length);
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
      clienteSeleccionadoDev,
      pedidosClienteDev,
      pedidoSeleccionado,
      productosDisponibles,
      productosSeleccionados,
      cantidadesDevolver,
      resumenDevolucion,
      montoTotalDevolucion,
      
      // Funciones
      showMessage,
      hideMessage,
      formatDate,
      formatCurrency,
      buscarClientesPago,
      buscarClientesDev,
      seleccionarClientePago,
      seleccionarClienteDev,
      registrarPago,
      registrarDevolucion,
      cargarProductosPedido,
      isProductoSeleccionado,
      toggleProducto,
      getCantidadDevolver,
      updateCantidadDevolver,
      actualizarFiltrosPagos,
      actualizarFiltrosDevoluciones,
      limpiarFiltrosPagos,
      limpiarFiltrosDevoluciones,
      cerrarDropdownPago,
      cerrarDropdownDev
    };
  }
}
</script>

<style scoped src="../styles/pagosYdevoluciones/pagosDevoluciones.css">
</style>