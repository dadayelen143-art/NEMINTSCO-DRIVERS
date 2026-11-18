# Driver Daily Tracker (React + Supabase + Vercel)

1. Supabase: create a project, open SQL Editor, run `schema.sql`.
2. Authentication > Users > Add user (email + password) for each driver and for yourself.
3. SQL Editor: insert a `profiles` row per user (examples at the bottom of schema.sql).
   Driver `sap_profile_id` must match the "Sap Profile Id" column in your CSV.
4. Authentication > Providers > Email: turn OFF "Allow new users to sign up" so only you create accounts.
5. Local: `cp .env.example .env` (fill in URL + anon key from Project Settings > API), `npm install`, `npm run dev`.
6. Vercel: push to GitHub, import the repo, add the same two env vars, deploy.
