import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import VueJsx from '@vitejs/plugin-vue-jsx';

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), VueJsx()],
  build: {
    lib: {
      entry: 'src/entry.ts',
      name: 'CircleSlider',
      fileName: (format) => {
        if (format === 'es') {
          return 'circle-slider.es.js';
        }
        if (format === 'umd') {
          return 'circle-slider.umd.js';
        }
        return `circle-slider.${format}.js`;
      },
      formats: ['es', 'umd'],
    }
  },
});
