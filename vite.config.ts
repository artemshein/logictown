import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [],
  build: {
    rollupOptions: {
      input: {
        game: 'index.html',
        character: 'character.html',
      },
    },
  },
});
