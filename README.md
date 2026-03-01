# One More Plate

One More Plate is a food rescue app for Newark, Delaware.
Restaurants post surplus food in seconds, nearby volunteers get notified, and deliveries are routed to shelters.

## What It Does

1. Restaurants post leftovers (food, portions, pickup-by time, condition).
2. Gemini structures the post and estimates impact (food weight + CO2 avoided).
3. Volunteers are notified in two ways:
   - SMS alert with **Accept** / **Decline** links
   - Realtime in-app pickup ping in the **Available** tab
4. Volunteer accepts, gets trip details, and starts delivery.
5. Delivery flow guides restaurant pickup -> shelter drop-off with map directions.

## Current Stack

- React + TypeScript + Vite
- Supabase (posts + volunteers + realtime updates)
- Gemini 1.5 Flash (`@google/generative-ai`)
- Google Maps JavaScript API
- SMS via serverless API (`api/send-sms.ts`):
  - Twilio (preferred), or
  - Textbelt (fallback)
- Vercel deployment (frontend + API routes)

## Repo Structure

```txt
api/
  send-sms.ts           # SMS serverless route (Twilio/Textbelt)
src/
  components/
    PostTab.tsx         # Restaurant post flow
    FeedTab.tsx         # Available pickups + realtime in-app ping
    DeliverTab.tsx      # Active delivery flow
  lib/
    db.ts               # Supabase reads/writes + realtime subscription
    sms.ts              # Client SMS helpers + link builders
    gemini.ts           # Gemini analysis + message generation
    store.tsx           # Global app state
```

## Environment Variables

Create `.env` for local frontend settings:

```env
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional but recommended for local dev:
# points local app to deployed API route for SMS
VITE_API_BASE_URL=https://your-vercel-app.vercel.app

# Optional for link generation in SMS
VITE_APP_URL=https://your-vercel-app.vercel.app
```

Set server-side env vars in Vercel Project Settings for SMS:

### Option A: Twilio (recommended)

```env
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=+1...
```

### Option B: Textbelt

```env
TEXTBELT_API_KEY=...
```

If `TEXTBELT_API_KEY` is missing, the app falls back to Textbelt demo key (`textbelt`), which is limited and often unreliable.

## Local Development

```bash
npm install
npm run dev
```

Open: `http://localhost:5173`

Note: Vite dev server does not run `api/send-sms.ts` directly. Use `VITE_API_BASE_URL` to target your deployed Vercel API route when testing SMS from local.

## Build

```bash
npm run build
```

## User Flows

### Restaurant Flow

1. Go to **Post**
2. Fill in food details
3. Submit post
4. System dispatches SMS + in-app realtime ping

### Volunteer Flow

1. Receive SMS or see in-app ping in **Available**
2. Accept or decline
3. On accept, claim run and open **Delivery**
4. Follow pickup/drop-off steps and complete run

## Notes

- Claiming is authoritative in the **Available/Feed** flow and updates Supabase.
- Post page shows dispatch status only (not a fake acceptance UI).
- Realtime updates depend on Supabase realtime being enabled for the `posts` table.
