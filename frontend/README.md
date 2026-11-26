# Urban Agri-Care — Mobile App

Urban Agri-Care helps urban gardeners spot crop diseases early and look after their plants until they recover. Take a photo of a leaf, get a diagnosis, then follow a care plan, track progress in a journal and keep a recovery schedule.

Built with **Expo SDK 58**, **React Native**, **TypeScript** and **Expo Router**.

- **Live demo (web):** https://beautiful-marigold-c17a20.netlify.app
- **Backend API:** https://urban-agri-care.onrender.com ([source](https://github.com/wawaders/urban-agri-care-backend))

> The backend runs on a free Render instance that sleeps after 15 minutes of inactivity, so the first scan after a break can take up to a minute.

## Features

- **Leaf scan** — pick a photo from the camera or gallery and upload it to the backend for diagnosis (crop + condition, with a confidence score). Results are shown as Healthy, Unhealthy or Uncertain (confidence below 60%).
- **Treatment guidance** — *Quick* guidance comes from the treatment knowledge base; *Advanced* guidance asks the backend for a detailed, AI-generated explanation.
- **Result correction** — "Not right?" lets the user pick the real condition. Corrected photos can optionally be shared (after agreeing to the Terms) to help retrain the model.
- **Care Plan** — save guidance under a named plant, tick off treatment tasks and set a check-in reminder.
- **Routine planner & Schedule** — fit care tasks around the user's daily routine for the next 7 days and view them on a monthly calendar, with a care streak.
- **Plant Journal** — photos, notes and observations per plant, a first-vs-latest comparison and a before/after slider.
- **Gallery, Saved Plants and History** — browse every photo, filter plants by crop and revisit past diagnoses.
- **Share card** — share a plant's recovery progress through the system share sheet.

Supported crops: tomato, chilli, bell pepper, potato and rice (29 labels in total, see `src/data/labels.ts`).

## Getting started

Requirements: Node.js 20+ and the **Expo Go** app (SDK 58) on an Android or iOS phone.

```bash
npm ci
cp .env.example .env      # Windows: copy .env.example .env
npx expo start --clear
```

Scan the QR code with Expo Go. The phone and computer need to be on the same network (or use `npx expo start --tunnel`).

To run the web version: `npx expo start --web`. To build it for static hosting: `npx expo export --platform web` (output in `dist/`).

## Configuration

Settings are read from `.env` (see `.env.example`):

| Variable | Default | Meaning |
| --- | --- | --- |
| `EXPO_PUBLIC_GUIDANCE_MODE` | `mock` | `live` uses the backend for scans and guidance; `mock` runs an offline demo with sample data. |
| `EXPO_PUBLIC_API_BASE_URL` | — | Backend URL, e.g. `https://urban-agri-care.onrender.com`. When running the backend locally, use your computer's LAN IP (not `localhost`). |
| `EXPO_PUBLIC_API_TIMEOUT_MS` | `12000` | Timeout for Quick guidance requests. |
| `EXPO_PUBLIC_DIAGNOSE_TIMEOUT_MS` | `30000` | Timeout for scan uploads. |
| `EXPO_PUBLIC_ASK_AI_TIMEOUT_MS` | `45000` | Timeout for Advanced guidance. |

`EXPO_PUBLIC_*` values are bundled into the app, so never put secret keys in them. Restart with `npx expo start -c` after changing `.env`.

The API endpoints the app uses are documented in [docs/api-contract.md](./docs/api-contract.md).

## Project structure

```
src/
  app/            screens (Expo Router): home, scan, result, care plan, routine,
                  schedule, journal, plants, gallery, compare, share, history, terms
  components/     shared UI, animations, Markdown renderer, before/after slider
  services/
    api/          backend client and response adapters
    storage/      local data (AsyncStorage) and persistent photos
    reminders/    local notifications
    routine/      routine planner, schedule and streak logic
    feedback/     result corrections / retraining queue
    plants/       plant lookup helpers
  data/           labels, terms text, sample data
  theme.ts        colours, fonts and spacing
tests/            unit tests
docs/             API contract and wireframes
```

## Scripts

```bash
npm test              # unit tests
npx tsc --noEmit      # type check
npm run lint          # lint
```
