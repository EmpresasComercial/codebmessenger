import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 5200,
      strictPort: true,
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    preview: {
      allowedHosts: true,
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      minify: 'esbuild',
      // Alerta apenas em chunks acima de 500KB
      chunkSizeWarningLimit: 500,
      rollupOptions: {
        output: {
          // Granularidade maior → chunks menores → carregamento mais rápido
          manualChunks(id) {
            // Bibliotecas React core → chunk separado e cacheável
            if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
              return 'react-core';
            }
            // React Router → chunk separado
            if (id.includes('node_modules/react-router')) {
              return 'react-router';
            }
            // Supabase → chunk separado (grande)
            if (id.includes('@supabase')) {
              return 'supabase';
            }
            // Phone number metadata → separado do pacote inicial
            if (id.includes('/node_modules/libphonenumber-js/')) {
              return 'phone-number';
            }
            if (
              id.includes('/node_modules/motion/') ||
              id.includes('/node_modules/motion-dom/') ||
              id.includes('/node_modules/motion-utils/') ||
              id.includes('/node_modules/framer-motion/')
            ) {
              return 'motion';
            }
            if (id.includes('/node_modules/tailwind-merge/')) {
              return 'tailwind-merge';
            }
            if (
              id.includes('/contexts/translations/') ||
              id.endsWith('/contexts/LanguageContext.tsx')
            ) {
              return 'translations';
            }
            // Lucide icons → chunk separado
            if (id.includes('lucide-react')) {
              return 'icons';
            }
          },
        },
      },
      // Otimizações esbuild
      esbuildOptions: {
        // Remove console.log em produção
        drop: ['console', 'debugger'],
        // Target browsers modernos → bundle menor
        target: 'es2020',
      },
    },
  };
});
