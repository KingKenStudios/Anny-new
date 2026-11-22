import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CLIENT_SAFE_ENV_KEYS = [
  'APP_NAME',
  'APP_URL',
  'VITE_STRIPE_PUBLIC_KEY',
  'VITE_USER_ONLY_MODE',
] as const;

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode || 'development', __dirname, '');
  const clientSafeEnv = Object.fromEntries(
    CLIENT_SAFE_ENV_KEYS
      .filter((key) => env[key] !== undefined)
      .map((key) => [key, env[key]])
  );

  return {
    root: __dirname,
    publicDir: path.resolve(__dirname, 'primary-anny', 'public'),
    plugins: [react(), tailwindcss()],
    define: {
      'process.env': clientSafeEnv,
      global: 'globalThis',
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'primary-anny'),
        '@anny': path.resolve(__dirname, 'primary-anny', 'Anny', 'src'),
      },
    },
    optimizeDeps: {
      entries: ['index.html'],
    },
    build: {
      outDir: path.resolve(__dirname, 'dist'),
      emptyOutDir: false,
    },
    server: {
      // HMR is disabled in this environment to avoid broken WebSocket upgrades and editor flickering.
      hmr: false,
      watch: null,
      fs: {
        allow: [__dirname, path.resolve(__dirname, 'primary-anny')],
      },
    },
  };
});
