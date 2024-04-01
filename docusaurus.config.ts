import type { Options as StoredDataOptions } from '@1password/docusaurus-plugin-stored-data';
import type { Options as PwaOptions } from '@docusaurus/plugin-pwa';
import type * as Preset from '@docusaurus/preset-classic';
import type { Config } from '@docusaurus/types';
import remarkA11yEmoji from '@fec/remark-a11y-emoji';
import type { Options as OpenApiDocsOptions } from 'docusaurus-plugin-openapi-docs';
import { groupBy, sortBy } from 'lodash';
import path from 'path';
import { themes as prismThemes } from 'prism-react-renderer';
import remarkKroki from 'remark-kroki-plugin';
import latestRelease from './latestRelease.json';
import versions from './versions.json';

const isDev = process.env.NODE_ENV === 'development';
const isBuildFast = isDev || !!process.env.BUILD_FAST;
const isProd =
  !isDev && !!process.env.NETLIFY && process.env.CONTEXT !== 'deploy-preview';

const config: Config = {
  title: 'Fix Inventory by Some Engineering Inc.',
  url: 'https://inventory.fix.security',
  baseUrl: '/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'throw',
  onBrokenAnchors: 'throw',
  onDuplicateRoutes: 'throw',
  favicon: 'img/favicon.ico',
  trailingSlash: false,
  noIndex: !isProd,
  stylesheets: [
    'https://fonts.googleapis.com/css2?family=Nunito+Sans:opsz,wght@6..12,400;6..12,500;6..12,600;6..12,700;6..12,800&display=swap',
  ],
  scripts: isProd
    ? [
        {
          src: 'https://inventory.fix.security/js/script.js',
          defer: true,
          'data-domain': 'inventory.fix.security',
        },
      ]
    : [],
  markdown: {
    mermaid: true,
    parseFrontMatter: async (params) => {
      const result = await params.defaultParseFrontMatter(params);

      if (result.frontMatter.info_path) {
        delete result.frontMatter.info_path;
      }

      return result;
    },
  },
  themes: ['@docusaurus/theme-mermaid', 'docusaurus-theme-openapi-docs'],
  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: '/',
          sidebarPath: './sidebars.ts',
          async sidebarItemsGenerator({
            defaultSidebarItemsGenerator,
            ...args
          }) {
            const sidebarItems = await defaultSidebarItemsGenerator(args);

            return sidebarItems
              .filter(
                (item) =>
                  (item.type !== 'doc' || !item.id.endsWith('index')) &&
                  (item.type !== 'category' ||
                    item.link?.type !== 'doc' ||
                    !item.link?.id.endsWith('reference/api/index')),
              )
              .map((item) => {
                if (
                  item.type === 'category' &&
                  item.label === 'Command-Line Interface'
                ) {
                  const categoryPosition = [
                    'Search Commands',
                    'Format Commands',
                    'Action Commands',
                    'Setup Commands',
                  ];
                  const miscellaneousCategoryName = 'Other Commands';
                  const groupedItems = groupBy(
                    item.items,
                    (i) => i.customProps?.category ?? miscellaneousCategoryName,
                  );

                  item.items = sortBy(
                    Object.keys(groupedItems).map((categoryName) => ({
                      type: 'category',
                      label: categoryName,
                      items: groupedItems[categoryName],
                    })),
                    (generatedCategory) =>
                      categoryPosition.includes(generatedCategory.label)
                        ? categoryPosition.indexOf(generatedCategory.label)
                        : generatedCategory.label === miscellaneousCategoryName
                          ? categoryPosition.length + 1
                          : categoryPosition.length,
                  );
                }

                return item;
              });
          },
          exclude: ['**/*-rest-api.info.mdx', '**/deprecated-*.mdx'],
          editUrl: ({ versionDocsDirPath, docPath }) =>
            `https://github.com/someengineering/inventory.fix.security/edit/main/${versionDocsDirPath}/${docPath}`,
          showLastUpdateAuthor: false,
          showLastUpdateTime: true,
          remarkPlugins: [
            remarkA11yEmoji,
            ...(!isBuildFast
              ? [
                  [
                    remarkKroki,
                    {
                      krokiBase: 'https://kroki.some.engineering',
                      lang: 'kroki',
                      imgRefDir: '/img/kroki',
                      imgDir: 'static/img/kroki',
                    },
                  ],
                ]
              : []),
          ],
          lastVersion: versions[0],
          versions: {
            current: {
              label: 'edge 🚧',
              path: '/edge',
              banner: 'unreleased',
              badge: false,
            },
            ...versions
              .map((version) =>
                !isBuildFast || version === versions[0]
                  ? {
                      [version]: {
                        label: latestRelease[version].startsWith(
                          version.substring(0, version.indexOf('X')),
                        )
                          ? latestRelease[version]
                          : version,
                        ...(version === versions[0]
                          ? null
                          : { path: `/${version.toLowerCase()}` }),
                      },
                    }
                  : {},
              )
              .reduce((acc, cur) => ({ ...acc, ...cur }), {}),
          },
          docItemComponent: '@theme/ApiItem',
        },
        blog: {
          id: 'releases',
          blogTitle: 'Releases',
          blogDescription: 'Fix Inventory release notes',
          blogSidebarTitle: 'Recent Releases',
          blogSidebarCount: 15,
          postsPerPage: 5,
          path: 'releases',
          routeBasePath: 'releases',
          showReadingTime: false,
          feedOptions: {
            type: 'all',
            copyright: `Copyright © ${new Date().getFullYear()} Some Engineering Inc.`,
          },
          remarkPlugins: [remarkA11yEmoji],
        },
        theme: {
          customCss: [
            './src/css/styles.css',
            './src/css/announcement-bar.css',
            './src/css/navbar.css',
            './src/css/footer.css',
            './src/css/docs.css',
            './src/css/tabs.css',
            './src/css/docsearch.css',
            './src/css/openapi-docs.css',
          ],
        },
        sitemap: {
          lastmod: 'date',
          changefreq: null,
          priority: null,
        },
      } satisfies Preset.Options,
    ],
  ],
  plugins: [
    function customWebpackConfig() {
      return {
        name: 'custom-webpack-config',
        configureWebpack: () => ({
          module: {
            rules: [
              {
                test: /\.(cast|riv|wasm)$/,
                loader: 'file-loader',
                options: {
                  name: isDev
                    ? '[name].[ext]'
                    : 'assets/[name].[contenthash:8].[ext]',
                },
              },
            ],
          },
        }),
      };
    },
    [
      'docusaurus-plugin-openapi-docs',
      {
        id: 'openapi',
        docsPluginId: 'classic',
        config: {
          fixcoreEdge: {
            specPath: 'openapi/fixcore-edge.yml',
            outputDir: `docs/reference/api`,
            sidebarOptions: { groupPathsBy: 'tag', categoryLinkSource: 'tag' },
          },
          ...versions
            .map((version) => ({
              [`fixcore${version.substring(0, version.indexOf('.'))}`]: {
                specPath: `openapi/fixcore-${version}.yml`,
                outputDir: `versioned_docs/version-${version}/reference/api`,
                sidebarOptions: {
                  groupPathsBy: 'tag',
                  categoryLinkSource: 'tag',
                },
              },
            }))
            .reduce((acc, cur) => ({ ...acc, ...cur }), {}),
        },
      } satisfies OpenApiDocsOptions,
    ],
    [
      '@1password/docusaurus-plugin-stored-data',
      {
        data: {
          ...['edge', ...versions]
            .map((version) => ({
              [`aws-${version}-FixOrgList`]: path.resolve(
                __dirname,
                'iam/aws',
                version,
                'FixOrgList.json',
              ),
              [`aws-${version}-FixCollect`]: path.resolve(
                __dirname,
                'iam/aws',
                version,
                'FixCollect.json',
              ),
              [`aws-${version}-FixMutate`]: path.resolve(
                __dirname,
                'iam/aws',
                version,
                'FixMutate.json',
              ),
              [`gcp-${version}-fix_access`]: path.resolve(
                __dirname,
                'iam/gcp',
                version,
                'fix_access.json',
              ),
              [`gcp-${version}-fix_mutate`]: path.resolve(
                __dirname,
                'iam/gcp',
                version,
                'fix_mutate.json',
              ),
            }))
            .reduce((acc, cur) => ({ ...acc, ...cur }), {}),
        },
      } satisfies StoredDataOptions,
    ],
    [
      'pwa',
      {
        debug: !isProd,
        swRegister: false,
        pwaHead: [
          { tagName: 'link', rel: 'manifest', href: 'site.webmanifest' },
          { tagName: 'link', rel: 'icon', href: 'img/icon-192.maskable.png' },
          { tagName: 'link', rel: 'icon', href: 'img/icon-512.maskable.png' },
          { tagName: 'meta', name: 'theme-color', content: '#af62f5' },
          {
            tagName: 'meta',
            name: 'apple-mobile-web-app-capable',
            content: 'yes',
          },
          {
            tagName: 'meta',
            name: 'apple-mobile-web-app-status-bar-style',
            content: '#000d19',
          },
          {
            tagName: 'link',
            rel: 'apple-touch-icon',
            href: 'img/apple-icon-180.png',
          },
        ],
      } satisfies PwaOptions,
    ],
  ],
  themeConfig: {
    colorMode: {
      disableSwitch: true,
    },
    image:
      'https://og.some.engineering/api/image?theme=fixinventory&darkMode=0&title=%20&metadata=by%20Some%20Engineering%20Inc.',
    docs: {
      sidebar: { autoCollapseCategories: true },
      versionPersistence: 'none',
    },
    metadata: [
      {
        name: 'description',
        property: 'og:description',
        content:
          'Fix Inventory is a free, open-source infrastructure control plane that continuously monitors and maintains your cloud resources.',
      },
      { property: 'og:type', content: 'website' },
    ],
    tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 5 },
    announcementBar: {
      id: `announcementBar-fix`,
      content: `Don't want to manage your own Fix Inventory installation? Check out <a href="https://fix.security">Fix</a>, an all-in-one security dashboard built on top of Fix Inventory.`,
    },
    navbar: {
      hideOnScroll: true,
      title: 'Fix Inventory',
      logo: { src: 'img/logo.svg', alt: '', width: 36, height: 36 },
      items: [
        {
          label: 'GitHub',
          href: 'https://github.com/someengineering/fixinventory',
          position: 'right',
          className: 'social github',
          'aria-label': 'GitHub',
        },
        {
          label: 'Discord',
          href: 'https://discord.gg/fixsecurity',
          position: 'right',
          className: 'social discord',
          'aria-label': 'Discord',
        },
        {
          label: 'LinkedIn',
          href: 'https://linkedin.com/company/fix',
          position: 'right',
          className: 'social linkedin',
          'aria-label': 'LinkedIn',
        },
      ],
    },
    footer: {
      copyright: `Copyright © ${new Date().getFullYear()} <a href="https://some.engineering" target="_blank" rel="noopener noreferrer">Some Engineering Inc</a>.`,
    },
    algolia: {
      appId: 'BT2GRJ78EI',
      apiKey: 'd180d83745e710f2e2d0e1fd58da8c1a',
      indexName: 'inventory-fix',
      contextualSearch: true,
      insights: true,
    },
    prism: {
      theme: prismThemes.github,
      additionalLanguages: [
        'csv',
        'ini',
        'powershell',
        'ruby',
        'csharp',
        'php',
      ],
    },
    magicComments: [
      {
        className: 'theme-code-block-highlighted-line',
        line: 'highlight-next-line',
        block: { start: 'highlight-start', end: 'highlight-end' },
      },
    ],
  } satisfies Preset.ThemeConfig,
};

export default config;
