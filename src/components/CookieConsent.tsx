import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Cookies from 'js-cookie';
import { usePostHog } from 'posthog-js/react';
import { useEffect, useState } from 'react';

export default function CookieConsent() {
  const {
    siteConfig: {
      customFields: { isDev, isProd, posthogProjectApiKey },
    },
  } = useDocusaurusContext();
  const posthog = usePostHog();
  const [showConsent, setShowConsent] = useState(false);

  useEffect(() => {
    if (Cookies.get('cookie_consent') === 'true') {
      posthog.opt_in_capturing();
    } else if (!posthog.has_opted_in_capturing()) {
      setShowConsent(Cookies.get('cookie_consent') !== 'false');
    }

    if (
      Cookies.get('cookie_consent') !== 'true' &&
      Cookies.get('cookie_consent') !== 'false'
    ) {
      Cookies.remove('cookie_consent', {
        domain: isProd ? '.fix.security' : undefined,
        secure: !isDev,
      });
    }
  }, [isDev, isProd, posthog]);

  if (!posthogProjectApiKey || !showConsent) {
    return null;
  }

  return (
    <div
      style={{
        pointerEvents: 'none',
        position: 'fixed',
        left: '0px',
        right: '0px',
        bottom: '0px',
        padding: '0 1.5rem 1.5rem',
      }}
    >
      <div
        style={{
          pointerEvents: 'auto',
          marginLeft: 'auto',
          maxWidth: '36rem',
          borderRadius: '0.75rem',
          backgroundColor: 'white',
          padding: '1.5rem',
          boxShadow: '0 0 0 1px var(--ifm-color-secondary)',
        }}
      >
        <p
          style={{
            fontSize: '1rem',
            lineHeight: '1.5rem',
          }}
        >
          We use cookies and other tracking technologies to analyze site usage
          and assist in marketing efforts. For details, see our{' '}
          <Link href="https://fix.security/cookie-policy">cookie policy</Link>.
        </p>
        <div
          style={{
            marginTop: '1rem',
            display: 'flex',
            alignItems: 'center',
            columnGap: '1.25rem',
          }}
        >
          <button
            className="button button--primary"
            onClick={(e) => {
              e.preventDefault();
              setShowConsent(false);
              Cookies.set('cookie_consent', 'true', {
                domain: isProd ? '.fix.security' : undefined,
                secure: !isDev,
                expires: 365,
              });
              posthog.opt_in_capturing();
            }}
          >
            Accept
          </button>
          <button
            className="button button--primary button--outline"
            onClick={(e) => {
              e.preventDefault();
              setShowConsent(false);
              Cookies.set('cookie_consent', 'false', {
                domain: isProd ? '.fix.security' : undefined,
                secure: !isDev,
              });
              posthog.opt_out_capturing();
            }}
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}
