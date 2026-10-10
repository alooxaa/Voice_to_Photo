# CLAUDE.md

Notes for working on this repository. `README.md` explains the product and setup;
`CLAUDE_CODE_PROMPT.md` and `PROMPT_STAGE2.md` are the original briefs and their
design and dyspraxia rules still apply.

## Layout

- `shared/commands.json`: the only place command ids, groups, labels, effect
  sentences and spoken phrases live (kk, ru, en). Backend: `speech/vocabulary.py`.
  Frontend: imported in `features/editor/commands.ts` and merged into i18n as
  `commands.<id>.*` and `choices.<id>.*`. Add a command here, then give it an icon
  and (if it changes pixels) a transform in `commands.ts`.
- Every spoken phrase must exist in the small Vosk model's vocabulary, or Vosk
  silently drops it from the grammar. Check new words before adding them.
- `backend/chats/assistant.py`: rule-based replies. It returns template keys plus
  params; the wording is in `frontend/src/shared/i18n/*.json` under `assistant`
  and is rendered by `features/chat/messageText.ts`. Never store final assistant
  text for rule-based replies.
- `backend/ai/`: rembg background removal and the AI Studio. Providers implement
  `providers/base.py`; `providers/__init__.py` picks them from `.env`.
  `services.py` is the request pipeline; `usage.py` the daily counter.

## Commands (PowerShell, project root)

```powershell
.\.venv\Scripts\python.exe backend\manage.py test accounts photos chats speech ai
.\.venv\Scripts\python.exe -m ruff check backend; .\.venv\Scripts\python.exe -m ruff format backend
npm --prefix frontend test; npm --prefix frontend run lint; npm --prefix frontend run typecheck
npm --prefix frontend run format
```

## Conventions

- Only the colour tokens in `shared/styles/tokens.css`; no shadows except the
  microphone rings; no red; targets ≥ 56 px, tiles ≥ 96 px, microphone 112 px.
- Every queryset goes through `photos_of(request.user)` / `own_photo(...)`;
  add an isolation test for every new endpoint.
- Tests never call external services: mock `ai.services.text_provider` /
  `image_provider` (see `ai/tests.py`, `FakeProvider`).
- Strict TypeScript, no `any`, no non-null assertions, no console logs.
- Commits: conventional style (`feat:`, `fix:`, `docs:`, `chore:`).
