import { defineConfig } from 'vite';

export default defineConfig({
  base: '/KidsGame/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    // PERFORMANCE: Target modern browsers for smaller, faster output
    target: 'es2020',
    // PERFORMANCE: Split Three.js into its own chunk for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
        },
      },
    },
  },
});
