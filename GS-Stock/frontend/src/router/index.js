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
    meta: { requiresAuth: true, allowedRoles: ['Super Admin', 'Administrador'] }
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
    meta: { requiresAuth: true, allowedRoles: ['Super Admin', 'Administrador'] }
  },
  {
    path: '/inventario',
    name: 'Inventario',
    component: () => import('../views/ProductManagement.vue'),
    meta: { requiresAuth: true, allowedRoles: ['Super Admin', 'Administrador', 'Secretaria', 'Vendedor', 'Encargado de Inventario'] }
  },
  {
    path: '/ventas',
    name: 'Ventas',
    component: () => import('../views/SalesManagment.vue'),
    meta: { requiresAuth: true, allowedRoles: ['Super Admin', 'Administrador', 'Vendedor'] }
  },
  {
    path: '/clientes',
    name: 'Clientes',
    component: () => import('../views/ClientsView.vue'),
    meta: { requiresAuth: true, allowedRoles: ['Super Admin', 'Administrador'] }
  },
  {
    path: '/pagosydevoluciones',
    name: 'Pagos Y Devoluciones',
    component: () => import('../views/PagosDevolucionesView.vue'),
    meta: { requiresAuth: true, allowedRoles: ['Super Admin', 'Administrador','Vendedor'] }
  },
  {
    path: '/rendimiento',
    name: 'Rendimiento',
    component: () => import('../views/Rendimiento/Rendimiento.vue'),
    meta: { requiresAuth: true, allowedRoles: ['Super Admin', 'Administrador', 'Secretaria'] }
  }
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
      // Find the first route the user has access to and redirect there
      try {
        const userRole = user?.rol;
        // find first route in routes array that requiresAuth and allows userRole
        const firstAllowed = routes.find(r => {
          if (!r.meta || !r.meta.requiresAuth) return false;
          if (!r.meta.allowedRoles) return false;
          return r.meta.allowedRoles.includes(userRole);
        });
        if (firstAllowed) return next({ path: firstAllowed.path });
      } catch (err) {
        console.error('Error finding first allowed route:', err);
      }
      // fallback to login if no allowed route
      return next('/');
    }
  }

  next();
});

export default router