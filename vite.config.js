import { resolve } from 'path';
import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import solidPlugin from 'vite-plugin-solid';
import devtools from 'solid-devtools/vite'

import packageJson from './package.json';

export default defineConfig({
  base: './',
  server: {
    port: 3030,
  },
  preview: {
    port: 3031,
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext', // you can also use 'es2020' here
    },
  },
  plugins: [
    devtools({ locator: true }),
    solidPlugin(),
    basicSsl(),
  ],
  define: {
    '__APP_VERSION__': JSON.stringify(packageJson.version),
  },
  build: {
    target: 'esnext', // you can also use 'es2020' here
    lib: {
      // Could also be a dictionary or array of multiple entry points
      entry: resolve(__dirname, 'src/main.ts'),
      name: 'Geotools',
      // the proper extensions will be added
      fileName: 'geotools',
    },
  },
});
