import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Configuration Vite pour Zevo
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    host: true,
    hmr: {
      host: 'localhost',
      port: 5173,
    },
  },
  build: {
    // Chunks > 500KB déclenchent un warning
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor — React core (chargé partout, mis en cache longtemps)
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Supabase — auth + realtime
          'vendor-supabase': ['@supabase/supabase-js'],
          // Stripe — uniquement pour le checkout
          'vendor-stripe': ['@stripe/stripe-js'],
          // Charts — lourd, uniquement pour les dashboards
          'vendor-charts': ['recharts'],
          // PDF/CSV — uniquement pour les rapports
          'vendor-export': ['jspdf', 'papaparse'],
        },
      },
    },
    // Terser pour une meilleure compression
    target: 'es2020',
    // Supprime les console.log en prod
    minify: 'esbuild',
  },
})
