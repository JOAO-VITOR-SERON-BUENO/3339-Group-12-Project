import { createRouter, createWebHistory } from 'vue-router';
import { useLoggedInUserStore } from '@/store/loggedInUser';

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
    // alias keeps the existing nav links and view redirects working
    alias: '/findclient',
    name: 'Clients',
    component: () => import('@/views/findclient.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/clientdetails/:id',
    name: 'clientdetails',
    component: () => import('@/views/clientdetails.vue'),
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
    alias: '/findevents',
    name: 'Events',
    component: () => import('@/views/findevents.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/eventdetails/:id',
    name: 'eventdetails',
    component: () => import('@/views/eventDetails.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/services',
    alias: '/findservice',
    name: 'Services',
    component: () => import('@/views/findservice.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/servicedetails/:id',
    name: 'servicedetails',
    component: () => import('@/views/servicedetails.vue'),
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
  // role comes from the Pinia store (restored from the JWT on startup)
  const user = useLoggedInUserStore();
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