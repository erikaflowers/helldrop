# HELLDROP — Frontend Execution Plan

**Author:** Brash (Full-Stack Developer)
**Date:** 2026-03-03
**Status:** Draft — Awaiting Operator Review

---

## Situation

We have a clean app shell deployed — black and yellow Helldivers palette, collapsible sidebar, header. The scaffold is standing. Now we need to turn it into a working audio mod tool.

The PRD defines two modes: **Sound Mods** (persistent SFX/voice replacements) and **Mission DJ** (rapid soundtrack swapping). The architecture doc defines a Python/FastAPI backend on localhost:8000 with SQLite storage. Our job is the React frontend that talks to that backend.

### What Exists Today

- App shell with sidebar (5 placeholder nav items), header, content area
- Design token system (black/yellow palette, spacing, typography)
- State management scaffold (Context + useReducer, currently only sidebar collapse)
- API service wrapper (`services/api.js`) pointing at `VITE_API_URL`
- ErrorBoundary component
- Zero business logic, zero screens, zero API integration

### What We're Building Toward

A tool where a Helldiver can:
1. Browse all game audio by category (weapons, voices, stratagems, music, ambient, UI)
2. Replace individual sound effects with custom audio (drag-drop, persist across sessions)
3. Build named soundtrack collections mapped to music slots
4. Quick-swap soundtracks between missions in under 10 seconds

---

## Strategic Decisions

These decisions shape everything that follows.

### 1. Build Frontend-First With Mock Data

The Python backend doesn't exist yet. We don't wait for it. We build every screen against mock data and a fake API layer, then swap in the real endpoints when the backend is ready. This means:

- `services/api.js` stays as-is but we add a `services/mock.js` that returns hardcoded responses matching the API contract from the architecture doc
- A feature flag in the store (`useMockData: true`) controls which service layer components hit
- When the backend comes online, we flip one boolean and everything connects

**Why:** Waiting for backend is how projects die. The frontend IS the product for the user. Ship the UI, validate the UX, then wire up the plumbing.

### 2. Mission DJ Is The Priority Screen

The PRD is clear: Mission DJ is the killer feature. Sound Mods is the "also does this" feature. We build Mission DJ first, Sound Mods second. The sidebar nav order should reflect this — Mission DJ above Sound Mods.

### 3. No Routing Library Yet

Five screens don't need React Router. We use a simple `activeView` string in the store and conditionally render the correct screen component. When the app outgrows this (10+ views, deep linking, URL sharing), we add routing. Not before.

### 4. Audio Playback Via Web Audio API

No audio library dependency. The Web Audio API handles preview playback natively. The backend streams WEM-to-WAV conversions; we just play the resulting audio buffer. One utility in `core/audio.js` handles play/pause/stop state.

### 5. Drag-and-Drop Via HTML5 API

No `react-dropzone`. The HTML5 Drag and Drop API plus the File API handles everything we need. One utility in `core/dragdrop.js` wraps the event handling. If cross-browser edge cases bite us, we add a library then — not before.

---

## Navigation Architecture

The sidebar nav items map to these views:

| Nav Item | View ID | Priority | Description |
|----------|---------|----------|-------------|
| Mission DJ | `mission-dj` | Phase 1 | Soundtrack selector, editor, deploy |
| Sound Mods | `sound-mods` | Phase 2 | Category browser, SFX replacement |
| Audio Library | `library` | Phase 1 | Uploaded files, conversion status |
| Game Scanner | `scanner` | Phase 1 | Game detection, initial scan, slot catalog |
| Settings | `settings` | Phase 3 | Game path, Wwise path, preferences |

**Dashboard is cut.** It added nothing. The default landing view is Mission DJ — the thing you came here to do.

---

## Phase 1: Foundation + Mission DJ Shell

**Goal:** Navigable app with Mission DJ screen rendering mock data. User can browse soundtrack library, see music slots, and understand the workflow — even without a backend.

### Design System Additions

`design-system/tokens.css`:
- Card tokens: `--card-bg`, `--card-border`, `--card-hover-bg`
- Badge tokens for status indicators: deployed (green), modified (yellow), error (red)
- Drop zone tokens: dashed border styling for drag targets
- Audio player tokens: waveform colors, progress bar

### Core Logic

`core/store.jsx` — Add to state:
```
activeView: 'mission-dj'        // Current screen
soundtracks: []                  // Soundtrack library (from API/mock)
activeSoundtrack: null           // Currently selected for editing
deployedSoundtrack: null         // What's live in-game
gameSlots: []                    // Music slot catalog
audioLibrary: []                 // User's uploaded files
```

New actions:
```
SET_ACTIVE_VIEW
SET_SOUNDTRACKS / ADD_SOUNDTRACK / UPDATE_SOUNDTRACK / DELETE_SOUNDTRACK
SET_ACTIVE_SOUNDTRACK
SET_DEPLOYED_SOUNDTRACK
SET_GAME_SLOTS
SET_AUDIO_LIBRARY / ADD_AUDIO_FILE
```

`core/audio.js` — Audio playback utility:
- `createPlayer(url)` → returns `{ play, pause, stop, isPlaying, currentTime, duration }`
- Pure state machine, no React dependency
- Web Audio API under the hood

`core/mock-data.js` — Hardcoded datasets:
- 5 example soundtracks with slot mappings
- 20+ music game slots (from the HD2 modding wiki WEM IDs)
- 10 example audio library files
- Matches the SQLite schema from the architecture doc exactly

### Services

`services/mock.js` — Fake API that returns mock data with realistic delays:
- `getSoundtracks()` → returns mock soundtracks after 200ms
- `deploySoundtrack(id)` → simulates 3-second deploy with progress
- `getGameSlots()` → returns categorized music slots
- `getAudioLibrary()` → returns uploaded files list
- Same function signatures as the real API calls we'll write later

`services/soundtrack.js` — Soundtrack API (calls mock or real based on flag):
- `fetchSoundtracks()`
- `createSoundtrack(data)`
- `updateSoundtrack(id, data)`
- `deleteSoundtrack(id)`
- `deploySoundtrack(id)`

### UI Components

**Sidebar update** — Replace placeholder nav items with the real navigation. Active view highlighting.

**Screen: Mission DJ** (`src/screens/MissionDJ.jsx`):
- **Top:** Soundtrack selector (dropdown or card picker) + Deploy button + status badge
- **Middle:** Slot editor grid — each music slot shows label, current assignment, play button, drop zone
- **Bottom:** Quick actions — New, Duplicate, Random

**Screen: Audio Library** (`src/screens/AudioLibrary.jsx`):
- File upload zone (drag-drop area)
- List of uploaded files with name, duration, format, conversion status
- Play preview button per file

**Screen: Game Scanner** (`src/screens/GameScanner.jsx`):
- Game path detection status
- "Scan" button to trigger initial catalog build
- Slot catalog table (WEM ID, label, category, duration)

**Shared components:**
- `AudioPlayer.jsx` — Play/pause button with progress bar, reusable everywhere
- `DropZone.jsx` — Drag-and-drop file target with visual feedback
- `StatusBadge.jsx` — Green/yellow/red indicator
- `SlotCard.jsx` — Single music slot display with assignment + preview
- `SoundtrackCard.jsx` — Soundtrack summary card for the selector

### File Count Estimate: Phase 1

| Layer | Files | New/Modified |
|-------|-------|-------------|
| Design System | 1 | Modified (tokens.css) |
| Core | 3 | New (audio.js, mock-data.js) + Modified (store.jsx) |
| Services | 2 | New (mock.js, soundtrack.js) |
| UI - Screens | 3 | New (MissionDJ, AudioLibrary, GameScanner) |
| UI - Components | 7 | New (AudioPlayer, DropZone, StatusBadge, SlotCard, SoundtrackCard) + Modified (Sidebar, App) |
| CSS | ~8 | New component styles |
| **Total** | **~24** | |

---

## Phase 2: Sound Mods + Real Interactivity

**Goal:** Sound Mods screen with category browser. Drag-and-drop file assignment working end-to-end (against mocks). Audio preview playback functional.

### Core Logic

`core/categories.js` — Game audio category definitions:
- Weapons, Character Voices, Stratagems, Music (redirects to Mission DJ), Ambient, UI Sounds
- Category → slot filtering logic
- Search/filter across slots

### Services

`services/sfx.js` — SFX mod API:
- `getSfxMods()` — Current persistent replacements
- `setSfxReplacement(slotId, audioFileId)` — Assign audio to a slot
- `removeSfxReplacement(slotId)` — Clear a slot
- `buildSfxMod()` — Trigger mod build
- `deploySfxMod()` — Deploy to game

### UI Components

**Screen: Sound Mods** (`src/screens/SoundMods.jsx`):
- Left sub-nav: category accordion or list
- Main area: slots for selected category
- Each slot: game audio label, play original, drop zone, play replacement, enable/disable toggle
- "Build & Deploy" action bar

**New shared components:**
- `CategoryNav.jsx` — Category list with counts
- `SfxSlotRow.jsx` — Single SFX slot with full controls
- `SearchBar.jsx` — Filter slots by name/ID

---

## Phase 3: Polish + Settings + Backend Integration

**Goal:** Settings screen, refined UX, and the real backend swap.

### UI Components

**Screen: Settings** (`src/screens/Settings.jsx`):
- Game install path (auto-detected or manual browse)
- Wwise install path
- Default deploy behavior
- About/version info

### Backend Integration

When the FastAPI backend comes online:
1. Set `useMockData: false` in store
2. Update `services/api.js` base URL to `http://localhost:8000`
3. Write real API functions in `services/soundtrack.js` and `services/sfx.js` matching the mock signatures
4. Mock layer stays intact for development/testing

### Polish

- Keyboard shortcuts (Deploy = Ctrl+D, etc.)
- Toast notifications for deploy success/failure
- Loading states and skeleton screens
- Empty states with helpful messaging
- Error recovery UI

---

## Phase 4: Advanced Features

Not planning in detail yet. These emerge from usage:

- Soundtrack import/export (share with other Helldivers)
- Random soundtrack mode
- Duration matching warnings and auto-trim
- Batch operations
- Mod conflict detection
- Game update resilience (rescan prompt)

---

## Technical Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Backend API contract changes | Service layer rewrites | Mock layer matches architecture doc schema exactly. Changes are isolated to service files. |
| Wwise encoding dependency | Users must install Wwise separately | Settings screen validates Wwise install. Clear error messaging. This is a backend concern but frontend must surface it. |
| WEM duration matching | Mods crash if duration mismatches | Frontend shows duration comparison (original vs replacement) with warning states. Backend handles padding. |
| Large file uploads | Browser memory pressure | Chunked upload via File API. Progress indicators. Backend handles heavy conversion. |
| Game updates break slot catalog | WEM IDs shift, labels wrong | Frontend shows "last scanned" date. Rescan button. Backend detects version changes. |

---

## Open Questions for Max

1. **Soundtrack selector style:** Dropdown list or visual card grid? Cards look better but take more space. The architecture doc mentions both.

2. **Audio preview scope:** Do we preview original game audio (requires backend to stream WEM→WAV), or only user-uploaded files? Previewing originals is the better UX but needs backend support from Phase 1.

3. **Mod manager integration:** Do we deploy directly to the game folder, or generate patch files for Arsenal/Vortex to manage? The architecture doc mentions both approaches. Direct deploy is simpler but bypasses load order management.

4. **Sidebar behavior on small windows:** Collapse automatically below a certain width, or let the user manage it? This matters if anyone runs Chrome side-by-side with the game.

---

## Execution Order Summary

```
Phase 1 (Foundation + Mission DJ)
├── 1. Design tokens for cards, badges, drop zones
├── 2. Core: store expansion, audio utility, mock data
├── 3. Services: mock API, soundtrack service
├── 4. UI: Navigation wiring (activeView routing)
├── 5. UI: Mission DJ screen with slot editor
├── 6. UI: Audio Library screen
├── 7. UI: Game Scanner screen
└── 8. Shared components (AudioPlayer, DropZone, StatusBadge, etc.)

Phase 2 (Sound Mods)
├── 1. Core: category definitions
├── 2. Services: SFX mod API
├── 3. UI: Sound Mods screen with category browser
└── 4. Shared components (CategoryNav, SfxSlotRow, SearchBar)

Phase 3 (Polish + Backend)
├── 1. UI: Settings screen
├── 2. Backend integration (swap mock → real)
├── 3. Loading states, error handling, toasts
└── 4. Keyboard shortcuts, empty states

Phase 4 (Advanced)
└── Driven by usage and feedback
```

---

*"The plan survives first contact with the enemy. The architecture survives every contact after that."*
