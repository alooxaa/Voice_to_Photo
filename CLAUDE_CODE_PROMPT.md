# Prompt for Claude Code: "Дауыс-фото" (full project)

Paste everything below this line into Claude Code, started in this folder.

---

Build a complete, locally runnable web application for a university HCI coursework project, in this folder.

**Topic:** a voice user interface (VUI) that teaches children with dyspraxia to use photo editing tools. Dyspraxia impairs motor coordination: small targets, dragging and precise clicks are hard for these children, while their thinking is unaffected. So the app is driven by voice, with very large buttons as a fallback for every action.

I am a student. I will defend this project and push it to Git, so the code must be clean, consistently structured, commented where the reasoning is not obvious, and explainable. Prefer simple, readable solutions over clever ones.

## Hard requirements

1. **Frontend:** React with Vite and TypeScript, good architecture, tasteful animations.
2. **Backend:** Django with Django REST Framework, SQLite database.
3. **Accounts:** every person has their own profile; they log in and continue their own work. Their photos and chats are saved and visible only to them.
4. **Three languages:** Kazakh (default), Russian, English. Everything switches: UI text, voice commands, speech recognition, spoken feedback.
5. **Kazakh speech recognition must really work.** See "Speech recognition".
6. **Free only.** No paid APIs, no API keys required to run. Everything works offline after the first setup.
7. **Local run.** We test on a local Windows machine. Use a Python virtual environment at `.venv` in the project root. Give me exact PowerShell commands.
8. **Git ready.** See "Git and code quality".

Before writing code, check what is installed (`python --version`, `node --version`, `git --version`) and tell me if something is missing instead of guessing.

## Project structure

```
.venv/                     Python virtual environment (git-ignored)
backend/
  manage.py
  requirements.txt
  config/                  settings, urls
  accounts/                registration, login, profile
  photos/                  photo upload, edited versions
  chats/                   per-photo chat messages, lesson progress
  speech/                  speech recognition endpoint (Vosk)
  media/                   uploaded files (git-ignored)
  models_stt/              downloaded Vosk models (git-ignored)
  scripts/download_models.py
frontend/
  src/
    app/                   router, providers, layout
    pages/                 Login, Register, Home, Editor, Profile
    features/
      auth/                api, store, forms
      voice/               recording, recognition client, command matching, speech synthesis
      editor/              canvas engine, command registry, undo history
      chat/                message list, bubbles, composer
      lesson/              guided steps
    shared/
      ui/                  Button, Card, Tile, MicButton, LanguageSwitch ...
      api/                 HTTP client with auth
      i18n/                kk.json, ru.json, en.json
      styles/              tokens.css, global.css
.gitignore
.env.example
README.md
```

Frontend libraries: `react-router-dom`, `react-i18next`, `zustand` for state, `motion` (Framer Motion) for animation, CSS Modules for styles. No UI kit: build the few components we need, so the design stays ours.

Backend libraries: `django`, `djangorestframework`, `djangorestframework-simplejwt`, `django-cors-headers`, `Pillow`, `vosk`, `python-dotenv`. Pin versions in `requirements.txt`.

## Speech recognition (the most important technical part)

Browser speech recognition is unreliable for Kazakh, so recognition runs on our own backend with **Vosk**, a free offline engine that has Kazakh, Russian and English models.

- Models come from https://alphacephei.com/vosk/models. Expected names: `vosk-model-small-kz-0.15`, `vosk-model-small-ru-0.22`, `vosk-model-small-en-us-0.15`. Open that page and confirm the current names before downloading. Write `backend/scripts/download_models.py` that downloads and unpacks them into `backend/models_stt/`, skips ones already present, and shows progress.
- Load each model once and reuse it (lazy, per language), not per request.
- Endpoint `POST /api/speech/recognize/` takes an audio file and `lang` (`kk`, `ru`, `en`) and returns `{ "text": "...", "command": "grayscale" | null }`.
- **Use Vosk's grammar feature:** pass the recogniser the list of all command phrases for that language plus `"[unk]"`. Restricting the vocabulary to our commands makes recognition far more accurate, which matters for children's voices. Keep the phrase lists in one backend file per language so they stay in sync with the frontend translations.
- **Audio format without ffmpeg:** in the browser, capture the microphone with the Web Audio API, resample to 16 kHz mono, and encode a 16-bit PCM WAV in JavaScript. Send that WAV. The backend then reads it with Python's `wave` module. Do not require ffmpeg.
- Recording UX: one press on the microphone starts listening; it stops automatically after about 1.5 seconds of silence or 6 seconds in total, or on a second press. Never require press-and-hold.
- If the microphone is blocked or the backend is unreachable, say so plainly in the UI and keep the command tiles usable.

**Spoken feedback:** use the browser's `speechSynthesis` (free). Pick a voice matching the language. Many computers have no Kazakh voice; in that case skip speech silently and rely on the on-screen text. Mention this limitation in the README.

## Commands

One registry, used by voice, tiles and chat alike. Each command has an id, an icon, a label per language, and several spoken synonyms per language.

| id | kk label | ru label | en label | effect |
|---|---|---|---|---|
| `brighten` | Жарық қыл | Сделай светлее | Brighten | brightness +15% |
| `darken` | Қараңғы қыл | Сделай темнее | Darken | brightness −15% |
| `grayscale` | Ақ-қара | Чёрно-белое | Black and white | grayscale |
| `rotate` | Бұр | Поверни | Rotate | rotate 90° clockwise |
| `undo` | Артқа | Назад | Undo | undo last action |
| `save` | Сақта | Сохрани | Save | save the edited photo |

Add 3 to 5 natural synonyms per command per language. Write the Russian and English UI text yourself, naturally, not as word-for-word translations of the Kazakh.

Editing happens in the browser on a `<canvas>` with real pixel operations and an undo history. `save` uploads the edited image to the backend as a new version of that photo and also offers a download.

## Data model and API

- `User` (Django's) plus `Profile`: display name, preferred language, avatar colour.
- `Photo`: owner, title, original image, latest edited image, created/updated.
- `ChatMessage`: photo, role (`child` | `assistant`), kind (`text` | `task` | `praise` | `retry`), text, command id (nullable), created.
- `LessonProgress`: user, photo, current step, finished flag.

Every queryset is filtered by `request.user`. A user must never be able to read or change another user's photo or chat; write tests that prove this.

Endpoints under `/api/`: `auth/register/`, `auth/login/`, `auth/refresh/`, `auth/me/` (get and update profile), `photos/` (list, upload, detail, delete, save edited version), `photos/<id>/messages/` (list, create), `photos/<id>/progress/`, `speech/recognize/`. JWT auth; the frontend stores tokens and refreshes them automatically.

Registration is simple for a child: display name, username, password (twice). No email confirmation.

Seed three sample photos (simple SVG or generated scenes: mountains, sea, city) that every new user gets, so there is something to edit immediately.

## Assistant replies

The chat looks like an AI chat, but replies are produced by a free, local, rule-based function: `assistant.reply(command, lesson_state, lang)` returns praise, a not-understood message, or the next task, from templates with a few variations each so it does not sound robotic. Keep this behind one clear interface so a real language model could be connected later without changing the UI. Do not call any external AI API.

## Screens and flow

1. **Login / Register.** Large fields, large buttons, language switch visible.
2. **Home ("Менің фотоларым").** Greeting with the display name; a grid of the user's photos as big cards (thumbnail, title, a small mark if it has a chat); a dashed card "Өз фотоңды жүкте" opening a file picker. Choosing a photo opens the editor.
3. **Editor.** Two phases:
   - **Before the first request:** no chat on screen. The photo is large and centred. Below it, the task card ("1-тапсырма: «Жарық қыл» деп айт", with a "Тапсырманы тыңда" button), the big microphone with its status text, and the six command tiles.
   - **After the first request** (the first recognised voice command or tile click): the chat panel slides in from the right and the photo area smoothly shrinks to make room (animate the layout change). From then on the chat stays open. The first request and its reply are the first messages. If the photo already has saved messages, open the editor directly in this second phase with the history loaded.
   - Chat panel: header with photo thumbnail, title and "Осы фотоның чаты"; message list scrolled to the newest; composer at the bottom with the microphone and status. **No text input** anywhere: the child talks or presses tiles.
   - Guided lesson of six steps in this order: brighten, darken, grayscale, undo, rotate, save. A step bar in the header shows progress. A different valid command still works; the assistant then gently repeats the task. After step six, show a finish view (before and after photos, the words learned, "Фотоны сақтау", "Тағы бір фото өңдеу"), and from then on the photo is in free mode: any command, no tasks.
4. **Profile.** Display name, language, avatar colour, log out.

## Design

Calm, editorial, friendly. Not childish clip-art, not a generic dashboard.

| Token | Value | Use |
|---|---|---|
| `--ground` | `#EAF0FB` | page background, assistant bubbles |
| `--surface` | `#FFFFFF` | cards |
| `--ink` | `#16203A` | text, strong borders, task bubble background |
| `--ink-soft` | `#3C4A6B` | secondary text |
| `--line` | `#9AA8C7` | quiet borders |
| `--blue` | `#2450D8` | microphone, primary buttons, child bubbles, completed steps |
| `--blue-ring-1` | `#C9D6F8` | inner ring around the microphone |
| `--blue-ring-2` | `#E3EAFB` | outer ring around the microphone |
| `--sun` | `#FFC53D` | praise, current step, the command to say now |

Do not add other colours. Text on `--sun` is `--ink`; text on `--blue` and `--ink` is white.

**Fonts** (Google Fonts, load the `cyrillic-ext` subset so Kazakh letters render): **Source Serif 4** weight 600 for headings, the product name, task text and status titles, letter-spacing −0.01em; **Golos Text** weights 400, 500, 600 for everything else. Never weight 700. Sizes: body 20px, secondary 18px, card heading 24px, task 28px, page headline 48 to 56px.

**Shapes:** cards radius 28px and padding 24px; tiles radius 20px; small buttons radius 16px; 20px gaps between cards. No shadows except the two microphone rings. No gradients.

**Chat bubbles:** assistant `--ground`, left, radius `20px 20px 20px 6px`; child `--blue` with white text and a small microphone icon, right, radius `20px 20px 6px 20px`; task bubble `--ink` with a small "N-тапсырма" label, the task in serif, and an outlined "Тапсырманы тыңда" button; praise bubble `--sun`, semibold, with a check icon; not-understood is an ordinary assistant bubble, shown under a child bubble with the misheard text.

**Tiles:** icon above label, min height 96px. The tile for the current task: `--sun` background, 4px `--ink` border.

Icons: one consistent line-icon set (for example `lucide-react`). No emoji.

### Rules that come from dyspraxia (do not break these)

1. Every clickable target is at least 56px high; tiles at least 96px; the microphone is a 112px circle. At least 12px between targets.
2. No drag and drop, no double click, no hover-only actions, no sliders, no press-and-hold, no tiny close icons, no typing after login.
3. Nothing is timed against the child. Nothing important disappears on its own.
4. Every edit can be undone.
5. Errors never use red and never blame the child. They say what was heard and what to do next.
6. Every command works three ways: voice, tile click, keyboard (Tab and Enter). Focus outline: `4px solid var(--ink)`, offset 3px.

### Animation

Purposeful, soft, short (200 to 400ms, ease-out). Use `motion`:
- microphone rings pulse while listening;
- the chat panel slides in and the photo area resizes on the first request;
- new chat bubbles rise in gently;
- the photo cross-fades when an effect is applied, and turns smoothly on rotate;
- page transitions fade;
- a small celebratory moment on the finish view.

No animation may move a target the child is about to press. Under `prefers-reduced-motion`, replace all of this with simple fades or nothing.

### Accessibility

Real `<button>`, `<a>`, `<label>` and `<input>` elements. `aria-label` on icon-only controls. The chat list and the status are `aria-live="polite"`. Contrast at least 4.5:1. `<html lang>` follows the chosen language. Layout works from 360px to 1440px; on narrow screens the chat goes below the photo.

## Git and code quality

- `git init` if there is no repository. Write a correct `.gitignore` (`.venv/`, `node_modules/`, `__pycache__/`, `db.sqlite3`, `backend/media/`, `backend/models_stt/`, `.env`, build output).
- Commit in small, meaningful steps with clear messages (conventional style: `feat:`, `fix:`, `docs:`, `chore:`). Do not push; I will add the remote myself.
- No secrets in the repository. Settings read from `.env`; provide `.env.example`. `DEBUG` and `SECRET_KEY` come from the environment.
- Backend: `ruff` for linting and formatting; Django tests for auth, ownership isolation, and the speech endpoint (mock the recogniser).
- Frontend: ESLint and Prettier; strict TypeScript; no `any`. A few tests with Vitest for command matching and the canvas engine.
- No dead code, no commented-out blocks, no leftover console logs.
- `README.md` in English: what the project is and who it is for, a screenshot placeholder, architecture overview, setup and run steps for Windows PowerShell, how speech recognition works, known limitations, and how to run tests.

## Local run

Work in this order and verify each stage before the next:

1. Create `.venv` in the project root, install backend requirements, run migrations, download the Vosk models, seed sample photos.
2. Scaffold the frontend, install dependencies.
3. Backend runs on `http://localhost:8000`, frontend on `http://localhost:5173`, with CORS configured for that origin and a Vite proxy for `/api` and `/media`.
4. Run both and check the whole flow yourself: register, log in, open a photo, give a command, see the chat appear, reload and see the chat still there, log in as a second user and confirm they see none of the first user's data.
5. Run linters and tests; fix what fails.

Plan first: show me a short plan and the list of files before you start, then build.

## When you finish

Give me, in Kazakh:
1. the exact PowerShell commands to start the backend and the frontend;
2. a short explanation of the architecture I can use when defending the project;
3. what is limited or not done, stated honestly.
