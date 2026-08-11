# DRJIVA Doctors

Mobile content-management app for verified DRJIVA doctors. Doctors can manage their professional profile, create image or short-video health posts, save drafts, submit content for review, and view post performance.

## Stack

- Expo SDK 57 and React Native 0.86
- Expo Router with native iOS and Android tabs
- JavaScript and JSX only
- Supabase Auth, Postgres, Storage and Row Level Security
- TanStack Query for server state

## Run locally

```bash
npm install
npx expo start
```

The app opens in local preview mode when Supabase values are absent. Preview posts and profile changes are saved on the device.

To connect the shared DRJIVA backend:

1. Copy `.env.example` to `.env`.
2. Add the existing Supabase project URL and publishable key.
3. Link this repository to the same Supabase project used by the patient app.
4. Review and apply `supabase/migrations/20260811102731_create_health_feed.sql`.
5. Invite doctor accounts through Supabase Auth and approve each profile by setting `verification_status` to `verified` through an admin-only workflow.

Never add a secret or `service_role` key to this mobile project.

## Content lifecycle

```text
Draft -> In review -> Published
                   -> Needs changes
Published -> Archived
```

Only verified, active doctors' published posts are readable by the patient application. Doctors cannot mark their own profile verified or publish a post directly through client-side requests.
