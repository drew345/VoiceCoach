# Project Context

Last Updated: 2026-04-09

## Project
Expo/React Native voice practice app for recording short practice reads, replaying takes, and cycling through coaching-oriented prompts. Android app name is now `Voice Practice`; repo/slug remain `VoiceCoach` / `voice-coach`.

## Current Goal
Support personal bilingual practice by mixing Korean prompts into the existing English prompt rotation, then keep the Android APK workflow working for phone installs.

## Current Status
- Last pushed commit is `774ff6e` on `main`.
- Local working tree has uncommitted changes for bilingual prompts and config updates.
- App was previously verified on phone for recording UI fixes and prompt/playback sync.
- New bilingual prompt system is in local code with 75 English + 75 Korean prompts.
- A fresh APK including Korean prompts finished successfully and is ready for install.

## Key Decisions
- Keep Korean prompts as a local-friendly customization, not something assumed for public release.
- Refactor prompts into structured prompt objects with `id`, `language`, and `text`.
- Use separate prompt files for English and Korean, then combine via a prompt pool selector.
- Default local behavior is mixed English/Korean rotation.
- Make `Play` snap the UI back to the prompt tied to the saved recording instead of adding a separate go-back button.
- Reserve waveform space with a subtle idle baseline instead of a blank area or heavy outline.

## Local-Only Customizations
- `app/data/prompts.ts` has `INCLUDE_KOREAN_PROMPTS = true`.
- `app/data/prompts.ts` defaults `PROMPT_MODE` to `mixed`.
- Korean prompts may be removed or disabled for a public build later.

## Release State
- Latest pushed commit: `774ff6e` (`improve recording flow and expand prompts`)
- Local uncommitted changes: bilingual prompt refactor, app name/config still unpushed
- Latest successful APK build: `fd0b0dce-0910-4a15-bfed-d0335da5e116`
- APK URL: `https://expo.dev/artifacts/eas/xfjpvw49qx2FQMmH2fPGu7.apk`

## Important Files
- `app/app/(tabs)/index.tsx` — main recording/practice screen and prompt selection logic
- `app/data/prompts.ts` — prompt types, local-only Korean toggle, prompt pool mode
- `app/data/prompts-en.ts` — English prompt dataset
- `app/data/prompts-ko.ts` — Korean prompt dataset
- `app/app.json` — app display name/icon/package config
- `app/eas.json` — EAS build profiles; `preview` builds APKs

## Open Problems
- Need on-device confirmation that Korean prompts read well in real practice use.
- Native app icon is still the project’s blue chevron; user wants a distinct custom icon later.
- Version metadata is still `1.0.0` / version code `1`, so installs may warn that the same version is already installed.
- Local config changes (`app/app.json`, `app/eas.json`) and bilingual prompt changes are not yet committed/pushed.

## Next Steps
- Install/test the latest APK with Korean prompts on phone.
- Decide whether to tune Korean wording after live use.
- Commit and push current local changes once verified.
- Later: replace icon assets and bump app version/version code before the next release-style APK.

## Gotchas / Things to Avoid
- If memory files conflict with the codebase, trust the codebase and update memory on save.
- Do not assume the home-screen icon reflects the embedded app icon; `Shortcut Maker` has been used before.
- Public release assumptions should not silently include Korean prompts.
- EAS Android builds can fail transiently due to Maven 429 rate limits; retry before assuming a code problem.
