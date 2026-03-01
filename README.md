# One More Plate 🍽️

Food rescue platform for Newark, Delaware.

## Quick Start

### 1. Install
```bash
npm install
```

### 2. Add API keys to `.env`
```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
VITE_API_BASE_URL=https://your-vercel-app.vercel.app
```

**Gemini key:** https://aistudio.google.com/app/apikey  
**Google Maps key:** https://console.cloud.google.com → Enable "Maps JavaScript API" + "Directions API"

### SMS provider setup
Server-side `api/send-sms.ts` supports:
- `TEXTBELT_API_KEY` (fallback is demo key `textbelt`, which is limited)
- or Twilio (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`)

For local Vite development, set `VITE_API_BASE_URL` to your deployed app URL so `/api/send-sms` resolves.

### 3. Run
```bash
npm run dev
```
Open http://localhost:5173

---

## Stack
- React 18 + TypeScript + Vite
- Gemini 1.5 Flash — structures food posts, generates dispatch messages
- Google Maps JS API — live route from restaurant → volunteer → shelter
- Supabase realtime DB — posts + volunteer records
- Twilio/Textbelt SMS dispatch API
- React Context — global state + active run tracking

## Project Structure
```
src/
├── components/
│   ├── PostTab.tsx       ← Gemini API integration here
│   ├── DeliverTab.tsx    ← Google Maps route here
│   ├── FeedTab.tsx
│   ├── VolunteerTab.tsx
│   ├── AccountTab.tsx
│   ├── RouteMap.tsx      ← Maps component
│   └── UI.tsx
├── lib/
│   ├── gemini.ts         ← All Gemini API calls
│   └── store.tsx         ← Global state
├── types/index.ts
└── data/seed.ts          ← Newark, DE mock data
```

## Demo Flow (for presentation)
1. **Post tab** → enter restaurant, food, hit Post → watch Gemini process it
2. Volunteers get SMS notification → tap claim link → shelter gets ETA
3. **Available tab** → your post appears in feed
4. **Delivery tab** → live Google Maps route
5. Upload photo → complete run → lands on Account
6. **Account** → badges, shelter toggles, community stats
