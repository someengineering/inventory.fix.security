import { GithubProvider } from '@site/src/context/GithubContext';
import { type ReactNode } from 'react';

export default function Root({ children }: { children: ReactNode }) {
  return <GithubProvider>{children}</GithubProvider>;
}
