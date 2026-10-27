import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // base defaults to '/' — correct for Vercel (was '/Buget_Tracker/' for GitHub Pages)
})
