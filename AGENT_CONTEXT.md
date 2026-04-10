# Project Context

Last Updated: 2026-04-10

## Project
Expo/React Native voice practice app for recording short reads, replaying takes, and practicing with coaching-style prompts. The installed app name is `Voice Practice`; repo and Expo slug remain `VoiceCoach` / `voice-coach`.

## Current Goal
Project is in a stable resting state after bilingual prompt support, title cleanup, and embedded icon update. Future work will likely be icon refinement, versioning cleanup, or new app features.

## Current Status
- Last pushed commit before the current local changes is `6f99152` on `main`.
- Local working tree currently has title/icon/memory updates ready to commit and push.
- App has been verified on phone with bilingual prompts, title cleanup, and the new embedded icon.
- Prompt pool is 75 English + 75 Korean prompts in mixed rotation by default.
- Latest APK with the new icon/title was built and installed successfully.

## Key Decisions
- Keep Korean prompts as a local-friendly customization, not something assumed for public release.
- Refactor prompts into structured prompt objects with `id`, `language`, and `text`.
- Use separate prompt files for English and Korean, then combine via a prompt pool selector.
- Default local behavior is mixed English/Korean rotation.
- Make `Play` snap the UI back to the prompt tied to the saved recording instead of adding a separate go-back button.
- Reserve waveform space with a subtle idle baseline instead of a blank area or heavy outline.
- Show `Prompt` only, without `English` / `Korean` subtitle labels.
- Show `Voice Practice` as the on-screen app title.
- Adopt the user-supplied `VoicePracticeIcon.png` as the embedded app icon source for future APKs.

## Local-Only Customizations
- `app/data/prompts.ts` has `INCLUDE_KOREAN_PROMPTS = true`.
- `app/data/prompts.ts` defaults `PROMPT_MODE` to `mixed`.
- Korean prompts may be removed or disabled for a public build later.
- The user has previously used `Shortcut Maker` on phone, so launcher appearance may not always reflect the real embedded app icon.

## Release State
- Latest pushed commit before current changes: `6f99152` (`add bilingual prompts and project memory`)
- Local uncommitted changes: title text fix, icon asset update, memory refresh
- Latest successful APK build: `ac66e027-2092-4bf7-8534-2fa3263086df`
- APK URL: `https://expo.dev/artifacts/eas/nhKV4aRmrv6VQ53vTyhC1P.apk`
- Phone install status: verified working

## Important Files
- `app/app/(tabs)/index.tsx` - main recording/practice screen and prompt selection logic
- `app/data/prompts.ts` - prompt types, local-only Korean toggle, prompt pool mode
- `app/data/prompts-en.ts` - English prompt dataset
- `app/data/prompts-ko.ts` - Korean prompt dataset
- `app/app.json` - app display name and icon config
- `app/assets/images/icon.png` - primary app icon source
- `app/assets/images/android-icon-foreground.png` - Android adaptive foreground icon
- `app/eas.json` - EAS build profiles; `preview` builds APKs

## Open Problems
- Current user-supplied icon is acceptable and working, but may still be refined later for originality/polish.
- Version metadata is still `1.0.0` / version code `1`, so installs may warn that the same version is already installed.
- Adaptive icon background is still `#E6F4FE`; may want white or a more deliberate brand color later.

## Next Steps
- Commit and push the current title/icon/memory changes.
- Later: refine the icon art and optionally add dedicated adaptive/monochrome variants.
- Later: bump app version/version code before the next release-style APK.

## Gotchas / Things to Avoid
- If memory files conflict with the codebase, trust the codebase and update memory on save.
- Do not assume the home-screen icon reflects the embedded app icon; `Shortcut Maker` has been used before.
- Public release assumptions should not silently include Korean prompts.
- EAS Android builds can fail transiently due to Maven 429 rate limits; retry before assuming a code problem.
