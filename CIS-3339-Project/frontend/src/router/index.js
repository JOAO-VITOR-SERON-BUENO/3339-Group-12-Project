import { createRouter, createWebHistory } from 'vue-router';

// Helper to decode JWT and check expiration
function isTokenValid(token) {
  if (!token) return false;
  try {
    const payloadBase64 = token.split('.')[1];
    const decodedJson = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(decodedJson);
    
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return false; // Expired
    }
    return true;
  } catch (e) {
    return false; // Malformed token
  }
}

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login.vue')
  },
  {
    path: '/',
    name: 'Dashboard',
    component: () => import('@/views/home.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/clients',
    name: 'Clients',
    component: () => import('@/views/findclient.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/clientform',
    name: 'ClientForm',
    component: () => import('@/views/clientform.vue'),
    meta: { requiresAuth: true, requiresRole: 'editor' }
  },
  {
    path: '/eventform',
    name: 'EventForm',
    component: () => import('@/views/eventform.vue'),
    meta: { requiresAuth: true, requiresRole: 'editor' }
  },
  {
    path: '/serviceform',
    name: 'ServiceForm',
    component: () => import('@/views/serviceform.vue'),
    meta: { requiresAuth: true, requiresRole: 'editor' }
  },
  {
    path: '/events',
    name: 'Events',
    component: () => import('@/views/findevents.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/services',
    name: 'Services',
    component: () => import('@/views/findservice.vue'),
    meta: { requiresAuth: true }
  },
  // Catch-all 404 route
  {
    path: '/:catchAll(.*)',
    name: 'NotFound',
    component: () => import('@/views/NotFoundView.vue')
  }
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
});

// Global Navigation Guard for Authentication and Roles
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('authToken');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const loggedIn = !!token && isTokenValid(token);

  if (token && !loggedIn) {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  }

  if (to.meta.requiresAuth && !loggedIn) {
    return next({ name: 'Login' });
  }

  // Enforce role check using requiresRole
  if (to.meta.requiresRole && user.role !== to.meta.requiresRole) {
    return next({ name: 'Dashboard' });
  }

  if (to.name === 'Login' && loggedIn) {
    return next({ name: 'Dashboard' });
  }

  next();
});

export default router;