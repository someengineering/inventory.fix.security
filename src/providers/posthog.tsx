import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { PostHogProvider as Provider } from 'posthog-js/react';

export default function PosthogProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    siteConfig: {
      customFields: { isDev, isNetlify, posthogProjectApiKey },
    },
  } = useDocusaurusContext();

  return (
    <Provider
      apiKey={posthogProjectApiKey as string}
      options={{
        api_host: isNetlify ? '/api/ingest' : 'https://eu.posthog.com',
        ui_host: 'https://eu.posthog.com',
        debug: !!isDev,
        capture_pageview: false, // Page views are captured manually

        opt_out_persistence_by_default: true,
        opt_out_capturing_by_default: true,

        disable_session_recording: true,
        disable_surveys: true,
        enable_recording_console_log: false,
      }}
    >
      {children}
    </Provider>
  );
}
