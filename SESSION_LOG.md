# Session Log

## 2026-04-09
- Added project memory system notes request and created `AGENT_CONTEXT.md` / `SESSION_LOG.md`.
- Refactored prompt data into structured bilingual files: `prompts-en.ts`, `prompts-ko.ts`, and pool selector in `prompts.ts`.
- Added 75 Korean prompt counterparts and set local default rotation to mixed English/Korean.
- Updated UI to display prompt language label on the main practice screen.
- Retried Android APK build after one transient Gradle/Maven 429 failure; successful build ID is `fd0b0dce-0910-4a15-bfed-d0335da5e116`.
- Next step: install/test Korean prompt APK on phone, then commit/push local changes if the experience feels good.

## 2026-03-21
- Verified repo sync with GitHub and confirmed `main` matched `origin/main`.
- Patched recording UI to reserve waveform space, then refined it with a subtle idle baseline.
- Added hidden prompt/audio sync behavior so pressing `Play` after `New prompt` returns to the prompt tied to the saved take.
- Expanded English prompt set from 55 to 75 and cleaned prompt file encoding.
- Renamed app display name to `Voice Practice`, configured EAS `preview` profile to build APKs, built and installed an Android APK successfully.
- Learned existing phone launcher icon was from `Shortcut Maker`, not the app’s embedded icon assets.
