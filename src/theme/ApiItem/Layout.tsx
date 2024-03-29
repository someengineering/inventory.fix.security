import type { WrapperProps } from '@docusaurus/types';
import type LayoutType from '@theme-original/ApiItem/Layout';
import DocItemLayout from '@theme/DocItem/Layout';

type Props = WrapperProps<typeof LayoutType>;

export default function LayoutWrapper(props: Props): JSX.Element {
  return (
    <>
      <DocItemLayout {...props} />
    </>
  );
}
