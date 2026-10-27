import "@/styles/globals.css";
import { Noto_Sans_Telugu } from 'next/font/google';

import { AppManifest } from '@/components/AppManifest';
import { RouteGuard } from '@/components/AppShell';
import { PwaRegistration } from '@/components/PwaRegistration';
import { AuthProvider } from '@/contexts/AuthContext';

// The doctor and nurse apps use the phone's own font (SF Pro on iPhone);
// only the Telugu line on the login screens downloads a font.
const telugu = Noto_Sans_Telugu({ subsets: ['telugu'], variable: '--font-telugu', preload: false });

export default function App({ Component, pageProps }) {
  return (
    <div className={telugu.variable}>
      <AppManifest />
      <AuthProvider>
        <RouteGuard>
          <Component {...pageProps} />
        </RouteGuard>
        <PwaRegistration />
      </AuthProvider>
    </div>
  );
}
