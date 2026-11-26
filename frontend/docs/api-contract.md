# Backend contract (checked against urban-agri-care-backend, 2026-11-18)

Source of truth: the backend repo's `main.py` and `treatments.json`. The app does not change the backend. No authentication. CORS is open for development.

| Feature | Endpoint | Request | Response the app reads | App behaviour |
| --- | --- | --- | --- | --- |
| Scan | `POST /diagnose` | multipart/form-data, field `file` (JPEG, PNG or WebP, max 10 MB) | `{ success, label, confidence (0..1), model_version, treatment \| null, treatment_available, message }` | Live scan screen: pick from camera or gallery, upload, save the diagnosis with the photo. `confidence < 0.6` → Uncertain; label ending `___healthy` → Healthy; otherwise Unhealthy. When `treatment_available`, the treatment is saved straight away as the Quick guidance, so the result screen makes no second request. |
| Quick | `GET /treatments/{label}` | label URL-encoded as one path segment | `{ label, treatment: { crop, disease, description, quick_fixes[], prevention[] } }` | Markdown: description, `## Quick fixes` list, `## Prevention` list. `quick_fixes` also become the plan tasks. 404 means no record for that label. |
| Advanced | `POST /ask-ai` | JSON `{ "disease_name": "<Crop> <Condition>" }`, e.g. `Tomato Early blight` | `{ success, disease_analyzed, ai_solution }` | `ai_solution` (Markdown text) is shown as the AI guidance. User click only; retries only on user action. |
| List | `GET /treatments` | none | `{ count, treatments: [{ label, crop, disease }] }` | Not used at runtime. `src/data/labels.ts` holds the same 29 labels for the "Not right?" correction list. |

Errors: FastAPI returns `{ "detail": "..." }`. The app shows `detail` and maps the status: 404 → `missing`; 400 / 413 / 415 / 422 (empty, too big, wrong type, not enough leaf tissue) → `image`; 503 (model not integrated) → `unavailable`; other 5xx → `server`. Timeouts, cancellation, network failures, non-JSON and malformed bodies each have their own code.

Labels: the model returns PlantVillage-style keys, e.g. `Tomato___Early_blight`, `Pepper,_bell___healthy`, `Tomato___Spider_mites Two-spotted_spider_mite` (note the space). The app shows `Pepper,_bell` as "Bell pepper" and the spider-mite label as "Spider mites". `Rice___Leaf_smut` is not in the backend.

Backend model: two MobileNetV2 classifiers (crop, then disease) served by the FastAPI backend. Labels are keys of `treatments.json` and confidence is 0..1, so the app needs no change when the model is retrained.

## Environment

| Variable | Default | Meaning |
| --- | --- | --- |
| `EXPO_PUBLIC_GUIDANCE_MODE` | `mock` | `live` turns on real scans, Quick and Advanced. `mock` keeps the on-device demo and makes no request. |
| `EXPO_PUBLIC_API_BASE_URL` | none | Phone-reachable backend origin, e.g. `http://192.168.1.20:8000`. Never `localhost` on a phone. Start the backend with `uvicorn main:app --host 0.0.0.0 --port 8000`. |
| `EXPO_PUBLIC_API_TIMEOUT_MS` | 12000 | Quick lookup timeout. |
| `EXPO_PUBLIC_DIAGNOSE_TIMEOUT_MS` | 30000 | Scan upload timeout. |
| `EXPO_PUBLIC_ASK_AI_TIMEOUT_MS` | 45000 | Advanced AI timeout. |
| `EXPO_PUBLIC_ASK_AI_REQUEST_FIELD` | `disease_name` | Body field name for `/ask-ai`, only if the backend renames it. |
| `EXPO_PUBLIC_MOCK_ERROR` / `EXPO_PUBLIC_MOCK_SCAN_ERROR` | none | Mock-mode error demos (`quick` / `advanced`, `1`). |

Public Expo variables ship inside the app; never put a server key (such as `GROQ_API_KEY`) in them. Restart Metro with `npx expo start -c` after changing variables.
