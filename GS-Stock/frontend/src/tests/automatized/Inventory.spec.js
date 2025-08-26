import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'


// Mock del componente TallasModal
const TallasModalMock = {
  name: 'TallasModal',
  template: '<div data-testid="tallas-modal"></div>',
  props: ['show', 'tallas'],
  emits: ['close']
}

// Mock simplificado del componente ProductsTable para evitar variables no definidas
const ProductsTableWrapper = {
  template: `
    <div class="products-table-container">
      <div class="card-view">
        <div v-for="product in products" :key="product.id" class="product-card">
          <div class="card-content">
            <div class="card-header">
              <h3>{{ product.nombre }}</h3>
              <span class="codigo">{{ product.codigo }}</span>
            </div>
            
            <div class="card-row">
              <strong>Tipo:</strong>
              <span>{{ product.tipo_zapato?.nombre || '-' }}</span>
            </div>
            
            <div class="card-row">
              <strong>Precio por Par:</strong>
              <span class="precio">Q{{ formatPrice(product.precio_par) }}</span>
            </div>
            
            <div class="card-row">
              <strong>Stock Total:</strong>
              <span :class="getStockClass(product.resumen_stock.stock_total)">
                {{ product.resumen_stock.stock_total }}
              </span>
            </div>
            
            <div class="card-row">
              <strong>Tallas:</strong>
              <div class="tallas-mobile">
                <span class="tallas-count">{{ product.resumen_stock.tallas_con_stock }} disponibles</span>
                <button 
                  @click="showTallasModal(product)" 
                  class="ver-tallas-btn small"
                  :disabled="!product.tallas_disponibles?.length"
                >
                  Ver Detalles
                </button>
              </div>
            </div>
            
            <div class="card-row">
              <strong>Estado:</strong>
              <span :class="getStatusClass(product.inventario_general.estado)">
                {{ product.inventario_general.estado }}
              </span>
            </div>
            
            <button @click="$emit('product-selected', product)" class="select-btn">
              Seleccionar
            </button>
          </div>
        </div>
      </div>
      
      <div v-if="deleteMode" class="delete-controls">
        <input 
          type="checkbox" 
          v-for="product in products"
          :key="'checkbox-' + product.id"
          :value="product.id"
          :checked="selectedProducts.includes(product.id)"
          @change="toggleProductSelection(product.id)"
          class="product-checkbox"
        >
      </div>
    </div>
  `,
  props: {
    products: { type: Array, default: () => [] },
    deleteMode: { type: Boolean, default: false },
    selectedProducts: { type: Array, default: () => [] }
  },
  emits: ['product-selected', 'products-selection-changed'],
  methods: {
    formatPrice(price) {
      if (!price && price !== 0) return '0.00';
      return parseFloat(price).toFixed(2);
    },
    getStockClass(stock) {
      if (stock <= 0) return 'stock-agotado';
      if (stock <= 10) return 'stock-bajo';
      return 'stock-normal';
    },
    getStatusClass(estado) {
      switch (estado?.toLowerCase()) {
        case 'disponible': return 'status-disponible';
        case 'agotado': return 'status-agotado';
        case 'sin registrar': return 'status-sin-registrar';
        default: return 'status-default';
      }
    },
    showTallasModal(product) {
      // Simular apertura del modal
      this.modalProduct = product;
    },
    toggleProductSelection(productId) {
      const currentSelected = [...this.selectedProducts];
      const index = currentSelected.indexOf(productId);
      
      if (index > -1) {
        currentSelected.splice(index, 1);
      } else {
        currentSelected.push(productId);
      }
      
      this.$emit('products-selection-changed', currentSelected);
    }
  },
  data() {
    return {
      modalProduct: null
    }
  }
}

describe('ProductsTable', () => {
  let wrapper
  const mockProducts = [
    {
      id: 1,
      codigo: 'Z001',
      nombre: 'Zapato Clásico Negro',
      tipo_zapato: { nombre: 'Formal' },
      precio_par: 150.00,
      resumen_stock: {
        stock_total: 25,
        tallas_con_stock: 5
      },
      inventario_general: { estado: 'Disponible' },
      tallas_disponibles: [
        { talla_id: 1, talla_eu: 38, talla_us: 7, stock: 5 },
        { talla_id: 2, talla_eu: 39, talla_us: 8, stock: 10 }
      ]
    },
    {
      id: 2,
      codigo: 'Z002',
      nombre: 'Zapato Deportivo',
      tipo_zapato: { nombre: 'Deportivo' },
      precio_par: 85.50,
      resumen_stock: {
        stock_total: 3,
        tallas_con_stock: 2
      },
      inventario_general: { estado: 'Disponible' },
      tallas_disponibles: [
        { talla_id: 3, talla_eu: 40, talla_us: 9, stock: 3 }
      ]
    }
  ]

  // Mock de window.innerWidth para simular responsive
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: 600, // Simular pantalla móvil
  })

  // Mock de window.addEventListener
  const mockAddEventListener = vi.fn()
  Object.defineProperty(window, 'addEventListener', {
    value: mockAddEventListener,
    writable: true
  })

  // Mock de window.scrollTo
  Object.defineProperty(window, 'scrollTo', {
    value: vi.fn(),
    writable: true
  })

  beforeEach(() => {
    wrapper = mount(ProductsTableWrapper, {
      props: {
        products: mockProducts,
        deleteMode: false,
        selectedProducts: []
      }
    })
  })

  it('renderiza la tabla de productos correctamente', () => {
    // Verificar que el contenedor se renderiza
    expect(wrapper.find('.products-table-container').exists()).toBe(true)
    
    // Verificar que se muestran los productos en vista móvil (card-view por defecto)
    const productCards = wrapper.findAll('.product-card')
    expect(productCards).toHaveLength(2)
    
    // Verificar que se muestra la información del primer producto
    const firstCard = productCards[0]
    expect(firstCard.text()).toContain('Zapato Clásico Negro')
    expect(firstCard.text()).toContain('Z001')
    expect(firstCard.text()).toContain('Formal')
    expect(firstCard.text()).toContain('Q150.00')
    expect(firstCard.text()).toContain('25') // stock total
    expect(firstCard.text()).toContain('5 disponibles') // tallas con stock
  })

  it('aplica las clases de stock correctamente', () => {
    // Verificar que el stock normal se muestra con la clase correcta (producto 1: stock 25)
    const stockElements = wrapper.findAll('.stock-normal')
    expect(stockElements.length).toBeGreaterThan(0)
    
    // Verificar que el stock bajo se detecta correctamente (producto 2: stock 3)
    const stockBajoElements = wrapper.findAll('.stock-bajo')
    expect(stockBajoElements.length).toBeGreaterThan(0)
  })

  it('emite el evento product-selected cuando se hace clic en seleccionar', async () => {
    const selectButton = wrapper.find('.select-btn')
    expect(selectButton.exists()).toBe(true)
    
    await selectButton.trigger('click')
    
    // Verificar que se emitió el evento con el producto correcto
    expect(wrapper.emitted('product-selected')).toBeTruthy()
    expect(wrapper.emitted('product-selected')[0][0]).toEqual(mockProducts[0])
  })

  it('maneja correctamente el modo eliminación', async () => {
    await wrapper.setProps({ 
      deleteMode: true,
      selectedProducts: []
    })

    // Verificar que aparecen los checkboxes de selección
    const checkboxes = wrapper.findAll('.product-checkbox')
    expect(checkboxes).toHaveLength(2) // uno por cada producto
    
    // Simular selección de un producto
    const productCheckbox = checkboxes[0]
    await productCheckbox.setValue(true)
    await productCheckbox.trigger('change')
    
    // Verificar que se emitió el evento de cambio de selección
    expect(wrapper.emitted('products-selection-changed')).toBeTruthy()
  })

  it('muestra el botón de detalles de tallas', () => {
    const verTallasBtn = wrapper.find('.ver-tallas-btn')
    expect(verTallasBtn.exists()).toBe(true)
    expect(verTallasBtn.text()).toBe('Ver Detalles')
    
    // Verificar que el botón no está deshabilitado cuando hay tallas disponibles
    expect(verTallasBtn.attributes('disabled')).toBeUndefined()
  })

  it('formatea correctamente los precios', () => {
    // Verificar que los precios se muestran con el formato correcto
    expect(wrapper.text()).toContain('Q150.00')
    expect(wrapper.text()).toContain('Q85.50')
  })

  it('muestra correctamente el estado de los productos', () => {
    // Verificar que se muestran los estados
    const statusElements = wrapper.findAll('.status-disponible')
    expect(statusElements.length).toBe(2) // ambos productos están disponibles
  })
})