import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [],
  build: {
    rollupOptions: {
      input: {
        game: 'index.html',
        street: 'street.html',
        store: 'store.html',
        bus: 'bus.html',
        character: 'character.html',
      },
    },
  },
});
