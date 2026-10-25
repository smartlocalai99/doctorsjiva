import "@/styles/globals.css";
import { Manrope, Noto_Sans_Telugu, Source_Serif_4 } from 'next/font/google';

import { AppManifest } from '@/components/AppManifest';
import { RouteGuard } from '@/components/AppShell';
import { PwaRegistration } from '@/components/PwaRegistration';
import { AuthProvider } from '@/contexts/AuthContext';

// Nurse desk fonts. The doctor app uses the phone's own font (SF Pro on
// iPhone), so it downloads none.
const manrope = Manrope({ subsets: ['latin'], variable: '--font-body' });
const sourceSerif = Source_Serif_4({ subsets: ['latin'], variable: '--font-display' });
const telugu = Noto_Sans_Telugu({ subsets: ['telugu'], variable: '--font-telugu', preload: false });

export default function App({ Component, pageProps }) {
  return (
    <div className={`${manrope.variable} ${sourceSerif.variable} ${telugu.variable}`}>
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
