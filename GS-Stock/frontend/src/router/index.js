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
    component: () => import('../views/DashboardView.vue')
  },
  {
    path: '/restablecer',
    name: 'restablecer',
    component: () => import('../views/RestablecerView.vue')
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

// Middleware de autenticación
router.beforeEach((to, from, next) => {
  const publicPages = ['/', '/restablecer'];
  const authRequired = !publicPages.includes(to.path);
  const token = localStorage.getItem('jwtToken');

  if (authRequired && !token) {
    return next('/');
  }

  next();
});

export default router