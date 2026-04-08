import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    nodePolyfills({
      // simple-peer needs crypto, events, util polyfills
      include: ['buffer', 'process', 'events', 'util', 'stream']
    })
  ],
  server: {
    host: true, // Expose to local network
    port: 5174,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
      },
      "/socket.io": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
        ws: true,
      },
      "/uploads": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
      },
    }
  },
  define: {
    global: 'window'
  },
  optimizeDeps: {
    include: ['react', 'react-dom']
  }
})
