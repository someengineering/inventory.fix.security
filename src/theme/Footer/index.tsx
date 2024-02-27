import { useLocation } from '@docusaurus/router';
import type { WrapperProps } from '@docusaurus/types';
import useIsBrowser from '@docusaurus/useIsBrowser';
import Footer from '@theme-original/Footer';
import type FooterType from '@theme/Footer';
import { useEffect, useState } from 'react';
import styles from './styles.module.css';

type Props = WrapperProps<typeof FooterType>;

export default function FooterWrapper(props: Props): JSX.Element {
  const [timestamp, setTimestamp] = useState(new Date().getTime());
  const { pathname } = useLocation();
  const isProd =
    useIsBrowser() &&
    new URL(window.location.href).hostname === 'docs.fix.security';

  useEffect(() => {
    setTimestamp(new Date().getTime());
  }, [pathname]);

  return (
    <>
      {isProd ? (
        <img
          src={`https://static.scarf.sh/a.png?x-pxid=1e342322-5b19-4d37-81f6-6a2e5753f8e9&${timestamp}`}
          referrerPolicy="no-referrer-when-downgrade"
          alt=""
          width={1}
          height={1}
          className={styles.scarf}
        />
      ) : null}
      <Footer {...props} />
    </>
  );
}
