import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
  registerType: "autoUpdate",
  filename: 'manifest.webmanifest',
  includeAssets: ["vite.svg", "robots.txt", "logo.svg"],
  manifest: {
    name: "Furniture",
    short_name: "Furniture",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      {
        src: "maskable.png",
        sizes: "196x196",
        type: "image/png",
        purpose: "any maskable"
      },
      {
        src: "logo.svg",
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "any"
      }
    ]
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
  },
})

  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
