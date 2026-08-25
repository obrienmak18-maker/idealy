import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const rawPort = process.env.PORT ?? '4174';
const port = Number(rawPort);

export default defineConfig({
  root: dirname,
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(dirname, 'src') },
    dedupe: ['react', 'react-dom'],
  },
  build: { outDir: path.resolve(dirname, 'dist/public'), emptyOutDir: true },
  server: { port, strictPort: true, host: '0.0.0.0', allowedHosts: true },
  preview: { port, strictPort: true, host: '0.0.0.0', allowedHosts: true },
});
