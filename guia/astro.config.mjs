import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

export default defineConfig({
  site: "https://leoglez10.github.io",
  base: "/app-prestamos-p15",
  integrations: [
    starlight({
      title: "Guía del personal · P15",
      favicon: "/favicon.png",
      description: "Cómo usar la App Préstamos P15 en el día a día.",
      logo: { src: "./src/assets/logo-p15.png", alt: "Preparatoria 15" },
      defaultLocale: "root",
      locales: { root: { label: "Español", lang: "es" } },
      sidebar: [
        { label: "Inicio", link: "/" },
        { label: "Manual", items: [{ autogenerate: { directory: "manual" } }] },
      ],
      editLink: {
        baseUrl: "https://github.com/Leoglez10/app-prestamos-p15/edit/main/docs/",
      },
    }),
  ],
});
