import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // VITE_ROOT_API is baked into the bundle at build time, so warn if it is missing
  const env = loadEnv(mode, fileURLToPath(new URL('.', import.meta.url)))
  if (command === 'build' && !env.VITE_ROOT_API) {
    console.warn(
      '\n[vite] VITE_ROOT_API is not set - API requests will go to the frontend host. ' +
        'Create frontend/.env (see .env.example) before building for production.\n'
    )
  }

  return {
    // public path the app is served from - '/' locally, '/<repo>/' on GitHub Pages (set by the deploy workflow)
    base: process.env.BASE_PATH || '/',
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    }
  }
})
