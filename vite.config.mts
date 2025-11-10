// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      // Enable polyfills for specific globals and modules
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      // Enable polyfills for specific Node.js modules
      protocolImports: true,
    }),
  ],

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
    port: 5173,
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
        leaderboard: resolve(__dirname, 'leaderboard.html'),
        treasure: resolve(__dirname, 'treasure.html'),
        hideTreasure: resolve(__dirname, 'hide-treasure.html')
      }
    }
  },

  // Make sure these dependencies are properly processed
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'three',
      'firebase/app',
      'firebase/firestore',
      'firebase/analytics',
      '@coral-xyz/anchor',
      '@solana/web3.js',
      '@solana/wallet-adapter-base',
      '@solana/wallet-adapter-react',
      '@solana/wallet-adapter-react-ui',
      '@solana/wallet-adapter-wallets',
      '@solana/spl-token'
    ],
    esbuildOptions: {
      target: 'esnext'
    }
  },

  // Public directory configuration - ensures assets are served correctly
  publicDir: 'public'
});
