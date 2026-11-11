import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'fs';
import path from 'path';

// Kiểm tra xem file .env có ở root (../.env) hay ở frontend/ (.env)
const hasParentEnv = fs.existsSync(path.resolve(__dirname, '../.env'));

// https://vite.dev/config/
export default defineConfig({
  envDir: hasParentEnv ? '../' : '.', // Tự động nhận file .env ở root khi dev local hoặc tại thư mục hiện tại khi deploy Vercel
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 3000,
    open: true,
  },
});
