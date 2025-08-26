// frontend/src/tests/unit/HeaderComponent.active.test.js
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { nextTick } from 'vue'
import HeaderComponent from '@/components/HeaderComponent.vue'

const routes = [
  { path: '/', component: { template: '<div>Home</div>' } },
  { path: '/dashboard', component: { template: '<div>Dash</div>' } },
  { path: '/productos', component: { template: '<div>Productos</div>' } },
]

async function mountWithRouter(startPath = '/dashboard') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes,
  })
  await router.push(startPath)
  await router.isReady()

  const wrapper = mount(HeaderComponent, {
    global: {
      plugins: [router],
      stubs: { 'font-awesome-icon': true, RouterView: true },
    },
    attachTo: document.body,
  })
  return { wrapper, router }
}

function isActiveLink(aEl) {
  const classes = aEl.classes()
  return (
    aEl.attributes('aria-current') === 'page' ||
    classes.includes('active') ||
    classes.includes('router-link-active') ||
    classes.includes('router-link-exact-active')
  )
}

describe('HeaderComponent (active link)', () => {
  it('marca como activo el link de /dashboard al cargar esa ruta', async () => {
    const { wrapper } = await mountWithRouter('/dashboard')

    const dash = wrapper.find('a[href="/dashboard"]')
    expect(dash.exists()).toBe(true)
    expect(isActiveLink(dash)).toBe(true)

    // si existe /productos, debería NO estar activo
    const productos = wrapper.find('a[href="/productos"]')
    if (productos.exists()) {
      expect(isActiveLink(productos)).toBe(false)
    }
  })

  it('actualiza el link activo al cambiar de /dashboard -> /productos', async () => {
    const { wrapper, router } = await mountWithRouter('/dashboard')

    await router.push('/productos')
    await nextTick()
    await nextTick()

    const productos = wrapper.find('a[href="/productos"]')
    if (productos.exists()) {
      expect(isActiveLink(productos)).toBe(true)
    }

    const dash = wrapper.find('a[href="/dashboard"]')
    if (dash.exists()) {
      expect(isActiveLink(dash)).toBe(false)
    }
  })
})
