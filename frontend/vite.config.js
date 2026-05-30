import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Teruskan setiap permintaan ke /api/... menuju server backend di port 8787.
  // Dengan ini, kode web cukup memanggil "/api/coach" tanpa pusing soal CORS.
  server: {
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
})
