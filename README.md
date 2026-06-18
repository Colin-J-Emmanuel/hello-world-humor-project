# Caption Rating App

A Next.js web app where people browse AI-generated image captions, sign in with Google, and upvote/downvote the ones they find funny. Captions are ranked by their net vote total, and signed-in users can upload a new image to run it through a four-step caption-generation pipeline.

This is **Project 1** (Assignments 1–5) of Columbia's COMSW-4995 *The Humor Project*. It's the first of three apps in the course suite — the other two are the [Admin Panel](https://github.com/Colin-J-Emmanuel/humor-admin-panel) and the [Prompt Chain Tool](https://github.com/Colin-J-Emmanuel/humor-prompt-chain) — and all three read from the same shared Supabase backend.

**Live:** https://caption-rating-app.vercel.app

---

## What it does

- **Public browsing.** Anyone can view the captions feed, ranked by total votes (sourced from the `caption_scores` view). Vote counts are visible to everyone, but the ▲/▼ controls only appear once you're signed in.
- **Google sign-in.** Authentication is Google OAuth via Supabase. The header swaps between a "Sign in" button (logged out) and the user's email plus Upload / Profile / Sign out links (logged in).
- **Voting.** Signed-in users vote ▲ (green) or ▼ (red) on any caption. Votes persist to the `caption_votes` table and are restored as colored highlights on page reload. Switching your vote on a caption you've already voted on updates the existing row rather than erroring.
- **Protected routes.** `/protected` and `/upload` redirect logged-out visitors to `/auth`.
- **Caption-generation pipeline.** On `/upload`, a signed-in user picks an image and the app walks the four-step pipeline against `api.almostcrackd.ai`, then displays the generated captions.

---

## Tech stack

- **Next.js** (App Router, TypeScript)
- **Tailwind CSS v4**
- **Supabase** for auth and data, via `@supabase/ssr` (separate server and browser clients in `lib/supabase/server.ts` and `lib/supabase/client.ts`)
- **Vercel** for deployment
- Auth gating lives in `proxy.ts` (Next.js 16's replacement for `middleware.ts`)

---

## Shared backend — important

All three course apps point at the **same staging Supabase project** ("Crackd Database - Staging"), which is shared across every student in the course. A few consequences worth knowing:

- **The schema and RLS policies are owned by the course, not this repo.** They are not modified here, and shouldn't be — changes would affect every other student.
- The data you see (captions, votes) is the live, shared course dataset.
- The same external caption pipeline (`api.almostcrackd.ai`) is shared too.

Because the schema is shared and fixed, the build process leaned heavily on confirming exact table/column names via `information_schema` queries before writing any code — e.g. `caption_votes` keys its uniqueness on `(profile_id, caption_id)`, and votes live in a `vote_value` smallint column (`1` / `-1`).

---

## Voting model (notes for graders / future me)

- Table: `caption_votes`, with `vote_value` (`int2`, `1` = up / `-1` = down), `profile_id` (the voter), and `caption_id`.
- The voter's `profile_id` is resolved from the `profiles` table (`profiles.id == auth.users.id`).
- A unique constraint (`caption_votes_user_caption_unique`) on `(profile_id, caption_id)` prevents duplicate rows, so the vote write is an **upsert** with `onConflict: "profile_id,caption_id"` — this is what makes "change my vote" work instead of throwing a `23505` duplicate-key error.

---

## Caption-generation pipeline

Run from the browser using the signed-in user's Supabase JWT as a Bearer token (`supabase.auth.getSession()`), against `https://api.almostcrackd.ai`:

1. `POST /pipeline/generate-presigned-url` → returns a presigned S3 URL and a public CDN URL.
2. `PUT` the image bytes directly to the presigned URL (Content-Type must match step 1).
3. `POST /pipeline/upload-image-from-url` with the CDN URL → returns an `imageId`.
4. `POST /pipeline/generate-captions` with the `imageId` → returns the captions.

> The pipeline refuses images of identifiable public figures, so test with neutral images (memes, objects).

---

## Running locally

**Requirements:** Node 20+ (use `nvm`).

```bash
git clone https://github.com/Colin-J-Emmanuel/hello-world-humor-project.git
cd hello-world-humor-project
npm install
```

Create `.env.local` with the shared Supabase staging credentials:

```
NEXT_PUBLIC_SUPABASE_URL=<staging project URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<staging anon key>
```

> Both vars are `NEXT_PUBLIC_`-prefixed so Next.js can inline them at build time. On Vercel, keep the **Sensitive** toggle **off** for these — toggling it on breaks the inlining.

```bash
npm run dev   # http://localhost:3000
```

For Google OAuth to work on any deployed URL, that URL must be in the Supabase **Authentication → URL Configuration → Redirect URLs** allowlist (e.g. `https://<your-vercel-url>/**`).

---

## Smoke test

Walk this in a fresh **Incognito** window before trusting a deploy:

1. Open the site logged out → feed loads, no Vercel auth wall, vote counts visible but no ▲/▼ arrows.
2. Hit `/protected` and `/upload` directly → both redirect to `/auth`.
3. Sign in with Google → header shows your email + Upload / Profile / Sign out.
4. Upvote a fresh caption → count +1, arrow turns green.
5. Switch that vote to a downvote → count reflects the switch, no duplicate-row error.
6. Reload → your prior votes still show colored.
7. On `/upload`, generate captions from a neutral image → captions appear.

---

## Deployment

Deployed on Vercel with **Deployment Protection off** (graders need public access). For course submission, use the **commit-specific** deployment URL from the Vercel Deployments tab, not the rolling production alias.