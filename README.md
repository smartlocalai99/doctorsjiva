# DRJIVA Doctor Studio

An installable Next.js PWA for doctors to publish image/video health posts, review engagement, and manage their professional profile. New posts publish directly to the DRJIVA patient feed as soon as their media upload finishes.

## Test doctor

- Doctor: Dr. Ritish Reddy
- Mobile: `9866531011`
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

Open `http://localhost:3000`. Supabase configuration is required because doctor profiles, uploads, and posts use the shared DRJIVA backend; the app does not create local demo content.

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
