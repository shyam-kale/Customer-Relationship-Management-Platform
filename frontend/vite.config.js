import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Base path: '/' locally, '/Customer-Relationship-Management-Platform/' on GitHub Pages
const base = process.env.GITHUB_PAGES === 'true'
  ? '/Customer-Relationship-Management-Platform/'
  : '/'

export default defineConfig({
  base,
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
  build: {
    // es2022 supports top-level await & is supported by all modern browsers
    target: 'es2022',
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor':  ['react', 'react-dom', 'react-router-dom'],
          'charts-vendor': ['recharts'],
          'lucide-vendor': ['lucide-react'],
          'utils-vendor':  ['axios', 'canvas-confetti'],
        },
      },
    },
  },
})
