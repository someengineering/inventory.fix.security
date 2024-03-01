import { PageMetadata } from '@docusaurus/theme-common';
import { useBlogPost } from '@docusaurus/theme-common/internal';
import { openGraph } from '@site/src/utils/og';

export default function BlogPostPageMetadata(): JSX.Element {
  const { frontMatter, assets, metadata } = useBlogPost();
  const {
    title,
    description,
    date,
    tags,
    authors,
    formattedDate,
    readingTime,
  } = metadata;

  const { keywords } = frontMatter;

  const image =
    assets.image ??
    frontMatter.image ??
    openGraph({
      title,
      metadata: formattedDate
        ? `${formattedDate}${
            readingTime ? ` · ${Math.ceil(readingTime)} min read` : ''
          }`
        : null,
      authors,
    });
  return (
    <PageMetadata
      title={title}
      description={description}
      keywords={keywords}
      image={image}
    >
      <meta property="og:type" content="article" />
      <meta property="article:published_time" content={date} />
      {/* TODO double check those article meta array syntaxes, see https://ogp.me/#array */}
      {authors.some((author) => author.url) && (
        <meta
          property="article:author"
          content={authors
            .map((author) => author.url)
            .filter(Boolean)
            .join(',')}
        />
      )}
      {tags.length > 0 && (
        <meta
          property="article:tag"
          content={tags.map((tag) => tag.label).join(',')}
        />
      )}
    </PageMetadata>
  );
}
