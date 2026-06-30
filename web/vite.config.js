import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The backend (FastAPI) runs on :8000. We proxy /api there so the frontend can
// use relative URLs and we sidestep CORS entirely during development.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})
