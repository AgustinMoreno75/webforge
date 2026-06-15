import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        login: path.resolve(__dirname, 'login.html'),
        admin: path.resolve(__dirname, 'admin.html'),
        cuenta: path.resolve(__dirname, 'cuenta.html'),
        plans: path.resolve(__dirname, 'plans.html'),
        register: path.resolve(__dirname, 'register.html'),
        verifyEmail: path.resolve(__dirname, 'verify-email.html'),
        resetPassword: path.resolve(__dirname, 'reset-password.html'),
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
