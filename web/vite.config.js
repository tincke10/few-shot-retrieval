import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The backend (FastAPI) runs on :8000. We proxy its routes there so the frontend
// uses relative URLs and sidesteps CORS in development. The Scrivo contract lives
// at the root (/profiles, /models, /health, /generate); /api/* is the older MVP.
const backend = 'http://localhost:8000'
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/profiles': backend,
      '/models': backend,
      '/health': backend,
      '/generate': backend,
      '/api': backend,
    },
  },
})
