import { useLocation } from '@docusaurus/router';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { usePostHog } from 'posthog-js/react';
import { useEffect } from 'react';

export default function PosthogPageView() {
  const {
    siteConfig: {
      customFields: { posthogProjectApiKey },
    },
  } = useDocusaurusContext();
  const { pathname, search } = useLocation();
  const posthog = usePostHog();

  useEffect(() => {
    if (posthogProjectApiKey && pathname) {
      const url = `${window.origin}${pathname}${search}`;

      posthog.capture('$pageview', {
        $current_url: url,
      });
    }
  }, [posthogProjectApiKey, pathname, search, posthog]);

  return null;
}
