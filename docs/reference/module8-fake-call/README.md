# Module 8 (Fake Call Generator) — reference files, not active code

**These files are NOT part of the app.** They were removed from `frontend/src/` on 2026-08-13 and
kept here only as a reference/starting point for whoever (Jayasri, or an agent helping her)
completes Module 8 properly, in the right repo, under her own name.

## Why they were removed

`fakeCallService.ts`, `IncomingCallScreen.tsx`, and `fakeCall.types.ts` (originally
`types/fakeCall.ts`) were confirmed **byte-for-byte identical** to three of the five files on
Jayasri's `integrate/fakecallgen-jayasri` branch in the sibling `Ai_WomenSafetyApp` repo (that
branch merges `"feature/fakecallgen (Jayasri)"`). They ended up in `WomenSafetyApp` via a
Claude-Code-assisted "frontend-screens-migration" session on 2026-08-10, committed under a
different person's name — misattributing her work. They've been removed from the live app here
to avoid that; see [[dont-build-collaborator-modules]] in project memory for the standing rule
this came from.

## What's in this folder

- `fakeCallService.ts` — AsyncStorage-backed config persistence (caller name, ringtone, vibrate,
  auto-play-voice), instant-trigger only.
- `IncomingCallScreen.tsx` — the full ringing UI: incoming-call visuals, ringtone playback,
  vibration, mute, speaker toggle, and **real voice playback** (calls `soundService.playVoice
  (callerName)` when `autoPlayVoice` is on — this part is genuinely functional, not a stub).
- `fakeCall.types.ts` — the `FakeCallConfig` type these two files share.

## What's confirmed missing (compared to the Module 8 spec)

Spec asks for: schedule fake calls, custom caller name, custom ringtone, voice playback,
adjustable call timing.

| Spec item | Status in these files |
|---|---|
| Custom caller name | ✅ `FakeCallConfig.callerName` |
| Custom ringtone | ✅ `FakeCallConfig.ringtone` |
| Voice playback | ✅ real (`soundService.playVoice`), gated by `autoPlayVoice` |
| **Schedule fake calls** | ❌ **not present anywhere in these 3 files** — trigger is always instant |
| **Adjustable call timing** | ❌ **not present** — ambiguous whether the spec means ring-duration or schedule-delay; needs a product decision either way |

**Important lead:** Jayasri's `integrate/fakecallgen-jayasri` branch (in `Ai_WomenSafetyApp`) also
has two files that never made it into this copy: `frontend/src/screens/FakeCallScreen.tsx` (183
lines) and `FakeCallScreen.test.tsx`. That's very likely where the actual configuration/entry
screen — and possibly the scheduling UI — lives. **Check that branch first** before building
scheduling from scratch; it may already be solved there, just not yet merged into her own repo's
main branch either.

## How these files were wired into WomenSafetyApp (now removed, for reference)

So a proper re-integration knows exactly what to restore:

- `frontend/src/screens/HomeScreen.tsx` — a `"Fake Call"` entry in the `QUICK_ACTIONS` list
  (used the `PhoneCall` icon from `lucide-react-native`).
- `frontend/src/navigation/RootStack.tsx` — an `"IncomingCall"` route: param-list entry, a
  `IncomingCallRouteScreen` wrapper component, a `<Stack.Screen>` registration, a
  `navigation.navigate("IncomingCall")` call from the Home quick-action handler, and a second
  `navigate("IncomingCall")` call from the native Android quick-settings-tile action listener
  (`addEmergencyActionListener`, action `"FAKE_CALL"`).
- The **native Android quick-settings tile still has a `FAKE_CALL` action defined** (Kotlin side,
  not touched by this removal) — it will currently fire into a no-op branch in
  `RootStack.tsx`'s listener until the feature is properly re-wired. Worth knowing so it doesn't
  look like a silent bug later.

## Recommendation

Don't just copy these 3 files back in — that reproduces the same attribution problem. Either:
1. Have Jayasri complete Module 8 (including the missing scheduling piece) in her own repo and
   bring it into `WomenSafetyApp` through a normal PR under her own name, or
2. If `Ai_WomenSafetyApp`'s `integrate/fakecallgen-jayasri` branch already has everything needed
   (check `FakeCallScreen.tsx` there first), integrate that properly with credit intact.
