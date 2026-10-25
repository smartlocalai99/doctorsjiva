import Head from 'next/head';
import { useRouter } from 'next/router';

// The nurse pages are their own home-screen app ("DRJIVA Nurse", opens
// /nurse). Sharing the Doctor Studio manifest made "Add to Home screen"
// open the doctor login, or say the app was already installed.
// The doctor app's bars match its grey iOS page, light or dark.
export function AppManifest() {
  const { pathname } = useRouter();
  const isNurse = pathname === '/nurse' || pathname.startsWith('/nurse/');
  const name = isNurse ? 'DRJIVA Nurse' : 'DrJiva Doctors';

  return (
    <Head>
      <link key="manifest" rel="manifest" href={isNurse ? '/nurse.webmanifest' : '/manifest.webmanifest'} />
      <meta key="application-name" name="application-name" content={name} />
      {/* iPhone cuts Home Screen names after about 12 letters. */}
      <meta key="apple-mobile-web-app-title" name="apple-mobile-web-app-title" content={isNurse ? name : 'DrJiva'} />
      {isNurse ? <meta key="theme-color" name="theme-color" content="#2E7EBC" /> : null}
      {!isNurse ? <meta key="theme-color-light" name="theme-color" media="(prefers-color-scheme: light)" content="#F2F2F7" /> : null}
      {!isNurse ? <meta key="theme-color-dark" name="theme-color" media="(prefers-color-scheme: dark)" content="#000000" /> : null}
    </Head>
  );
}
