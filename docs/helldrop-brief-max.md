# HELLDROP — Mission DJ for Helldivers 2

## What We're Building

A tool that lets you change the music in Helldivers 2 before every mission. Fast. Like switching playlists on Spotify, except the playlist is your entire in-game soundtrack.

Right now, modding the audio in Helldivers 2 is a nightmare. The game stores all its sounds in a proprietary binary format called Wwise (used by tons of games — it's an industry standard audio engine). The sound files aren't MP3s or WAVs sitting in a folder. They're packed into compressed binary containers (`.bnk` files) with metadata that tells the game engine when and how to play each sound. Think of it like a ZIP file, but way more complicated and specifically designed for real-time game audio.

There's an existing tool that can crack open these files and let you swap sounds, but it's designed for modders who already understand the format. It exposes all the complexity. Our tool hides it.

**The goal:** You build a library of soundtracks ("Guns N' Roses OST," "Metallica OST," "DOOM Eternal," whatever). Before a mission, you pick one from a dropdown, hit Deploy, and alt-tab back into the game. That mission now has your soundtrack. Next mission, pick a different one. Ten seconds between matches.

---

## How It Works (The Architecture)

The tool has two parts that talk to each other:

### The Backend (Python)

This is the engine. It runs on your computer and does the heavy lifting:

1. **Reads the game files** — Finds your Helldivers 2 install, opens the Wwise sound banks, and figures out which binary blob is which sound
2. **Converts your music** — Takes your MP3s and converts them into the `.wem` format that Wwise expects (using FFmpeg, the same tool that powers most video/audio conversion on the internet)
3. **Repacks the game files** — Puts your converted audio back into the sound bank format the game can read
4. **Manages your library** — Keeps track of your soundtracks and which songs map to which game slots

This is built with **FastAPI**, which is a Python web framework. It creates a local server on your machine (localhost) that the frontend talks to through HTTP requests — the same protocol your browser uses to load websites, just pointed at your own computer instead of the internet.

### The Frontend (React)

This is the interface. It runs in your browser (Chrome) and talks to the backend:

1. **Shows you what's in the game** — Displays all the audio slots in categories (combat music, extraction theme, ship hub, etc.)
2. **Lets you build soundtracks** — Drag and drop MP3s into slots, name your soundtrack, save it
3. **The Mission DJ** — A quick-swap interface. Pick a soundtrack, deploy it, done
4. **Preview** — Play any sound (original or your replacement) before deploying

The frontend is built with **React**, which is a JavaScript framework for building user interfaces. It's what most modern web apps are built with. The browser is just the display layer — all the real work (parsing binary files, converting audio) happens in the Python backend.

---

## Why This Is Engineering, Not "AI Art"

You know those AI-generated Studio Ghibli images? That's taking someone else's artistic style and using it without permission. That's extraction. Taking from creators.

This project is different. We are:

- **Writing original software** that solves a real problem
- **Parsing binary file formats** — understanding how data is structured at the byte level
- **Building a user interface** that makes a complex process simple
- **Converting between audio formats** using well-understood encoding standards

The AI helps us write the code faster. It's like using a power drill instead of a screwdriver — the house still needs an architect, a blueprint, and someone who knows where the walls go. The tool just makes the manual labor faster.

Nobody's art is being stolen. Nobody's style is being copied. We're building a tool from scratch that lets people customize their own game on their own computer.

---

## The Tech Stack (What Each Piece Does)

| Technology | What It Is | What It Does Here |
|-----------|-----------|------------------|
| **Python** | Programming language | Runs the backend server, parses binary files |
| **FastAPI** | Python web framework | Creates the API that the browser talks to |
| **React** | JavaScript UI framework | Builds the browser interface |
| **Vite** | Build tool for JavaScript | Bundles the React code for the browser |
| **FFmpeg** | Audio/video converter | Converts MP3 → WAV → WEM (Wwise format) |
| **SQLite** | Lightweight database | Stores your soundtrack library locally |
| **Wwise SDK** | Game audio toolkit | Needed for encoding audio into the right format |

---

## How Modding Actually Works (The Binary Part)

This is the cool part. Here's what's happening under the hood when you "swap a sound":

1. The game stores audio in `.bnk` files (SoundBanks). These are binary — not human-readable text, just raw bytes
2. Inside each `.bnk` are sections:
   - **BKHD** — Bank header (metadata about the file)
   - **DIDX** — Data index (a table of contents listing every sound clip and its byte offset)
   - **DATA** — The actual audio data, packed end-to-end
   - **HIRC** — Hierarchy (the logic that tells the game "when event X happens, play sound Y with volume Z")
3. Each sound is stored as a `.wem` — Wwise Encoded Media. It's essentially Vorbis or Opus audio in a custom container
4. To replace a sound, you need to:
   - Convert your MP3 to `.wem` format
   - Find the right entry in the DIDX
   - Replace the bytes in the DATA section
   - Update the byte offsets in the DIDX (because your file might be a different size)
   - Write the modified `.bnk` back to disk

This is similar to what you do with Minecraft mods when you replace texture files — except Minecraft mostly uses readable formats (JSON, PNG), and this is raw binary data where one wrong byte can crash the game.

---

## Your Role

You're QA, soundtrack curator, and co-designer.

- **QA:** Break it. Try weird files. Find the edges. What happens with a 10-minute song? A 3-second clip? A corrupted MP3?
- **Curator:** Build the soundtrack library. What songs work for combat? Extraction? The ship? That's a creative decision, not a technical one
- **Design:** If something in the interface sucks, say so. "This is confusing" is the most valuable feedback in software development

---

## Timeline

No rush. We build it right. The phases are:

1. **Skeleton** — Backend reads game files, frontend shows what's there
2. **Swap** — Drag and drop a single sound replacement, verify it works in-game
3. **Mission DJ** — Full soundtrack library with quick-swap
4. **Polish** — Whatever we decide makes it better

Each phase ends with a working thing you can actually use. We don't build for weeks and hope it works at the end.

---

*Project codename: HELLDROP*
*"Deploying democracy with better music."*
