// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';

/** @param {string} page */
const privateRoute = (page) => {
  const path = new URL(page).pathname.replace(/\/$/, '') || '/';
  return !['/admin', '/certificado', '/auth', '/v', '/mi'].some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
};

// https://astro.build/config
export default defineConfig({
  site: 'https://jconfperu.com',
  trailingSlash: 'ignore',
  adapter: vercel({
    includeFiles: [
      './src/lib/certificates/fonts/Poppins-Regular.ttf',
      './src/lib/certificates/fonts/Poppins-Bold.ttf',
    ],
  }),
  build: {
    format: 'directory',
  },
  integrations: [
    mdx(),
    sitemap({
      filter: privateRoute,
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
  image: {
    // Habilita procesado de imágenes (sharp) para WebP/AVIF responsivos.
    responsiveStyles: true,
  },
});
