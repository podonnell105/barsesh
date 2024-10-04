import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        signin: resolve(__dirname, 'public/signin.html'),
        signup: resolve(__dirname, 'public/signup.html')
      }
    }
  }
});