import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // This is the CRUCIAL change: it ensures that asset paths (like /src/main.jsx 
  // and links to CSS/images) are relative (./) instead of absolute (/) when built.
  // This is essential for deploying to a subdirectory like public_html on GoDaddy.
  base: './', 
  build: {
    // Ensures the output directory is 'dist' (the default)
    outDir: 'dist', 
  }
});