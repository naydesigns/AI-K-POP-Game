# GlowRush — Product Requirements Document

**Version:** 2.0  
**Owner:** Nayeon  
**Last updated:** 2026-06-19  
**Status:** Mechanic pivot — rhythm tile game. Figma screens in progress. Next: update game board screen, build HTML prototype.

---

## Overview

GlowRush is a K-pop themed rhythm tile game, inspired by the mechanic of Magic Tiles 3 (Amanotes). Players tap falling lightstick tiles in sync with a beat across 4 color-coded lanes — each lane representing an idol group. Clearing a song unlocks a photocard from that group's collection.

The K-pop theme is intrinsic to the mechanic: lanes are idol group colors, tiles are lightstick shapes, and the concert atmosphere (crowd, lights, idol portrait in the background) makes it feel like playing along at a live show.

The project is being built and documented simultaneously as a portfolio case study. The design process, decisions, and artifacts are logged in `glowrush-devlog.md`.

---

## Core Mechanic

Inspired by Magic Tiles 3. A rhythm tap game on a vertical 4-lane board.

### Lanes
- 4 vertical lanes, each mapped to one idol group color (NOVA / STELLA / ECHO / LYRA)
- Lanes are visually styled as lightstick columns — colored glow, group icon at top

### Tiles
Tiles scroll downward continuously. Three tile types:

| Type | Description | Input |
|------|-------------|-------|
| **Tap** | Single lightstick tile | Tap once as it crosses the hit zone |
| **Hold** | Long tile (press-and-release) | Press and hold until it ends |
| **Slide** | Arrow tile spanning 2 lanes | Swipe across lanes |

### Hit zone
A fixed horizontal bar near the bottom of the screen. Tiles must be tapped as they overlap this zone.

### Scoring
| Timing | Label | Score |
|--------|-------|-------|
| ≤ 40ms | PERFECT | 100 pts + combo multiplier |
| ≤ 120ms | GOOD | 60 pts |
| > 120ms or missed | MISS | 0 pts, combo reset |

### Combo & multiplier
Consecutive non-miss hits build a combo counter. Every 10-hit combo increases the score multiplier by ×1 (cap: ×8).

### Health bar
Player starts with full health. Each MISS drains health. Three consecutive MISSes = level fail.

### Win condition
Complete the song (all tiles cleared) without health reaching zero. Score and accuracy shown on results screen.

### Note charts
Each song has a hardcoded JSON chart: an array of `{ time_ms, lane, type, duration_ms }` objects. Charts are authored manually for v1, procedural generation is out of scope.

### Speed
Scroll speed starts at a fixed BPM-matched rate and can be adjusted by the player (0.5× – 2×) in settings.

---

## Idol Groups & Colors

All group names are original, IP-free, and AI-generated. Lightstick colors double as the in-game lane color for that group.

| Group  | Color         | Hex     | Unlocks at |
|--------|---------------|---------|------------|
| NOVA   | Hot pink      | #FF4D7A | Wave 1 (starter) |
| STELLA | Teal          | #00D4A6 | Wave 1 (starter) |
| ECHO   | Purple        | #9B59F5 | Wave 1 (starter) |
| LYRA   | Electric blue | #C1C8FE | Wave 1 (starter) |

Easy levels use 3 groups (NOVA / STELLA / ECHO). As the wave baseline rises, new groups are introduced, increasing lane complexity.

---

## Level Architecture

Each level = one song. Songs are organized into Waves.

### Song difficulty
| Tier | BPM range | Active lanes | Tile density | Hold/Slide tiles |
|------|-----------|--------------|--------------|-----------------|
| Easy | 80–110 | 2–3 | Low | None |
| Moderate | 110–140 | 3–4 | Medium | Holds only |
| Hard | 140–180 | 4 | High | Holds + Slides |

### Wave Difficulty Pattern
Same wave structure as original design: **3 Easy → 2 Moderate → 1 Hard**, repeating. The baseline rises each cycle — Easy songs at Wave 20 are denser than Easy at Wave 1.

### Unlocks
Clearing a song unlocks a random photocard from the featured idol group. Hard clears have a chance at a Legendary card.

---

## Monetization

Three $0.99 purchase moments, each timed to a specific emotional state:

| Trigger            | When                                           | Offer                        |
|--------------------|------------------------------------------------|------------------------------|
| **Revive**         | Player fails mid-song (health hits zero)       | Revive with full health, resume from same point |
| **Streak Saver**   | Player with win streak fails and taps "Quit"   | Restart without losing streak |
| **Guaranteed Legendary** | After clearing a Hard song              | Guaranteed legendary photocard from that group |

Price point is $0.99 across all three — impulse-buy friction is near zero, and capturing the first purchase is the primary goal.

---

## Screens

All screens use the retro anime Y2K aesthetic: teal-to-purple gradient background, subtle grid overlay, black offset shadows, pixel-style uppercase typography, sparkle (✦) decorations. The design of light sticks and k-pop idols on photo cards should be IP free and AI generated images that matches the aesthetic.

### 1. Home Screen (`1:2`)
- Title: GlowRush
- 3 idol group portrait cards (NOVA / STELLA / ECHO) with black offset shadow and nameplate
- Yellow arcade-style PLAY NOW button
- Footer: collection link

### 2. Game Board (`1:5`) ⬅ needs redesign
- 4 vertical lanes, full-height, each in idol group color with subtle glow
- Tiles fall from top toward hit zone at bottom
- Hit zone: horizontal glowing bar with lane tap indicators
- Top bar: song title, idol group name, health bar, score, combo counter
- Idol portrait in background (blurred, low opacity) for atmosphere
- Feedback: PERFECT / GOOD / MISS floating text on hit

### 3. Wave Complete (`1:8`)
- Keep existing layout — update stat labels:
  - "PERFECT HITS", "ACCURACY %", "MAX COMBO", "TOKENS EARNED"

### 4. Fail State (`1:11`) ⬅ replaces Stuck State
- "FAILED!" headline (red)
- 2 options: REVIVE $0.99 (yellow, POPULAR) / QUIT (dark)
- Streak Saver upsell bar if player has active streak

**Figma file:** https://www.figma.com/design/WW9olFDqMRfH3O7C759z9u

---

## Repository

| | |
|---|---|
| **Local path** | `/Users/nayeon/AI K-POP Game/` |
| **GitHub** | https://github.com/naydesigns/AI-K-POP-Game |

---

## Build Order

1. ✅ Game design decisions (unlimited levels, wave pattern, monetization)
2. ✅ FigJam flowchart (full game loop, color-coded)
3. ✅ Figma UI screens — Home, Wave Complete, Fail State (retro anime Y2K)
4. ✅ GitHub repo created — `naydesigns/AI-K-POP-Game`
5. ⬜ Redesign Game Board screen in Figma (4-lane rhythm layout)
6. ⬜ Author note chart — 1 song, JSON format, 4 lanes, ~60 seconds
7. ⬜ HTML/JS prototype — timing engine, falling tiles, hit detection, scoring
8. ⬜ Push prototype to GitHub
9. ⬜ Playtest & tune feel (hit window, scroll speed, health drain rate)
10. ⬜ AI-only touch (e.g. generative idol card art, dynamic BPM sync)

---

## Out of Scope (v1)

- Multiplayer or async challenges
- Real K-pop licensed IP (all groups are original: NOVA, STELLA, ECHO, LYRA, PRISM, AURA, VELOX)
- App store submission
- Backend / accounts / cloud save
- IAP infrastructure (monetization is designed but not wired up in prototype)

---

## Open Questions

- What royalty-free music or original audio will be used for the prototype song? (No licensed K-pop audio in v1)
- What is the target BPM / feel for the first song — upbeat idol pop ~130 BPM, or slower fan chant style?
- Should the note chart be authored visually (a chart editor) or hand-written in JSON first?
- When does the Song Select / Collection meta-screen get designed?
- Speed setting: expose to player from day one or lock at 1× for prototype?
