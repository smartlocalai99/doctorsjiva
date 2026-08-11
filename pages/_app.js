import "@/styles/globals.css";
import { Manrope, Source_Serif_4 } from 'next/font/google';

import { RouteGuard } from '@/components/AppShell';
import { PwaRegistration } from '@/components/PwaRegistration';
import { AuthProvider } from '@/contexts/AuthContext';
import { WorkspaceProvider } from '@/contexts/WorkspaceContext';

const manrope = Manrope({ subsets: ['latin'], variable: '--font-body' });
const sourceSerif = Source_Serif_4({ subsets: ['latin'], variable: '--font-display' });

export default function App({ Component, pageProps }) {
  return (
    <div className={`${manrope.variable} ${sourceSerif.variable}`}>
      <AuthProvider>
        <WorkspaceProvider>
          <RouteGuard>
            <Component {...pageProps} />
          </RouteGuard>
          <PwaRegistration />
        </WorkspaceProvider>
      </AuthProvider>
    </div>
  );
}
