import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'

const routes = [
  {
    path: '/',
    name: 'login',
    component: LoginView
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('../views/DashboardView.vue'),
    meta: { requiresAuth: true, allowedRoles: ['Administrador', 'Secretaria', 'Vendedor', 'Encargado de Inventario'] }
  },
  {
    path: '/restablecer',
    name: 'restablecer',
    component: () => import('../views/RestablecerView.vue')
  },
  {
    path: '/cambiar',
    name: 'cambiar',
    component: () => import('../views/CambiarView.vue')
  },
  {
    path: '/usuarios',
    name: 'usuarios',
    component: () => import('../views/UserManagementView.vue'),
    meta: { requiresAuth: true, allowedRoles: ['Administrador'] }
  },
  {
    path: '/inventario',
    name: 'Inventario',
    component: () => import('../views/ProductManagement.vue'),
    meta: { requiresAuth: true, allowedRoles: ['Administrador', 'Secretaria', 'Vendedor', 'Encargado de Inventario'] }
  },
  {
    path: '/ventas',
    name: 'Ventas',
    component: () => import('../views/SalesManagment.vue'),
    meta: { requiresAuth: true, allowedRoles: ['Administrador', 'Secretaria', 'Vendedor'] }
  },
  {
    path: '/clientes',
    name: 'Clientes',
    component: () => import('../views/ClientsView.vue'),
    meta: { requiresAuth: true, allowedRoles: ['Administrador'] }
  },
  {
    path: '/pagosydevoluciones',
    name: 'Pagos Y Devoluciones',
    component: () => import('../views/PagosDevolucionesView.vue'),
    meta: { requiresAuth: true, allowedRoles: ['Administrador','Secretaria', 'Vendedor'] }
  },

]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

router.beforeEach((to, from, next) => {
  const publicPages = ['/', '/restablecer', '/cambiar'];
  const authRequired = to.matched.some(record => record.meta.requiresAuth);
  const token = localStorage.getItem('jwtToken');
  const user = JSON.parse(localStorage.getItem('user'));

  if (authRequired && !token) {
    return next('/');
  }

  if (authRequired && token) {
    const allowedRoles = to.meta.allowedRoles;
    if (allowedRoles && !allowedRoles.includes(user?.rol)) {
      return next('/dashboard'); // Or show access denied
    }
  }

  next();
});

export default router