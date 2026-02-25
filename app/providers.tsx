'use client';

import { SessionProvider } from 'next-auth/react';
import { TutorialProvider } from './components/TutorialProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {/* TutorialProvider gives every page access to tour state and step controls */}
      <TutorialProvider>{children}</TutorialProvider>
    </SessionProvider>
  );
}
