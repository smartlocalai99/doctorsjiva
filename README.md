# DRJIVA Doctors

An installable Next.js PWA with two desks on the shared DRJIVA backend:

- **Doctor desk** (`/`, `/calendar`, `/patients`): a doctor logs in with mobile number + 4-digit PIN and sees what the nurses recorded for her patients: who is coming today, what to have ready (pregnancy week, scans, vaccines, tests, OI-TI / IUI steps), who the nurse has seen, and who didn't come. Read-only. Drawn to the iOS design guidelines (system font, grouped lists, white theme only), installable to the Home Screen, and stays signed in for a year (renewed each time it opens).
- **Nurse desk** (`/nurse`): nurses save visits, ticks and next visit dates. A saved visit is what marks a patient as "came" on the doctor desk.

A doctor login (`doctors` table) is linked to her nurse-desk name (`care_doctors` + aliases) at her hospital (`doctors.hospital_id`). If no name matches, the desk says so instead of showing patients.

### Visit status on the doctor desk

| Status | Meaning |
| --- | --- |
| Coming today | Expected today, the nurse has not saved a visit yet |
| Seen | The nurse saved a visit that day |
| Didn't come | The day passed with no visit, and she has not come since |
| Came late | Missed the day, came later |

Without Supabase settings (local preview) the doctor desk shows sample Dhruva patients and the test doctor below can log in.

### Notifications

When a nurse saves a visit or starts a pregnancy / OI-TI / IUI cycle / baby schedule, the patient's doctor gets a push notification, and at 8 AM India time each doctor gets the day's count (`/api/cron/morning`, scheduled in `vercel.json`). Doctors turn them on in Settings (tap their initial, top right). On iPhone this needs DrJiva added to the Home Screen first (iOS 16.4+).

The web-push keys are created on first use and kept in the database (`private.web_push_keys`); set `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` to use your own. Set `CRON_SECRET` to lock the morning job to Vercel Cron's signed calls (without it, only Vercel Cron's user agent is accepted, and it sends at most once a day per phone).

Server functions run in Sydney (`syd1` in `vercel.json`), next to the Supabase database.

## Test doctor

- Mobile: `9866531011`
- Doctor code: `1234`

The phone number is the doctor account key. Login codes are stored as bcrypt hashes in the private schema.

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
