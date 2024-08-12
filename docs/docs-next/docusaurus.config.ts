import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

const config: Config = {
  title: "Dagster Docs - Beta",
  tagline:
    "Dagster is a Python framework for building production-grade data platforms.",
  url: "https://docs.dagster.io",
  favicon: "img/favicon.ico",

  baseUrl: "/",
  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "throw",
  organizationName: "dagster",
  projectName: "dagster",
  markdown: {
    mermaid: true,
  },
  themes: ["@docusaurus/theme-mermaid"],
  i18n: { defaultLocale: "en", locales: ["en"] },
  plugins: [
    require.resolve("docusaurus-plugin-sass"),
    require.resolve("docusaurus-plugin-image-zoom"),
  ],
  themeConfig: {
    colorMode: {
      defaultMode: "dark",
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ["diff", "json", "bash"],
    },
    zoom: {
      selector: ".markdown > img, .tabs-container img ",
      config: {
        // options you can specify via https://github.com/francoischalifour/medium-zoom#usage
        background: {
          light: "rgb(255, 255, 255)",
          dark: "rgb(50, 50, 50)",
        },
      },
    },
    tableOfContents: {
      minHeadingLevel: 2,
      maxHeadingLevel: 4,
    },
    navbar: {
      title: "Dagster Docs - Beta",
      style: "dark",
      logo: {
        alt: "Dagster Logo",
        src: "img/logo.svg",
        href: "/",
      },
      items: [
        {
          label: "Docs",
          type: "doc",
          docId: "intro",
          position: "left",
        },
        {
          label: "API",
          type: "doc",
          docId: "api",
          position: "left",
        },
        {
          href: "https://github.com/dagster-io/dagster",
          label: "GitHub",
          position: "right",
        },
      ],
    },
    image: "img/docusaurus-social-card.jpg",
    docs: {
      sidebar: {
        autoCollapseCategories: true,
        hideable: true,
      },
    },

    footer: {
      style: "dark",
      logo: {
        alt: "Dagster Logo",
        src: "img/logo.svg",
        href: "/",
      },
      links: [
        {
          title: "Docs",
          items: [
            {
              label: "Tutorial",
              to: "/intro",
            },
          ],
        },
        {
          title: "Community",
          items: [
            {
              label: "Stack Overflow",
              href: "https://stackoverflow.com/questions/tagged/dagster",
            },
            {
              label: "Twitter",
              href: "https://twitter.com/dagster",
            },
          ],
        },
        {
          title: "More",
          items: [
            {
              label: "GitHub",
              href: "https://github.com/dagster-io/dagster",
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Dagster Labs.`,
    },
  } satisfies Preset.ThemeConfig,

  presets: [
    [
      "@docusaurus/preset-classic",
      {
        docs: {
          sidebarPath: "./sidebars.ts",
          routeBasePath: "/",
          editUrl:
            "https://github.com/dagster-io/dagster/tree/docs/revamp/docs/docs-next",
        },
        blog: false,
        theme: {
          customCss: [
            require.resolve(
              "./node_modules/modern-normalize/modern-normalize.css"
            ),
            require.resolve("./src/styles/custom.scss"),
          ],
        },
      } satisfies Preset.Options,
    ],
  ],
};

export default config;
