# DRJIVA Doctor Studio

An installable Next.js PWA for doctors to create image/video health posts, publish or save drafts, review engagement, and manage their professional profile. The interface is designed as a mobile-first social creator studio—not an Expo or native app.

## Test doctor

- Doctor: Dr. Ritish Reddy
- Mobile: `9876543210`
- Doctor code: `1234`
- Specialty: Gastroenterology
- Hospital: Asian Hospitals
- Experience: 8 years

The phone number is the doctor account key. The database migration stores the test code as a bcrypt hash in the private schema rather than plain text.

## Stack

- Next.js Pages Router with JavaScript/JSX
- Tailwind CSS
- Supabase Postgres and Storage
- Signed, HTTP-only doctor session cookie
- Manual web app manifest and service worker

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. Without Supabase values, the test doctor login and browser-persistent content studio work in local preview mode.

## Connect Supabase

1. Create or link a Supabase project.
2. Apply the migrations in `supabase/migrations` in timestamp order.
3. Copy the project URL and publishable key into `.env.local`.
4. Add the server-only Supabase secret key as `SUPABASE_SECRET_KEY`.
5. Set a long random `DOCTOR_SESSION_SECRET` in the deployed environment.

Never expose `SUPABASE_SECRET_KEY` or `DOCTOR_SESSION_SECRET` through a `NEXT_PUBLIC_` variable.

## Production checks

```bash
npm run check
```

Deploy to any Next.js-compatible serverless host. HTTPS is required for PWA installation and service-worker support outside localhost.
