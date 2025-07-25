<template>
  <div class="sales-management-container">
    <header-component />

    <div class="content-section">
      <div class="page-title">Gestión de Ventas</div>

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

      <div class="facturas-section">
        <historial-facturas />
      </div>
    </div>

    <div v-if="showAddSaleModal" class="modal">
      <div class="modal-content">
        <span class="close" @click="showAddSaleModal = false">&times;</span>
        <h2>Agregar Nueva Venta</h2>
        <form @submit.prevent="addSale">
          <div class="form-group">
            <label for="empresa_cliente">Empresa del Cliente:</label>
            <div style="display: flex; gap: 10px;">
              <input 
                type="text" 
                id="empresa_cliente" 
                v-model="newSale.empresa_cliente" 
                placeholder="Nombre de la empresa"
                :disabled="buscandoCliente"
              >
              <button 
                type="button" 
                @click="buscarClientePorEmpresa"
                :disabled="buscandoCliente"
                class="search-button"
              >
                {{ buscandoCliente ? 'Buscando...' : 'Buscar' }}
              </button>
            </div>
          </div>

          <div v-if="clienteEncontrado && mostrarConfirmacionCliente" class="cliente-confirmacion">
            <p><strong>¿El cliente responsable es:</strong></p>
            <p>{{ clienteEncontrado.nombre }} {{ clienteEncontrado.apellido }}</p>
            <p><small>Empresa: {{ clienteEncontrado.empresa }}</small></p>
            <div style="display: flex; gap: 10px; margin-top: 10px;">
              <button type="button" @click="confirmarCliente" class="confirm-button">Confirmar</button>
              <button type="button" @click="cancelarCliente" class="cancel-button">Cancelar</button>
            </div>
          </div>

          <div class="form-group">
            <label for="nit">NIT:</label>
            <input 
              type="text" 
              id="nit" 
              v-model="newSale.nit" 
              placeholder="NIT del cliente"
            >
          </div>

          <div class="form-group">
            <label for="direccion_facturacion">Dirección de Facturación:</label>
            <input 
              type="text" 
              id="direccion_facturacion" 
              v-model="newSale.direccion_facturacion" 
              placeholder="Dirección completa"
            >
          </div>

          <div class="form-group">
            <label for="telefono_cliente">Teléfono:</label>
            <input 
              type="text" 
              id="telefono_cliente" 
              v-model="newSale.telefono_cliente" 
              placeholder="Teléfono del cliente"
            >
          </div>

          <div class="form-group">
            <label for="id_vendedor">Vendedor:</label>
            <select 
              id="id_vendedor" 
              v-model="newSale.id_vendedor" 
              required
            >
              <option value="">Seleccione un vendedor</option>
              <option v-for="vendedor in vendedores" :key="vendedor.id" :value="vendedor.id">
                {{ vendedor.nombre }} {{ vendedor.apellido }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label for="id_metodo_pago">Método de Pago:</label>
            <select 
              id="id_metodo_pago" 
              v-model="newSale.id_metodo_pago" 
              required
            >
              <option value="">Seleccione un método</option>
              <option v-for="metodo in metodosPago" :key="metodo.id" :value="metodo.id">
                {{ metodo.tipo }}
              </option>
            </select>
          </div>

          <div class="productos-section">
            <label>Productos:</label>
            <div 
              v-for="(producto, index) in newSale.productos" 
              :key="index"
              class="producto-item"
            >
              <input
                type="number"
                placeholder="ID Zapato"
                v-model.number="producto.id_zapato"
                required
                min="1"
                class="producto-id-input"
              >
              <input 
                type="number" 
                placeholder="Cantidad"
                v-model.number="producto.cantidad" 
                required
                min="1"
                class="cantidad-input"
              >
              <button 
                type="button" 
                @click="eliminarProducto(index)"
                v-if="newSale.productos.length > 1"
                class="remove-product-button"
              >
                ✕
              </button>
            </div>
            <button type="button" @click="agregarProducto" class="add-product-button">
              + Agregar Producto
            </button>
          </div>
          <div class="form-group">
            <label for="id_estado_pedido">Estado del Pedido:</label>
            <select 
              id="id_estado_pedido" 
              v-model="newSale.id_estado_pedido" 
              required
            >
              <option value="">Seleccione un estado</option>
              <option v-for="estado in estadosPedidos" :key="estado.id" :value="estado.id">
                {{ estado.estado }}
              </option>
            </select>
          </div>

          <div class="totales-section">
            <div class="form-group">
              <label for="subtotal">Subtotal:</label>
              <input 
                type="number" 
                id="subtotal" 
                v-model="newSale.subtotal"
                required
                min="0"
                step="0.01"
              >
            </div>

            <div class="form-group">
              <label for="total">Total:</label>
              <input 
                type="number" 
                id="total" 
                v-model="newSale.total"
                required
                min="0"
                step="0.01"
              >
            </div>
          </div>

          <button type="submit" class="submit-button" :disabled="!newSale.id_cliente">
            Guardar Venta
          </button>
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
            <div class="detail-row">
              <strong>ID Pedido:</strong> {{ selectedSale.pedido_id }}
            </div>
            <div class="detail-row">
              <strong>Cliente:</strong> {{ selectedSale.cliente }}
            </div>
            <div class="detail-row">
              <strong>Vendedor:</strong> {{ selectedSale.vendedor }}
            </div>
            <div class="detail-row">
              <strong>Fecha:</strong> {{ formatDate(selectedSale.fecha) }}
            </div>
            <div class="detail-row">
              <strong>Estado:</strong> 
              <span :class="getStatusClass(selectedSale.estado_pedido)">
                {{ selectedSale.estado_pedido }}
              </span>
            </div>
            <div class="detail-row">
              <strong>Método de Pago:</strong> {{ selectedSale.metodo_pago }}
            </div>
          </div>
          
          <div class="detail-section">
            <h3>Productos</h3>
            <div class="products-detail">
              <div 
                v-for="(product, index) in selectedSale.productos" 
                :key="index"
                class="product-detail-item"
              >
                <div class="product-name">{{ product.zapato }}</div>
                <div class="product-quantity">Cantidad: {{ product.cantidad }}</div>
              </div>
            </div>
          </div>
          
          <div class="detail-section">
            <h3>Totales</h3>
            <div class="totals-section">
              <div class="detail-row">
                <strong>Subtotal:</strong> ${{ formatCurrency(selectedSale.subtotal) }}
              </div>
              <div class="detail-row total-row">
                <strong>Total:</strong> ${{ formatCurrency(selectedSale.total) }}
              </div>
            </div>
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
import { ref, computed, onMounted, watch } from 'vue';
import VentasTabla from '@/components/VentasTabla.vue';
import HeaderComponent from '@/components/HeaderComponent.vue';
import ModalMessage from '@/components/ModalMessage.vue';
import { useRouter } from 'vue-router';
import HistorialFacturas from '@/components/HistorialFacturas.vue';
import { io } from 'socket.io-client';

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
    const socket = io('http://localhost:3000');
    
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
    
    const vendedores = ref([]);
    const metodosPago = ref([]);
    const estadosPedidos = ref([]); 
    const productosDisponibles = ref([]);
    
    const filters = ref({
      date: '',
      client: '',
      status: ''
    });

    const newSale = ref({
      empresa_cliente: '',
      id_cliente: '',
      id_vendedor: '',
      id_metodo_pago: '',
      id_estado_pedido: '', 
      productos: [{ id_zapato: '', cantidad: '' }],
      subtotal: 0, 
      total: 0,    
      nit: '', 
      direccion_facturacion: '', 
      telefono_cliente: ''
    });

    const clienteEncontrado = ref(null);
    const mostrarConfirmacionCliente = ref(false);
    const buscandoCliente = ref(false);

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

    const fetchVendedores = async () => {
      try {
        const token = checkAuth();
        if (!token) return;
        
        const response = await fetch('http://localhost:3000/api/vendedores', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Error al obtener vendedores');
        
        const data = await response.json();
        vendedores.value = data.data || [];
      } catch (err) {
        showMessage('Error', err.message, 'error');
      }
    };
    
    const fetchMetodosPago = async () => {
      try {
        const token = checkAuth();
        if (!token) return;
        
        const response = await fetch('http://localhost:3000/api/metodos-pago', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Error al obtener métodos de pago');
        
        const data = await response.json();
        metodosPago.value = data.data || [];
      } catch (err) {
        showMessage('Error', err.message, 'error');
      }
    };

    const fetchEstadosPedidos = async () => {
      try {
        const token = checkAuth();
        if (!token) return;
        
        const response = await fetch('http://localhost:3000/api/estados-pedidos', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Error al obtener estados de pedidos');
        
        const data = await response.json();
        estadosPedidos.value = data.data || [];
        
        if (estadosPedidos.value.length > 0) {
          const estadoEnBodega = estadosPedidos.value.find(estado => estado.id === 1);
          if (estadoEnBodega && !newSale.value.id_estado_pedido) {
            newSale.value.id_estado_pedido = estadoEnBodega.id;
          }
        }
      } catch (err) {
        showMessage('Error', err.message, 'error');
      }
    };

    // AÑADIDA: Función para verificar stock (de la versión 2)
    const verificarStock = async (productos) => {
      try {
        const token = checkAuth();
        if (!token) return;
        
        const response = await fetch('http://localhost:3000/api/inventario/verificar-stock', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ productos })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al verificar stock');
        }
        
        return await response.json();
      } catch (err) {
        throw err;
      }
    };

    const buscarClientePorEmpresa = async () => {
      if (!newSale.value.empresa_cliente.trim()) {
        showMessage('Error', 'Ingrese el nombre de la empresa', 'error');
        return;
      }

      buscandoCliente.value = true;
      
      try {
        const token = checkAuth();
        if (!token) return;
        
        const response = await fetch(`http://localhost:3000/api/buscar-cliente-empresa/${encodeURIComponent(newSale.value.empresa_cliente)}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
          throw new Error('No se encontró la empresa');
        }

        const data = await response.json();
        if (data.success && data.data.length > 0) {
          clienteEncontrado.value = data.data[0];
          // Auto-llenar campos adicionales
          newSale.value.nit = clienteEncontrado.value.nit || '';
          newSale.value.direccion_facturacion = clienteEncontrado.value.direccion || '';
          newSale.value.telefono_cliente = clienteEncontrado.value.telefono || '';
          mostrarConfirmacionCliente.value = true;
        } else {
          showMessage('Error', 'No se encontraron clientes para esta empresa', 'error');
        }
      } catch (err) {
        showMessage('Error', err.message, 'error');
      } finally {
        buscandoCliente.value = false;
      }
    };

    const confirmarCliente = () => {
      newSale.value.id_cliente = clienteEncontrado.value.id;
      mostrarConfirmacionCliente.value = false;
      showMessage('Éxito', 'Cliente confirmado', 'success');
    };

    const cancelarCliente = () => {
      clienteEncontrado.value = null;
      mostrarConfirmacionCliente.value = false;
      newSale.value.empresa_cliente = '';
      newSale.value.nit = '';
      newSale.value.direccion_facturacion = '';
      newSale.value.telefono_cliente = '';
    };

    const agregarProducto = () => {
      newSale.value.productos.push({ id_zapato: '', cantidad: '' });
    };

    const eliminarProducto = (index) => {
      if (newSale.value.productos.length > 1) {
        newSale.value.productos.splice(index, 1);
      }
    };

    const openAddSaleModal = () => {
      newSale.value = {
        empresa_cliente: '',
        id_cliente: '',
        id_vendedor: '',
        id_metodo_pago: '',
        id_estado_pedido: estadosPedidos.value.length > 0 ? estadosPedidos.value[0].id : '', 
        productos: [{ id_zapato: '', cantidad: '' }],
        subtotal: '',
        nit: '', 
        direccion_facturacion: '', 
        telefono_cliente: '', 
        total: ''
      };
      clienteEncontrado.value = null;
      mostrarConfirmacionCliente.value = false;
      showAddSaleModal.value = true;
    };

    // FUNCIÓN COMBINADA: Verifica stock Y genera factura
    const addSale = async () => {
      try {
        const token = checkAuth();
        if (!token) return;

        // Validación mejorada
        if (!newSale.value.id_cliente || !newSale.value.nit || 
            !newSale.value.direccion_facturacion || !newSale.value.telefono_cliente) {
          showMessage('Error', 'Complete todos los campos del cliente', 'error');
          return;
        }

        // Validar productos
        for (let i = 0; i < newSale.value.productos.length; i++) {
          const producto = newSale.value.productos[i];
          if (!producto.id_zapato || !producto.cantidad) {
            showMessage('Error', `Complete el producto ${i + 1}`, 'error');
            return;
          }
          
          if (isNaN(parseInt(producto.id_zapato)) || isNaN(parseInt(producto.cantidad))) {
            showMessage('Error', `El producto ${i + 1} tiene valores inválidos`, 'error');
            return;
          }
        }

        // Validar montos
        if (!newSale.value.subtotal || !newSale.value.total) {
          showMessage('Error', 'Complete los montos (subtotal y total)', 'error');
          return;
        }

        const subtotalNum = parseFloat(newSale.value.subtotal);
        const totalNum = parseFloat(newSale.value.total);
        
        if (isNaN(subtotalNum) || isNaN(totalNum) || subtotalNum < 0 || totalNum < 0) {
          showMessage('Error', 'Los montos deben ser números válidos y positivos', 'error');
          return;
        }

        // Preparar productos para verificar stock
        const productosParaVerificar = newSale.value.productos.map(p => ({
          id_zapato: parseInt(p.id_zapato),
          cantidad: parseInt(p.cantidad)
        }));

        // PASO 1: Verificar stock antes de proceder
        console.log('Verificando stock para productos:', productosParaVerificar);
        await verificarStock(productosParaVerificar);
        console.log('Stock verificado correctamente');

        // PASO 2: Preparar datos para la factura
        const facturaData = {
          id_cliente: parseInt(newSale.value.id_cliente),
          id_metodo_pago: parseInt(newSale.value.id_metodo_pago),
          nit: newSale.value.nit.trim(),
          items: productosParaVerificar,
          subtotal: subtotalNum,
          total: totalNum,
          direccion_facturacion: newSale.value.direccion_facturacion.trim(),
          telefono_cliente: newSale.value.telefono_cliente.trim(),
          id_usuario: parseInt(newSale.value.id_vendedor)
        };

        console.log('Datos de factura a enviar:', facturaData);

        // PASO 3: Crear factura (esto también debería descontar automáticamente el stock)
        const response = await fetch('http://localhost:3000/api/crear-factura', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(facturaData)
        });

        console.log('Respuesta del servidor:', response.status, response.statusText);

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Error del servidor:', errorData);
          throw new Error(errorData.details || errorData.error || 'Error al crear la factura');
        }

        // Verificar que la respuesta es un PDF
        const contentType = response.headers.get('content-type');
        console.log('Tipo de contenido:', contentType);
        
        if (!contentType || !contentType.includes('application/pdf')) {
          throw new Error('La respuesta no es un PDF válido');
        }

        // Manejar la respuesta PDF
        const blob = await response.blob();
        console.log('Tamaño del PDF:', blob.size);
        
        if (blob.size === 0) {
          throw new Error('El PDF generado está vacío');
        }
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `factura_${new Date().getTime()}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);

        showMessage('Éxito', 'Venta registrada, inventario actualizado y factura generada correctamente', 'success');
        showAddSaleModal.value = false;
        fetchSales();
      } catch (err) {
        console.error('Error completo:', err);
        showMessage('Error', err.message, 'error');
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

    const fetchSales = async () => {
      const token = checkAuth();
      if (!token) return;
      
      loading.value = true;
      error.value = null;
      
      try {
        const response = await fetch('http://localhost:3000/api/ventas', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al cargar las ventas');
        }
        
        const data = await response.json();
        console.log('Datos de ventas recibidos:', data);
        
        sales.value = data.data || [];
        
        if (sales.value.length === 0) {
          showMessage('Información', 'No hay ventas registradas en el sistema', 'info');
        }
        
      } catch (err) {
        error.value = `Error: ${err.message}`;
        console.error('Error al obtener ventas:', err);
        showMessage('Error', `No se pudieron cargar las ventas: ${err.message}`, 'error');
      } finally {
        loading.value = false;
      }
    };

    const handleSaleSelection = (sale) => {
      selectedSale.value = sale;
      console.log('Venta seleccionada:', sale);
    };

    const handleStatusUpdate = async ({ pedido_id, nuevo_estado }) => {
      try {
        const token = checkAuth();
        const response = await fetch(`http://localhost:3000/api/ventas/${pedido_id}/estado`, {
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

        // Actualizar el estado localmente de forma inmutable
        sales.value = sales.value.map(sale => {
          if (sale.pedido_id === pedido_id) {
            return { ...sale, estado_pedido: nuevo_estado };
          }
          return sale;
        });

        showMessage('Éxito', 'Estado actualizado correctamente', 'success');
      } catch (err) {
        showMessage('Error', err.message, 'error');
        // Recargar las ventas para sincronizar con el servidor
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
          sale.cliente.toLowerCase().includes(clientQuery)
        );
      }

      if (filters.value.status) {
        result = result.filter(sale => 
          sale.estado_pedido.toLowerCase() === filters.value.status.toLowerCase()
        );
      }

      return result;
    });

    onMounted(() => {
      fetchSales();
      fetchVendedores();
      fetchMetodosPago();
      fetchEstadosPedidos();

      socket.on('inventory_updated', (data) => {
        console.log('Inventario actualizado:', data);
        showMessage('Inventario actualizado', `Zapato ID ${data.id_zapato} nuevo stock: ${data.nuevoStock}`, 'info');
      });
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
      filters,
      newSale,
      showMessage,
      hideMessage,
      openAddSaleModal,
      addSale,
      formatDate,
      formatCurrency,
      getStatusClass,
      viewSaleDetails,
      applyFilters,
      resetFilters,
      fetchSales,
      handleSaleSelection,
      handleStatusUpdate,
      filteredSales,
      clienteEncontrado,
      mostrarConfirmacionCliente,
      buscandoCliente,
      buscarClientePorEmpresa,
      confirmarCliente,
      cancelarCliente,
      agregarProducto,
      eliminarProducto,
      vendedores,
      metodosPago,
      estadosPedidos,
      verificarStock
    };
  }
}
</script>

<style scoped>
/* Agregar nuevos estilos */
.producto-id-input,
.cantidad-input {
  flex: 1;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.readonly-input {
  background-color: #f8f9fa;
  color: #6c757d;
  cursor: not-allowed;
}

/* Ajustar espaciado entre campos */
.totales-section {
  display: flex;
  gap: 15px;
}

.totales-section .form-group {
  flex: 1;
}

/* Media query para dispositivos móviles */
@media (max-width: 576px) {
  .producto-item {
    flex-direction: column;
    gap: 10px;
  }
  
  .producto-id-input,
  .cantidad-input {
    width: 100%;
  }
}

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

.filter-group input,
.filter-group select {
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

.action-button {
  padding: 12px 16px;
  border: 1px solid #333;
  border-radius: 4px;
  background-color: white;
  cursor: pointer;
  transition: background-color 0.2s, transform 0.1s;
  color: #333;
  width: 100%;
  font-size: 16px;
  text-align: center;
}

.action-button:hover {
  background-color: #f0f0f0;
}

.action-button:active {
  transform: scale(0.98);
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
  max-width: 500px;
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

.sale-details {
  text-align: left;
}

.detail-section {
  margin-bottom: 25px;
  padding: 15px;
  background-color: #f8f9fa;
  border-radius: 6px;
}

.detail-section h3 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #333;
  font-size: 18px;
  border-bottom: 1px solid #dee2e6;
  padding-bottom: 8px;
}

.detail-row {
  margin-bottom: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px 0;
}

.detail-row strong {
  color: #333;
  min-width: 120px;
}

.total-row {
  font-size: 18px;
  color: #2e7d32;
  border-top: 2px solid #dee2e6;
  padding-top: 10px;
  margin-top: 10px;
}

.products-detail {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.product-detail-item {
  padding: 10px;
  background-color: white;
  border-radius: 4px;
  border: 1px solid #dee2e6;
}

.product-name {
  font-weight: bold;
  color: #333;
  margin-bottom: 5px;
}

.product-quantity {
  color: #666;
  font-size: 14px;
}

.totals-section {
  background-color: white;
  padding: 15px;
  border-radius: 4px;
  border: 1px solid #dee2e6;
}

/* Form styles */
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

.form-group input[readonly] {
  background-color: #f8f9fa;
  color: #6c757d;
}

.submit-button {
  padding: 12px 16px;
  border: none;
  border-radius: 4px;
  background-color: #4CAF50;
  color: white;
  cursor: pointer;
  transition: background-color 0.2s;
  font-size: 16px;
  width: 100%;
  margin-top: 10px;
}

.submit-button:hover {
  background-color: #45a049;
}

.submit-button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

/* Status badges */
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

.cliente-confirmacion {
  background-color: #e8f5e8;
  padding: 15px;
  border-radius: 6px;
  margin: 10px 0;
  border: 1px solid #4caf50;
}

.search-button {
  padding: 8px 12px;
  background-color: #2196F3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  min-width: 80px;
}

.search-button:hover {
  background-color: #1976D2;
}

.search-button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.confirm-button {
  background-color: #4CAF50;
  color: white;
  padding: 8px 15px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.confirm-button:hover {
  background-color: #45a049;
}

.cancel-button {
  background-color: #f44336;
  color: white;
  padding: 8px 15px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.cancel-button:hover {
  background-color: #d32f2f;
}

.productos-section {
  margin: 15px 0;
}

.productos-section label {
  display: block;
  margin-bottom: 10px;
  font-weight: bold;
  color: #333;
}

.producto-item {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
  align-items: center;
}

.producto-select {
  flex: 2;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.cantidad-input {
  flex: 1;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.remove-product-button {
  background-color: #f44336;
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
  flex-shrink: 0;
}

.remove-product-button:hover {
  background-color: #d32f2f;
}

.add-product-button {
  background-color: #4CAF50;
  color: white;
  padding: 8px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 10px;
  font-size: 14px;
}

.add-product-button:hover {
  background-color: #45a049;
}

.totales-section {
  background-color: #f8f9fa;
  padding: 15px;
  border-radius: 6px;
  border: 1px solid #dee2e6;
  margin: 15px 0;
}

/* Media Queries - Tablet */
@media (min-width: 576px) {
  .content-section {
    padding: 20px;
    margin-top: 70px;
  }
  
  .page-title {
    font-size: 22px;
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

  .producto-item {
    flex-wrap: nowrap;
  }
}

/* Media Queries - Desktop */
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
  
  .list-title {
    font-size: 20px;
  }
  
  .detail-row {
    justify-content: flex-start;
    gap: 20px;
  }
  
  .detail-row strong {
    min-width: 150px;
  }
  
  .modal-content {
    max-width: 600px;
  }
}

.facturas-section {
  width: 100%;
  margin-top: 40px;
  padding: 0 15px;
}

@media (min-width: 768px) {
  .facturas-section {
    padding: 0;
  }
}
</style>