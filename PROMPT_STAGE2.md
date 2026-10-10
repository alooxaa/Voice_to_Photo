# Prompt for Claude Code: stage 2 (fixes, more commands, AI mode)

Paste everything below this line into Claude Code, started in the project folder.

---

This project ("Дауыс-фото", a voice-controlled photo editor that teaches children with dyspraxia) already works: React + Vite + TypeScript frontend, Django + DRF backend, Vosk speech recognition, accounts, per-photo chats. Read `CLAUDE_CODE_PROMPT.md` (the original specification), `CLAUDE.md` if it exists, and the code before changing anything. All design tokens, dyspraxia rules and code-quality rules from the original specification still apply.

The coursework topic is literally "teaching children with dyspraxia to use **AI photo editing tools** through a voice interface". Six basic filters do not cover that, so this stage adds real AI tools. Do the three parts in order, commit after each, and show me a short plan first.

## Part 1. Fix what is wrong now

1. **Chat panel is cramped.** In the editor the message list is only about 160px tall and scrolls inside a tiny box, while the step bar, the "step 6 of 6" label and the free-mode notice take the space above it. Make the chat card fill the available column height (the message list is the flexible part), move the step bar out of the chat into the page header next to the photo title, and show the free-mode notice once as a normal assistant message instead of a permanent banner.
2. **The microphone must always be visible** without scrolling at 1366×768 and 1536×730. The page itself should not scroll in the editor on desktop; only the message list scrolls.
3. **Mixed languages in one chat.** Old messages stay in the language they were written in, so a Russian UI shows Kazakh replies. Store assistant messages as a template key plus parameters (not final text) and render them in the current UI language. Child messages keep the words that were actually spoken.
4. **Unrecognised speech shows as "…".** Show a clear child bubble such as "(естілмеді)" / "(не расслышал)" / "(not heard)" and a helpful reply.
5. **Wrong hint in free mode.** After the lesson is finished the assistant must not ask for a lesson command ("say «Қараңғы қыл»"). In free mode a not-understood reply suggests two or three example commands instead.
6. **Sample photo titles are not translated** ("Mountains", "Sea", "City" in every language). Give seeded photos a translation key; user-uploaded titles stay as they are.
7. Check recognition accuracy for all three languages with the real microphone flow and tell me honestly how well Kazakh works. If the small Kazakh model is weak, try the large `vosk-model-kz` model and compare.

## Part 2. Mode 1 "Өңдеу" (Edit): many more commands, all local and free

Grow the command registry from 6 to about 24. Everything here runs in the browser or on our own backend with no external service.

| Group | Commands |
|---|---|
| Light | brighten, darken, more contrast, less contrast |
| Colour | more colourful (saturation up), less colourful, black and white, sepia / old photo, warmer, cooler, invert colours |
| Shape | rotate right, rotate left, flip horizontally (mirror), flip vertically, crop to square (centre), zoom in (centre crop 10%) |
| Effects | blur, sharpen, vignette, pixelate |
| Smart (local AI) | remove background, auto-enhance |
| Control | undo, redo, start over (reset to original), save |

- **Remove background** uses the free offline library `rembg` on the backend (endpoint `POST /api/ai/remove-background/`). The model downloads once; add it to the model download script.
- **Auto-enhance** is a local algorithm (auto-levels plus a little contrast and saturation).
- Each command: id, icon, group, label and 3 to 5 spoken synonyms in kk, ru, en. Keep the backend grammar lists and the frontend translations generated from **one source of truth** so they cannot drift apart.
- Intensity words: recognise "a little" / "a lot" variants where it makes sense ("сәл жарық қыл", "чуть светлее", "much brighter").
- **Tiles:** 24 tiles at once is too much for these children. Show group tabs as large buttons (at least 56px high), and under them only that group's tiles. Control commands (undo, redo, start over, save) stay always visible. Opening a group must not move the microphone.
- Help: the "Көмек" button opens a full list of what can be said, grouped, each with a speaker button that pronounces it.
- The guided lesson stays six steps, but pick the steps so that they visit each group once.

## Part 3. Mode 2 "ЖИ шебері" (AI Studio): generative AI by voice

A second mode, switched by two large buttons at the top of the editor: "Өңдеу" and "ЖИ шебері". Here the child speaks freely instead of saying fixed commands.

Two things the child can do:
1. **Edit the photo with words:** "мына ағашты алып таста", "аспанды күн бататындай қыл", "add a rainbow", "сделай как мультик".
2. **Create a new picture from an idea:** "ғарышта ұшып жүрген мысық сал". The result is saved as a new photo in "Менің фотоларым".

### Providers (free only, and verify before building)

Free offers change often, so **check the official documentation today** and tell me what is really free before you write the integration. What I believe is available:

- **Google Gemini API** with a free key from Google AI Studio (no bank card): an image model that both generates and edits an input image by text instruction (model id like `gemini-2.5-flash-image` or newer), a text model, and audio understanding. Confirm on ai.google.dev that the image model is on the free tier today, and its daily limit.
- If Gemini image editing is not free any more, look at Cloudflare Workers AI (free daily allowance), Hugging Face Inference, and Pollinations, and pick the best one that is free without a bank card. Tell me which one and why.

Build it behind a small provider interface on the backend (`ai/providers/base.py` with `edit_image`, `generate_image`, `understand_request`, `transcribe`), one implementation per provider, chosen by `.env`. Keys live only in `.env` on the backend, never in the frontend and never in Git; update `.env.example` and the README with exact steps to get the key.

If no key is configured, the AI mode still opens and explains in friendly words that the grown-up needs to connect it, and Mode 1 keeps working fully offline.

### Pipeline for one request

1. **Speech to text, free-form.** The Vosk command grammar cannot be used here. Use the provider's audio transcription if available (send the WAV with the language hint); otherwise fall back to Vosk without grammar and say in the README that quality is lower.
2. **Understand the request.** Send the transcript to the text model with a strict JSON response: `{ "intent": "edit" | "generate" | "local_command" | "unclear", "command": "...", "prompt_en": "...", "reply": "..." }`. If the child actually asked for something Mode 1 can do ("жарық қыл"), run the local command instead of spending an AI request. `prompt_en` is a clean English instruction for the image model; `reply` is a short friendly sentence in the child's language.
3. **Run the image model** with the current photo (for edit) or without (for generate).
4. **Show the result as a choice,** never apply it silently: before and after side by side, and two big buttons "Қалдыр" (keep) and "Қайтар" (go back). Both also work by voice. Keeping pushes it onto the same undo history as Mode 1.
5. Everything goes into the photo's chat: the child's words, the assistant's reply, a small thumbnail of the result.

### Rules for this mode

- **Waiting:** AI takes several seconds. Show a calm animated state with words ("Сурет салып жатырмын…"), never a frozen screen, and never a countdown.
- **Limits and errors:** when the free limit is reached or the network is down, say so kindly and suggest Mode 1. No red, no blame, no raw error text.
- **Child safety:** turn on the provider's strictest safety settings; add a system instruction that the user is a child and content must be suitable for children; if the request is refused, reply gently and suggest another idea. Do not let the model produce text replies longer than two short sentences.
- **Privacy:** in this mode the photo is sent to an external service. Show a one-time notice to the grown-up before first use, and write it in the README. Prefer the sample photos in demos.
- **Cost guard:** a per-user daily counter on the backend (configurable, default 30 AI requests) so a class demo cannot burn the quota.
- **Examples instead of an empty screen:** show four or five big idea tiles ("Кемпірқосақ қос", "Мультфильмге айналдыр", "Қар жаудыр") that can be pressed or spoken, so the child is never stuck.
- A short guided lesson for this mode too (three steps: add something, change the style, remove something).

## Finish

- Tests: command registry consistency across languages, new canvas operations, AI endpoints with the provider mocked, the daily counter, ownership isolation for the new endpoints.
- Update `README.md` and `CLAUDE.md`.
- Run both servers and try the full flow yourself.
- Then tell me in Kazakh: what was fixed, which AI provider you chose and its real free limits, exactly how I get the key and where I put it, how well Kazakh recognition works, and what is still limited.
