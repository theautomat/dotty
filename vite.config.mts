// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [react()],

  // Public base path
  base: '/',

  // Resolve aliases
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  
  // Server configuration
  server: {
    port: 5173, // Different from the Socket.IO server port
    strictPort: true, // Ensures it doesn't try another port if 5173 is taken
    open: false // Don't open browser automatically
  },
  
  // Build options
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        leaderboard: resolve(__dirname, 'leaderboard.html')
      }
    }
  },
  
  // Make sure these dependencies are properly processed
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'three',
      'socket.io-client',
      'firebase/app',
      'firebase/firestore',
      'firebase/analytics'
    ]
  },

  // Public directory configuration - ensures assets are served correctly
  publicDir: 'public'
});