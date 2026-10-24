import "@/styles/globals.css";
import { Manrope, Newsreader, Noto_Sans_Telugu, Onest, Source_Serif_4 } from 'next/font/google';

import { AppManifest } from '@/components/AppManifest';
import { RouteGuard } from '@/components/AppShell';
import { PwaRegistration } from '@/components/PwaRegistration';
import { AuthProvider } from '@/contexts/AuthContext';

const manrope = Manrope({ subsets: ['latin'], variable: '--font-body' });
const sourceSerif = Source_Serif_4({ subsets: ['latin'], variable: '--font-display' });
// Doctor desk and doctor login only (the nurse desk keeps the two above).
const onest = Onest({ subsets: ['latin'], variable: '--font-desk' });
const newsreader = Newsreader({ subsets: ['latin'], axes: ['opsz'], variable: '--font-desk-serif' });
const telugu = Noto_Sans_Telugu({ subsets: ['telugu'], variable: '--font-telugu', preload: false });

export default function App({ Component, pageProps }) {
  return (
    <div className={`${manrope.variable} ${sourceSerif.variable} ${onest.variable} ${newsreader.variable} ${telugu.variable}`}>
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
