import Head from 'next/head';
import { useRouter } from 'next/router';

// The nurse pages are their own home-screen app ("DrJiva Nurse", opens
// /nurse). Sharing the Doctor Studio manifest made "Add to Home screen"
// open the doctor login, or say the app was already installed.
// Both apps' bars match their light grey iOS page.
export function AppManifest() {
  const { pathname } = useRouter();
  const isNurse = pathname === '/nurse' || pathname.startsWith('/nurse/');
  const name = isNurse ? 'DrJiva Nurse' : 'DrJiva Doctors';

  return (
    <Head>
      <link key="manifest" rel="manifest" href={isNurse ? '/nurse.webmanifest' : '/manifest.webmanifest'} />
      <meta key="application-name" name="application-name" content={name} />
      {/* iPhone cuts Home Screen names after about 12 letters. */}
      <meta key="apple-mobile-web-app-title" name="apple-mobile-web-app-title" content={isNurse ? name : 'DrJiva'} />
      <meta key="theme-color" name="theme-color" content="#F2F2F7" />
    </Head>
  );
}
