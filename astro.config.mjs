// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://jconfperu.com',
  trailingSlash: 'ignore',
  build: {
    format: 'directory',
  },
  integrations: [
    mdx(),
    sitemap({
      filter: (page) => !page.includes('/admin'),
    }),
  ],
  vite: {
    // @ts-expect-error: tailwindcss-vite y astro pueden traer tipos de Vite distintos.
    plugins: [tailwindcss()],
  },
  image: {
    // Habilita procesado de imágenes (sharp) para WebP/AVIF responsivos.
    responsiveStyles: true,
  },
});
