// frontend/src/tests/unit/TallasModal.test.js
import { mount } from '@vue/test-utils'
import TallasModal from '@/components/TallasModal.vue'

describe('TallasModal', () => {
  const tallas = [
    { id_talla: 10, numero: 40, talla_us: 7, stock: 2, precio_par: 199.99 },
    { id_talla: 11, numero: 41, talla_us: 8, stock: 5, precio_par: 209.50 },
  ]

  it('renderiza items y datos cuando show=true', () => {
    const wrapper = mount(TallasModal, {
      props: { show: true, tallas },
    })

    const items = wrapper.findAll('.talla-item')
    expect(items.length).toBe(2)
    expect(wrapper.text()).toContain('EU: 40 / US: 7')
    expect(wrapper.text()).toContain('Stock: 2')
    expect(wrapper.text()).toContain('Precio: Q199.99')

    expect(wrapper.text()).toContain('EU: 41 / US: 8')
    expect(wrapper.text()).toContain('Stock: 5')
    expect(wrapper.text()).toContain('Precio: Q209.5')
  })

  it('emite "close" al hacer click en cerrar (✕ y botón)', async () => {
    const wrapper = mount(TallasModal, {
      props: { show: true, tallas },
    })

    await wrapper.find('.close').trigger('click')
    await wrapper.find('.close-btn').trigger('click')

    const events = wrapper.emitted('close') || []
    expect(events.length).toBeGreaterThanOrEqual(2)
  })

  it('no renderiza nada cuando show=false', () => {
    const wrapper = mount(TallasModal, { props: { show: false, tallas } })

    expect(wrapper.element.nodeType).toBe(Node.COMMENT_NODE) 
    expect(wrapper.text()).toBe('')                           
    expect(wrapper.find('.talla-item').exists()).toBe(false)  
  })
})
