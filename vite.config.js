import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        signin: path.resolve(__dirname, 'signin.html'),
        signup: path.resolve(__dirname, 'signup.html'),
        manageEvents: path.resolve(__dirname, 'manageEvents.html'),
      }
    }
  },
  publicDir: 'public',
  server: {
    open: true // This will open the browser automatically
  }
});