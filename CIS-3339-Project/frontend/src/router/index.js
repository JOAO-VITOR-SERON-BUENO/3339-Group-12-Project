import { createRouter, createWebHistory } from 'vue-router';

// decode JWT and check if it's expired
function isTokenValid(token) {
  if (!token) return false;
  try {
    const payloadBase64 = token.split('.')[1];
    const decodedJson = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(decodedJson);
    
    // Check expiration (exp is in seconds, Date.now() is in milliseconds)
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
  // Example of an editor-only route requiring explicit role enforcement
  {
    path: '/clientform',
    name: 'ClientForm',
    component: () => import('@/views/clientform.vue'),
    meta: { requiresAuth: true, requiresEditor: true }
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

  // If token is invalid or expired, clean it up from storage
  if (token && !loggedIn) {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  }

  // Check if route requires authentication
  if (to.meta.requiresAuth && !loggedIn) {
    return next({ name: 'Login' });
  }

  // Check if route requires editor role
  if (to.meta.requiresEditor && user.role !== 'editor') {
    // Viewer trying to access an editor route gets redirected to Dashboard
    return next({ name: 'Dashboard' });
  }

  // Prevent logged-in users from going back to the login page
  if (to.name === 'Login' && loggedIn) {
    return next({ name: 'Dashboard' });
  }

  next();
});

export default router;