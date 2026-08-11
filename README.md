# DRJIVA Doctor Studio

An installable Next.js PWA for doctors to create image/video health posts, publish or save drafts, review engagement, and manage their public profile. It is a web app—not an Expo or native mobile project.

## Stack

- Next.js Pages Router with JavaScript/JSX
- Tailwind CSS
- Supabase Auth, Postgres, Storage, and row-level security
- Manual web app manifest and service worker

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. With empty Supabase values the app uses browser-only preview mode, including persistent post/profile data and local media in IndexedDB.

## Connect Supabase and Google

1. Create a Supabase project and apply `supabase/migrations/20260811160000_create_doctor_content_studio.sql` in the SQL editor or through the Supabase CLI.
2. Copy the project URL and publishable key into `.env.local`.
3. In Supabase Authentication, enable Google and enter the Google OAuth client ID and secret.
4. Add the production website URL to Supabase redirect URLs. For local development also add `http://localhost:3000/**`.
5. Add the Supabase Google callback URL shown in the provider settings to the Google Cloud OAuth client.

Publishing is direct; the schema keeps a verification status for a future doctor-verification workflow but does not block login or content creation.

## Production checks

```bash
npm run check
```

Deploy to any Next.js-compatible serverless host. HTTPS is required for PWA installation and service-worker support outside localhost.
