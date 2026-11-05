import { defineConfig, loadEnv } from 'vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig(({ mode }) => ({
  plugins: [{
    name: 'ad-build-mode',
    generateBundle() {
      const env = loadEnv(mode, process.cwd(), 'VITE_');
      this.emitFile({ type: 'asset', fileName: 'ad-build.json', source: JSON.stringify({
        testAds: env.VITE_AD_TEST === '1', qa: env.VITE_QA === '1',
        versionName: env.VITE_APP_VERSION || '1.0.7', versionCode: Number(env.VITE_VERSION_CODE || 8),
      }) });
    },
  }],
  base: './',
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 3000,
    rollupOptions: { output: { manualChunks: { phaser: ['phaser'] } } },
  },
  server: { port: 5173, watch: { ignored: ['**/android/**', '**/artifacts/**'] } },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: { include: ['src/core/**', 'src/systems/**', 'src/data/**'], reporter: ['text-summary'] },
  },
} as never));
