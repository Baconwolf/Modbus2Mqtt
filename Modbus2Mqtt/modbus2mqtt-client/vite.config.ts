import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/modbus': {
        target: 'http://localhost:5002',
        changeOrigin: true,
      },
      '/modbushub': {
        target: 'http://localhost:5002',
        ws: true,
      },
    },
  },
})
