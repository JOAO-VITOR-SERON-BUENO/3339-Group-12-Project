<!-- 404 page - shown for any URL that does not match a route -->
<template>
  <main class="text-center mt-20">
    <h1 class="font-bold text-4xl text-red-700 tracking-widest">Page Not Found</h1>
    <p class="mt-6 text-lg text-gray-600">The page you are looking for does not exist.</p>
    <router-link to="/" class="inline-block mt-8 px-4 py-2 bg-red-700 text-white rounded">
      Back to Dashboard
    </router-link>
  </main>
</template>
