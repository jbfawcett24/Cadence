import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react({ jsxImportSource: '@emotion/react' })],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true, // Prevents Vite from falling back to another port
  },
})
