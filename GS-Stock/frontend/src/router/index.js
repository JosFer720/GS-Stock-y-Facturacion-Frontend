import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'
import SalesManagment from '@/views/SalesManagment.vue';

const routes = [
  {
    path: '/',
    name: 'login',
    component: LoginView
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('../views/DashboardView.vue')
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
    component: () => import('../views/UserManagementView.vue')
  },
  {
    path: '/inventario',
    name: 'Inventario',
    component: () => import('../views/ProductManagement.vue')
  },
  {
    path: '/ventas',
    name: 'Ventas',
    component: () => import('../views/SalesManagment.vue')
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

// Middleware de autenticación
router.beforeEach((to, from, next) => {
  const publicPages = ['/', '/restablecer', '/cambiar'];
  const authRequired = !publicPages.includes(to.path);
  const token = localStorage.getItem('jwtToken');

  if (authRequired && !token) {
    return next('/');
  }

  next();
});


export default router