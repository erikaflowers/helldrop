# HELLDROP — Technical Architecture

**Project:** Helldivers 2 Audio Mod Manager
**Codename:** HELLDROP
**Author:** Julian (Orchestrator)
**Date:** February 13, 2026
**Status:** Planning

---

## Overview

HELLDROP is a browser-based tool for managing Helldivers 2 audio mods with two distinct interaction modes:

1. **Set & Forget** — Persistent sound effect and voice replacements (traditional mod workflow)
2. **Mission DJ** — Rapid soundtrack swapping between missions (the killer feature)

The tool runs locally on a Windows PC. Python backend handles binary parsing and audio conversion. React frontend provides the interface through Chrome.

---

## Technical Context: Helldivers 2 Audio Format

### Wwise Audio Engine

Helldivers 2 uses Audiokinetic Wwise, an industry-standard game audio middleware. Audio assets are stored in:

- **`.bnk` files (SoundBanks)** — Binary containers with audio data and behavioral metadata
- **`.wem` files (Wwise Encoded Media)** — Individual audio clips in Wwise's proprietary format (Vorbis/Opus in a custom container)
- **Stingray engine archives** — Game-specific packaging layer wrapping the Wwise assets

### SoundBank Structure

Each `.bnk` file contains these sections (in order):

```
┌─────────────────────────────────────┐
│ BKHD — Bank Header                 │
│   Version, bank ID, metadata       │
├─────────────────────────────────────┤
│ DIDX — Data Index                  │
│   WEM ID → offset + size mappings  │
├─────────────────────────────────────┤
│ DATA — Audio Data                  │
│   Raw .wem bytes packed end-to-end │
├─────────────────────────────────────┤
│ HIRC — Hierarchy                   │
│   Event → action → sound mappings  │
│   Volume, bus routing, states      │
│   Switch/state containers          │
└─────────────────────────────────────┘
```

### Replacement Pipeline

To replace audio:
1. Convert source audio (MP3/WAV) to `.wem` using Wwise CLI encoder or FFmpeg with appropriate codec
2. Locate target WEM ID in DIDX section
3. Replace bytes in DATA section
4. Recalculate and update byte offsets in DIDX
5. Write modified `.bnk` to disk
6. Package as patch file for mod manager compatibility

### Existing Tools

- **hd2-audio-modder** (RaidingForPants) — Python/tkinter, 215 commits, v1.19.2, actively maintained. Handles full parse/replace/repack pipeline. Key files: `core.py` (parsing), `db.py` (asset database), `wwise_hierarchy_140.py` / `wwise_hierarchy_154.py` (HIRC parsing for different Wwise versions). License needs verification before reuse.
- **vgmstream** — Audio playback for game formats. Used for previewing `.wem` files.
- **wwiser** — Read-only `.bnk` explorer. Cannot modify banks but documents the format well.
- **HD2 Arsenal Mod Manager** — Handles deployment of patch files to the game directory.

---

## Architecture

### System Diagram

```
┌─────────────────────────────────────────────────┐
│                Chrome Browser                    │
│                                                  │
│  ┌────────────────────┐  ┌────────────────────┐  │
│  │   Sound Manager    │  │    Mission DJ      │  │
│  │                    │  │                    │  │
│  │  Browse game audio │  │  [Soundtrack ▼]    │  │
│  │  Drag-drop replace │  │  [Deploy! 🎸]     │  │
│  │  Preview playback  │  │                    │  │
│  │  Build mod         │  │  Soundtrack editor │  │
│  │                    │  │  Slot mapping      │  │
│  │  Categories:       │  │  Library manager   │  │
│  │  • Weapons         │  │                    │  │
│  │  • Voices          │  │  Pre-converted     │  │
│  │  • Stratagems      │  │  cache for speed   │  │
│  │  • Ambient         │  │                    │  │
│  └────────────────────┘  └────────────────────┘  │
└──────────────────┬──────────────────────────────┘
                   │ HTTP (localhost:8000)
┌──────────────────▼──────────────────────────────┐
│              FastAPI Backend                      │
│                                                  │
│  /api/game                                       │
│    GET  /detect         → Find HD2 install       │
│    GET  /banks          → List sound banks       │
│    GET  /bank/{id}      → Parse bank contents    │
│    GET  /wem/{id}/play  → Stream WEM as WAV      │
│                                                  │
│  /api/soundtracks                                │
│    GET  /               → List soundtracks       │
│    POST /               → Create soundtrack      │
│    GET  /{id}           → Get soundtrack detail   │
│    PUT  /{id}           → Update soundtrack       │
│    DELETE /{id}         → Delete soundtrack       │
│                                                  │
│  /api/mods                                       │
│    POST /sfx            → Build SFX mod          │
│    POST /deploy/{id}    → Deploy soundtrack       │
│    GET  /status         → Deployment status       │
│                                                  │
│  /api/audio                                      │
│    POST /convert        → MP3/WAV → WEM          │
│    POST /upload         → Upload to library      │
│    GET  /library        → Cached converted files │
│                                                  │
│  Services:                                       │
│    GameDetector    → Finds HD2 install path       │
│    BankParser      → Reads .bnk structure        │
│    AudioConverter  → FFmpeg + Wwise encoding     │
│    ModPacker       → Builds patch files          │
│    SoundtrackDB    → SQLite soundtrack library   │
└──────────────────────────────────────────────────┘
```

### Data Model

```sql
-- Audio files uploaded by user
CREATE TABLE audio_files (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    original_path TEXT NOT NULL,
    wem_cache_path TEXT,          -- Pre-converted .wem path
    duration_seconds REAL,
    format TEXT,                  -- mp3, wav, ogg, flac
    converted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Named soundtrack collections
CREATE TABLE soundtracks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,            -- "Guns N' Roses OST"
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_deployed_at TIMESTAMP
);

-- Soundtrack → game slot mappings
CREATE TABLE soundtrack_slots (
    id TEXT PRIMARY KEY,
    soundtrack_id TEXT NOT NULL REFERENCES soundtracks(id) ON DELETE CASCADE,
    game_slot_id TEXT NOT NULL,    -- WEM ID or event name in the game
    game_slot_label TEXT,          -- Human-readable: "Combat Theme 1"
    audio_file_id TEXT NOT NULL REFERENCES audio_files(id),
    UNIQUE(soundtrack_id, game_slot_id)
);

-- Persistent SFX/voice replacements (separate from soundtracks)
CREATE TABLE sfx_mods (
    id TEXT PRIMARY KEY,
    game_slot_id TEXT NOT NULL UNIQUE,
    game_slot_label TEXT,
    audio_file_id TEXT NOT NULL REFERENCES audio_files(id),
    category TEXT,                -- "weapons", "voices", "stratagems", "ambient", "ui"
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Game audio slot catalog (populated on first scan)
CREATE TABLE game_slots (
    wem_id TEXT PRIMARY KEY,
    bank_file TEXT NOT NULL,
    category TEXT,                -- auto or user-assigned
    label TEXT,                   -- human-readable name (from community databases)
    duration_seconds REAL,
    is_music BOOLEAN DEFAULT FALSE,
    original_hash TEXT            -- for detecting game updates
);
```

### Audio Conversion Pipeline

```
User MP3/WAV/FLAC
       │
       ▼
   FFmpeg normalize
   (WAV 48kHz, match original duration if needed)
       │
       ▼
   Wwise CLI encode (or vgmstream reverse pipeline)
   → .wem (Vorbis codec, matching game version)
       │
       ▼
   Cache in /library/converted/{hash}.wem
       │
       ▼
   On deploy: inject into .bnk, update DIDX offsets
```

**Key optimization for Mission DJ:** Convert audio files to `.wem` when they are first added to the library, not at deploy time. This makes deployment a file-copy-and-repack operation, targeting under 10 seconds.

### Game Slot Discovery

The first time the tool runs, it scans the HD2 install and builds a catalog of all audio slots. This involves:

1. Locating the Wwise sound bank files in the Stingray archives
2. Parsing each `.bnk` to extract the DIDX (data index) and HIRC (hierarchy) sections
3. Matching WEM IDs to human-readable labels using community-maintained databases (the hd2-audio-modder project maintains a label database)
4. Categorizing slots by type (music vs. SFX vs. voice) based on HIRC event structure
5. Caching the results in SQLite for fast subsequent loads

Music slots are the priority for categorization since they power the Mission DJ feature. The HD2 modding wiki already documents the key music WEM IDs:

- `1524611437487953956` — Ship hub ambient
- `17763359945178393624` — Galactic map focused
- `7820702089764710742` — Galactic map unfocused
- Combat themes, extraction themes, etc.

---

## Frontend Design

### Two-Mode Interface

**Navigation:** Tabs or toggle between "Sound Mods" and "Mission DJ"

#### Sound Mods Tab

Category-based browser (accordion or sidebar nav):
- Weapons (grouped by weapon type)
- Character Voices
- Stratagems
- Music (redirects to Mission DJ for music slots)
- Ambient
- UI Sounds

Each slot shows:
- Game audio name/label
- Play button (original)
- Drop zone or file picker for replacement
- Play button (replacement preview)
- Enable/disable toggle
- "Build & Deploy" button for the whole SFX mod

#### Mission DJ Tab

This is the centerpiece. The layout should feel like a music player, not a modding tool.

**Top section:** Soundtrack selector
- Large dropdown or card-based picker showing saved soundtracks
- "Deploy" button (prominent, satisfying)
- Status indicator (current deployed soundtrack, time since last deploy)

**Middle section:** Soundtrack editor
- When a soundtrack is selected, show all music slots as a grid/list
- Each slot: label ("Drop Music," "Extraction Theme," "Combat 1," etc.)
- Current assignment with play preview
- Drop zone for new audio
- Clear button

**Bottom section:** Quick actions
- "New Soundtrack" — starts empty
- "Duplicate" — copy existing as starting point
- "Random" — deploys a random soundtrack from library

### Tech Stack

- React (Vite)
- CSS variables, dark theme (Helldiver-inspired: blacks, yellows, industrial)
- Drag and drop via HTML5 API (or react-dropzone for reliability)
- Audio playback via Web Audio API

---

## Deployment & Packaging

### Development Mode
```bash
# Terminal 1: Backend
cd helldrop/backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Terminal 2: Frontend
cd helldrop/frontend
npm install
npm run dev  # Vite dev server on port 5173, proxies API to 8000
```

### "Production" Mode (Max's PC)
Bundle frontend into static files, serve from FastAPI:
```bash
cd helldrop
python run.py  # Starts server, opens Chrome to localhost:8000
```

Could eventually package with PyInstaller for a single executable, but that is Phase 4+ territory.

---

## Open Questions

1. **License of hd2-audio-modder:** Need to verify before reusing their parsing code. If restrictive, we write our own parser using the documented `.bnk` format spec.

2. **Wwise encoding:** The trickiest part. Converting MP3 → WEM requires either:
   - The Wwise CLI authoring tools (free for non-commercial use, but heavyweight install)
   - The existing modder's approach (which may use vgmstream or a custom pipeline)
   - Need to research what the hd2-audio-modder actually uses for encoding

3. **Music slot timing:** The HD2 modding wiki notes that replacement music must match the exact duration of the original WEM to avoid abrupt restarts. We may need to pad/trim audio to fit, or investigate if this constraint has been relaxed in recent game updates.

4. **Stingray archive layer:** HD2 wraps Wwise banks inside Stingray engine archives. The existing modder handles this. We need to understand whether we modify the archives directly or work with the mod manager's patch system.

5. **Game update resilience:** When HD2 updates, sound bank layouts may change (WEM IDs shift, banks restructured). The tool should detect this and prompt a rescan rather than silently breaking.

---

## Phase Plan

### Phase 1: Skeleton (Reading the Game)
- Game install detection (Steam library paths)
- `.bnk` parser that extracts DIDX and basic HIRC info
- API endpoint returning categorized audio manifest
- Frontend: browsable tree of game audio with preview playback
- SQLite database for slot catalog

### Phase 2: Single Swap (Proof of Life)
- Audio upload and conversion pipeline
- Single WEM replacement in a sound bank
- Verify replacement works in-game
- Basic drag-and-drop UI for one slot

### Phase 3: Mission DJ (The Feature)
- Soundtrack data model and CRUD API
- Soundtrack editor UI with slot mapping
- Pre-conversion cache for fast deployment
- Quick-swap deploy with status feedback
- Soundtrack library persistence

### Phase 4: Polish (The Max Phase)
- Refined categorization and search
- Preset soundtrack sharing (export/import)
- "Random" mode
- Visual theme polish
- Duration matching/padding logic
- Error handling and edge cases

---

## Notes for Agents

This project lives outside the Fictioneer ecosystem. It is a standalone fun project. No crew agents are assigned. Samantha and Max will build it together with Julian providing architecture guidance as needed.

If agents are eventually pulled in:
- **Heavy** would own the frontend (React, drag-and-drop, dark theme)
- **Siddig** would own the backend (FastAPI, binary parsing, SQLite)
- **Eliza** would handle the binary format edge cases (she would love hunting bugs in byte-level parsing)

But for now, this is a father-son build. Keep it fun.

---

*"Deploying democracy with better music."*
