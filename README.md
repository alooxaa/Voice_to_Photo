# Dauys-Foto (Дауыс-фото)

A voice user interface that teaches children with **dyspraxia** to use photo
editing tools, from simple filters to generative AI. Dyspraxia makes small
targets, dragging and precise clicks hard, while thinking is unaffected. So the
app is driven by voice, and every action also has a very large button as a
fallback.

The interface, voice commands, speech recognition and spoken feedback work in
**Kazakh (default), Russian and English**. Two modes:

- **Өңдеу (Edit)**: 27 editing commands, all free and local. After the first
  setup it works without internet.
- **ЖИ шебері (AI Studio)**: the child describes a change or a new picture in
  their own words, and a generative AI model draws it. This mode uses free
  online services and needs keys (see [AI Studio](#ai-studio)).

University HCI coursework project.

![Screenshot of the editor with the chat open](docs/screenshot.png)

## What a child does

1. Signs up (name, username, password twice) or logs in.
2. Picks one of their photos. Three sample scenes (mountains, sea, city) are
   ready for every new user; they can also upload their own.
3. **Edit mode.** Hears and reads a task, for example «Жарық қыл» деп айт,
   presses the big microphone once and says the command. Pressing the tile works
   too, and so do Tab and Enter. Tools come in groups (Light, Colour, Shape,
   Effects, Smart) so the child sees only a few tiles at once; Undo, Redo,
   Start over and Save are always visible. «Көмек» lists everything that can be
   said, with a speaker button for each command.
4. After the first request a chat slides in. The assistant praises, explains
   what it heard, and gives the next task. The six lesson steps visit every
   group once: brighten, black and white, rotate, blur, undo, auto-enhance.
5. **AI Studio.** The child says an idea («аспанға кемпірқосақ қос», «сделай
   как мультик», "draw a cat in space") or presses an idea tile. The AI's
   picture is shown next to the old one and the child chooses «Қалдыр» (keep)
   or «Қайтар» (go back), by button or by voice. Kept edits join the same undo
   history; a kept new picture becomes a new photo. A three-step lesson teaches
   adding something, changing the style, and removing something.

Each child sees only their own photos, chats and AI pictures.

## Architecture

```
Browser (React + TypeScript, Vite)                 Backend (Django + DRF, SQLite)
──────────────────────────────────                 ───────────────────────────────
voice/   microphone → 16 kHz WAV ─────────────────▶ speech/  Vosk, grammar from
                                                            shared/commands.json
editor/  27 commands: canvas pixel operations,     ai/      rembg (local), AI studio:
         undo/redo; background removal ──────────▶          providers/ gemini, cloudflare
ai/      AI studio: ideas, keep / go back  ◀──────▶          daily counter, results
chat/    message list, bubbles                     chats/   messages, both lessons,
lesson/  task card, step bar, finish view  ◀────────────── rule-based assistant.reply()
auth/    JWT login, auto token refresh     ◀──────▶ accounts/ register, login, profile
                                                   photos/  upload, edited versions
```

- **One vocabulary file.** `shared/commands.json` lists every command with its
  group and, per language, its label, the sentence describing its effect, and
  the phrases a child can say. The backend builds the speech grammars from it;
  the frontend imports the same file for tiles, help and matching. They cannot
  drift apart; tests check that every command is complete in every language and
  that no phrase belongs to two commands.
- **Editing happens in the browser.** Pixel operations are pure functions
  (`frontend/src/features/editor/engine.ts`), so undo just keeps earlier
  bitmaps. Only background removal runs on the backend, with the free local
  model rembg.
- **Chat in the current language.** The assistant's replies are stored as a
  template key plus parameters and turned into words by the frontend, so after a
  language switch the whole chat reads in the new language. The child's own
  words stay as they were spoken.
- **The rule-based assistant** (`backend/chats/assistant.py`) sits behind one
  function, `reply(command, lesson_state, …)`, so a language model could replace
  it without changing the views or the UI.
- **AI providers behind one interface** (`backend/ai/providers/base.py`:
  `transcribe`, `understand_request`, `edit_image`, `generate_image`). Which
  service does what is chosen in `.env`.
- **Isolation.** Every query is filtered by the logged-in user; another user's
  photo, chat or AI picture returns 404. Tests prove it.

## How speech recognition works

Browser speech recognition is unreliable for Kazakh, so recognition runs on the
backend with [Vosk](https://alphacephei.com/vosk/), a free offline engine.

1. One press on the microphone starts listening. The browser captures audio with
   the Web Audio API (an `AudioWorklet`) and stops by itself after about 1.5 s
   of silence following speech, or after 6 s, or on a second press.
2. The audio is downsampled to 16 kHz mono and encoded as a 16-bit PCM WAV in
   JavaScript (`features/voice/wav.ts`), so the backend reads it with Python's
   `wave` module. **No ffmpeg is needed.**
3. `POST /api/speech/recognize/` runs Vosk with a **grammar**: only the command
   phrases of that language (with "a little" / "a lot" variants such as
   «сәл жарық қыл», "чуть светлее", "much brighter") plus `[unk]`. Every phrase
   uses words that exist in the model's vocabulary.
4. The text is matched to a command. The longest phrase wins; when Vosk returns
   only part of a phrase («жарқын» for «жарқын қыл»), a command is still chosen
   if the words heard belong to that command alone.
5. The response is `{ "text": "...", "command": "grayscale", "intensity": "little" | "lot" | null }`.

Models: `vosk-model-small-kz-0.42`, `vosk-model-small-ru-0.22`,
`vosk-model-small-en-us-0.15` (40–60 MB each), loaded once and reused.

### Measured accuracy

Measured on 10 October 2026 with neural text-to-speech voices (two voices per
language, every phrase of every command), not with real children:

| Model | Clean voice | Higher pitch, slower, light noise |
|---|---|---|
| Kazakh, small model + grammar | 264 / 264 (100%) | 246 / 264 (93%) |
| Russian, small model + grammar | 265 / 265 (100%) | 261 / 261 (100%) |
| English, small model + grammar | 278 / 278 (100%) | 218 / 278 (78%) |
| Kazakh, **large** model `vosk-model-kz-0.42` (1.4 GB) | 208 / 264 (79%) | 64 / 264 (24%) |

The large Kazakh model cannot use a grammar, so it transcribes freely and does
worse on short commands. The small model with the grammar is the right choice
for commands. A smaller run through the real browser microphone flow (WAV fed
to Chrome as a fake microphone) gave the same picture: 24 of 24 clean phrases,
and 7/8 (kk), 8/8 (ru), 4/8 (en) for the child-like variants. Real children's
voices still need user testing.

Spoken feedback uses the browser's free `speechSynthesis` with a voice for the
current language.

## AI Studio

### Which services, and what is free

Checked on the official pages on 10 October 2026:

- **Google Gemini API**: the text models (for example `gemini-3.5-flash-lite`)
  are free of charge on the free tier, including audio input, with a key from
  Google AI Studio and **no bank card**. Gemini's image models (the
  "Nano Banana" family, `gemini-2.5-flash-image` and newer) are **not available
  on the free tier**, so Gemini is used only to transcribe and understand.
  Google does not publish fixed free limits any more; each project's limits are
  shown at https://aistudio.google.com/rate-limit.
- **Cloudflare Workers AI**: the free plan includes **10,000 "neurons" per day**
  (reset at 00:00 UTC). It hosts **FLUX.2 [klein] 4B**
  (`@cf/black-forest-labs/flux-2-klein-4b`), which both edits a photo from a
  text instruction and draws new pictures. One 1024 × 688 edit costs about
  110 neurons, so the free allowance is roughly 80–90 pictures per day for the
  whole account. Cloudflare also offers Whisper for speech
  (about 47 neurons per audio minute) and Llama 3.3 70B for understanding.
- Hugging Face's free monthly credit is too small for image models, and
  Pollinations offers no stable, keyed way to edit an uploaded photo, so they
  were not used.

So: **Gemini listens and understands, Cloudflare draws.** With only a
Cloudflare token the studio still works (Cloudflare does all four jobs), but
Gemini understands Kazakh better.

### Getting the keys (once, by a grown-up)

1. **Gemini**: open https://aistudio.google.com/apikey, sign in with a Google
   account, press **Create API key**, copy it.
2. **Cloudflare**: create a free account at https://dash.cloudflare.com/sign-up.
   Open the Workers AI page (https://dash.cloudflare.com/?to=/:account/ai/workers-ai)
   and select **Use REST API**. Press **Create a Workers AI API Token**, then
   **Create API Token**, and copy it. Copy the **Account ID** from the same page.
3. Put them into `.env` in the project root (never into the frontend, never
   into Git; `.env` is git-ignored):

   ```
   GEMINI_API_KEY=your-gemini-key
   CLOUDFLARE_ACCOUNT_ID=your-account-id
   CLOUDFLARE_API_TOKEN=your-token
   ```

4. Restart the backend. The «ЖИ шебері» button now opens the studio.

Without keys, the studio opens and explains in friendly words that a grown-up
needs to connect it; Edit mode keeps working fully offline.

### One request, step by step

1. **Speech to text, free-form.** The command grammar cannot be used for free
   speech, so the provider transcribes the WAV (Gemini audio understanding, or
   Whisper on Cloudflare). With `AI_TRANSCRIBE_WITH=vosk` Vosk transcribes
   offline instead; quality is clearly lower (see the table above), but it
   saves quota. `download_models.py --large-kk` fetches the large Kazakh model
   for this.
2. **Understand.** The text model answers with strict JSON:
   `{ intent: edit | generate | local_command | unclear | refused, command, prompt_en, edit_kind, reply }`.
   A plain editing command («жарық қыл») is done locally instead of spending an
   AI request. `reply` is cut to two short sentences on the server.
3. **Draw.** FLUX.2 edits the current picture or draws a new one.
4. **Choose.** Before and after are shown side by side; nothing is applied
   until the child says or presses «Қалдыр».
5. Everything goes into the photo's chat, with a small thumbnail of the result.
   Idea tiles skip steps 1 and 2.

### Child safety, privacy and limits

- Gemini runs with the strictest safety setting (`BLOCK_LOW_AND_ABOVE`) in every
  category. The system instruction says the user is a child and lists what to
  refuse (violence, scary or adult content, real people, personal data, changing
  a person's face or body); a refused request gets a gentle reply with another
  idea. Every image prompt also ends with "suitable for young children".
  FLUX on Cloudflare has no configurable safety filter, so the text model's
  screening is the main guard; this is a known limitation.
- **Privacy:** in the AI Studio the photo and the child's words are sent to
  Google and Cloudflare. A grown-up sees a one-time notice and confirms it
  (stored in the profile). Prefer the sample photos in demos.
- **Cost guard:** each user may make `AI_DAILY_LIMIT` AI requests per day
  (default 30). Requests that fail because a service is unreachable do not count.
- Waiting shows a calm, gently pulsing «Сурет салып жатырмын…», never a
  countdown. Limits and network problems are explained kindly, with a button
  back to Edit mode. Nothing is red.

## Setup on Windows (PowerShell)

Requirements: Python 3.11+, Node.js 20+, Git. All commands run from the project root.

```powershell
# 1. Backend: virtual environment and packages
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt

# 2. Settings: copy the example and put a long random value in DJANGO_SECRET_KEY.
#    For the AI Studio also add the keys (see "Getting the keys").
Copy-Item .env.example .env

# 3. Database and offline models (Vosk ~150 MB + rembg 176 MB, once)
.\.venv\Scripts\python.exe backend\manage.py migrate
.\.venv\Scripts\python.exe backend\scripts\download_models.py

# 4. Frontend packages
npm --prefix frontend install
```

New users get the sample photos automatically. For users created before (for
example with `createsuperuser`), run
`.\.venv\Scripts\python.exe backend\manage.py seed_sample_photos`.

## Run

Two terminals, both in the project root:

```powershell
# Terminal 1: backend on http://localhost:8000
.\.venv\Scripts\python.exe backend\manage.py runserver 8000
```

```powershell
# Terminal 2: frontend on http://localhost:5173
npm --prefix frontend run dev
```

Open http://localhost:5173. Vite forwards `/api` and `/media` to Django, so the
browser sees one origin.

## Tests and linters

```powershell
# Backend: auth, isolation, assistant, vocabulary, speech endpoint, AI studio (providers mocked)
.\.venv\Scripts\python.exe backend\manage.py test accounts photos chats speech ai
.\.venv\Scripts\python.exe -m ruff check backend
.\.venv\Scripts\python.exe -m ruff format --check backend

# Frontend: command registry, canvas operations, undo/redo, matching, WAV, silence detection
npm --prefix frontend test
npm --prefix frontend run lint
npm --prefix frontend run format:check
npm --prefix frontend run typecheck
```

## Design rules from dyspraxia

- Targets at least 56 px high, tiles at least 96 px, microphone 112 px, 12 px
  between targets.
- No drag and drop, double click, hover-only actions, sliders, press-and-hold,
  tiny close icons, or typing after login (profile settings are buttons only).
- Nothing is timed against the child; messages stay until the situation changes.
- Every edit can be undone, including kept AI pictures. Errors are never red and
  never blame the child.
- Every command works by voice, tile click, and keyboard (Tab + Enter).
- On a desktop screen the editor fits the window: only the chat scrolls, and the
  microphone is always visible. Opening a tool group never moves it.
- Animations are short and soft; under `prefers-reduced-motion` only fades remain.

## Known limitations

- **Children's voices:** recognition was measured with synthetic voices, not
  with children. English is the weakest with high-pitched voices.
- **Kazakh spoken feedback:** most computers have no Kazakh voice for
  `speechSynthesis`. Then the app stays silent and the child relies on the text.
- **AI Studio needs internet and keys**, and the free quotas belong to the
  services: they may change. The AI's own replies are written in the language
  the child spoke; unlike the rule-based replies they do not change after a
  language switch.
- **AI image safety** depends on the text model's screening and on the image
  model; FLUX on Cloudflare has no safety switch of its own.
- **Windows and non-Latin paths:** Vosk cannot open models in a folder whose
  path has non-Latin letters. The backend passes the short 8.3 path instead;
  if that is disabled, set `VOSK_MODELS_DIR` in `.env` to a Latin path.
- The development servers are meant for local use only; there is no production
  deployment setup.
