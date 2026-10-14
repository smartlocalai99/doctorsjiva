// One id per deploy. Next uses it to spot an open tab that is still on an
// older deploy (full reload on the next navigation, fresh asset URLs), and
// the nurse desk compares it with /api/version when it comes back on screen.
const BUILD_ID = (process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 12) || `local-${Date.now()}`;

/** @type {import('next').NextConfig} */
const nextConfig = {
  deploymentId: BUILD_ID,
  env: { APP_BUILD_ID: BUILD_ID },
  reactCompiler: true,
  reactStrictMode: true,
  devIndicators: false,
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ];
  },
};

export default nextConfig;
