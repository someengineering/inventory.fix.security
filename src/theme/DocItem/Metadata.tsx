import { PageMetadata } from '@docusaurus/theme-common';
import { useDoc } from '@docusaurus/theme-common/internal';
import { getImage } from '@site/src/utils/socialImageUtils';

export default function DocItemMetadata(): JSX.Element {
  const {
    metadata: { title, description },
    frontMatter,
    assets,
  } = useDoc();

  return (
    <PageMetadata
      title={title}
      description={description}
      keywords={frontMatter.keywords}
      image={assets.image ?? frontMatter.image ?? getImage({ title: title })}
    />
  );
}
