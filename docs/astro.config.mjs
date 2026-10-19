// @ts-check
import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";
import starlightLlmsTxt from "starlight-llms-txt";

// Deploy defaults target this repo's GitHub Pages project URL
// (https://danielscholl.github.io/keelson-rib-film/). For a custom domain, set
// base to "/" and add a CNAME.
export default defineConfig({
  site: "https://danielscholl.github.io",
  base: "/keelson-rib-film",
  trailingSlash: "always",
  integrations: [
    starlight({
      title: "Keelson Rib · Film",
      description:
        "Film as a Keelson rib: narrated short films from a storyboard you approve, rendered by a production line, gated for review, and staged for publishing.",
      favicon: "/assets/keelson-mark.svg",
      customCss: ["./src/styles/keelson-theme.css"],
      // Emits /llms.txt, /llms-full.txt, /llms-small.txt at build (llmstxt.org).
      plugins: [
        starlightLlmsTxt({
          projectName: "Keelson Rib · Film",
          description:
            "A Keelson rib for narrated short films: a method agents read through film_guide, a production line (voice, motion boards, compose, QA) run by the film-cut workflow, a cut gate a person or a reviewer agent answers, and a film-publish workflow that stages the web copy.",
        }),
      ],
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/danielscholl/keelson-rib-film",
        },
      ],
      sidebar: [
        { label: "Overview", link: "/" },
        { label: "Concepts", items: [{ autogenerate: { directory: "concepts" } }] },
        {
          label: "Guides",
          items: [
            "guides",
            "guides/install",
            "guides/voices",
            "guides/looks",
            "guides/music-and-sound",
            "guides/publish",
            {
              label: "The method",
              collapsed: true,
              items: [{ autogenerate: { directory: "guides/method" } }],
            },
          ],
        },
        { label: "Tutorials", items: [{ autogenerate: { directory: "tutorials" } }] },
        { label: "Reference", items: [{ autogenerate: { directory: "reference" } }] },
        { label: "Design", items: [{ autogenerate: { directory: "design" } }] },
      ],
    }),
  ],
});
