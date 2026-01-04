import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import prism from 'vite-plugin-prismjs';

// Available Prism.js themes:
// 'default', 'coy', 'dark', 'funky', 'okaidia', 'solarizedlight', 'tomorrow', 'twilight'
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    prism({
      languages: ['javascript', 'clike'],
      plugins: [],
      theme: 'funky',
      css: false,  // Disable default CSS to use custom theme
    }),
  ],
  server: {
    port: 3000,
    open: true, // Automatically open the browser
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: './index.html',
        worker: './src/worker/index.js'
      },
      output: {
        entryFileNames: (chunkInfo) => {
          return chunkInfo.name === 'worker' ? 'worker.js' : '[name].[hash].js';
        }
      }
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
  worker: {
    format: 'es'
  },
  define: {
    global: 'globalThis',
  }
});
