import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
// VITE_BASE_PATH env var controls the base path for GitHub Pages deployment.
// Set it to '/My_Ai/' in GitHub Actions or leave empty for Vercel/Render.
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || '/',
})
