# Handoff: GLOWRUSH — Name Entry Screen

## Overview
A pre-game screen for the Y2K-themed K-pop rhythm game **GLOWRUSH**. It captures a
player's name for the leaderboard before a run begins. The player can type a name and
press **START**, or **SKIP** to play as `GUEST`. On submit the name is persisted so the
game/leaderboard can read it back.

## About the Design Files
The file in this bundle (`Leaderboard-name entry.dc.html`) is a **design reference created
in HTML** — a working prototype that shows the intended look and behavior. It is **not
production code to copy directly**. The task is to **recreate this design in your existing
codebase** (React, Vue, SwiftUI, native, etc.) using its established components, routing,
and state patterns. If no environment exists yet, pick the framework that best fits the game
and implement the screen there.

> Note on the file format: the prototype is authored as a "Design Component" (a custom
> `<x-dc>` + `DCLogic` runtime). Ignore that wrapper — it's just the prototyping harness.
> The relevant material is the markup, the inline styles, and the logic in `renderVals()`/
> the handler methods, all documented below.

## Fidelity
**High-fidelity (hifi).** Colors, typography, spacing, and interaction states are final.
Recreate the UI pixel-accurately using your codebase's libraries, then wire the behavior
described under *Interactions* and *State*.

## Screen: Name Entry

### Purpose
Player enters a leaderboard name (or skips) before the rhythm run starts.

### Layout
- **Full-viewport stage**: `position:relative; min-height:100vh;` centered with
  `display:flex; align-items:center; justify-content:center;` and `padding:40px 20px`.
- **Background**: diagonal gradient (see tokens) with two stacked full-bleed overlays
  (`position:absolute; inset:0; pointer-events:none`): a pixel **grid** and animated
  **scanlines**. Four decorative `✦` **twinkles** are absolutely positioned near the corners.
- **Center column** (`max-width:680px; flex column; align-items:center; gap:34px; z-index:2`),
  top to bottom:
  1. **Title block** (floats) — `<h1>` "ENTER / YOUR NAME" (line break between words).
  2. **Subtitle** — "Claim your spot on the leaderboard". Sits *outside* the floating title
     block with `margin-top:-18px` so it stays static while the title bobs.
  3. **CRT input console** (`max-width:560px`).
  4. **Actions column** (`max-width:560px; gap:18px`): START button, then SKIP link.
  5. **Footer hint** — "KEYS: D F J K".

### Components

**1. Title `<h1>`**
- Text: `ENTER<br>YOUR NAME`
- Font: `'Press Start 2P'`, `42px`, `line-height:1.18`, `letter-spacing:1px`,
  `word-spacing:-12px`, `text-align:center`.
- Color `#9af7e2` with layered shadow:
  `text-shadow: 4px 4px 0 #7a3fd6, 4px 4px 0 #7a3fd6, 0 0 18px rgba(154,247,226,0.55)`.
- Wrapped in a container that runs the **float** animation (`gr-float`, 5s, ease-in-out, infinite).

**2. Subtitle**
- Text: "Claim your spot on the leaderboard"
- Font `'VT323'`, `21px`, `letter-spacing:2px`, color `rgba(255,255,255,0.82)`.
- **Static** (not inside the floating block); `margin-top:-18px`.

**3. CRT input console** (container)
- `padding:22px; border-radius:8px`.
- `background: linear-gradient(180deg, rgba(20,12,40,0.62), rgba(12,8,30,0.74))`.
- `border:2px solid rgba(173,255,236,0.55)`.
- `box-shadow: 0 0 0 4px rgba(0,0,0,0.25), 0 0 26px rgba(120,255,230,0.35), inset 0 0 30px rgba(120,90,220,0.25)`.
- **Header row** (`flex; justify-content:space-between; margin-bottom:12px`):
  - Left label "PLAYER 1" — `'Press Start 2P'`, `10px`, `letter-spacing:2px`, `#9af7e2`.
  - Right counter "`{count}/12`" — same font/size; color `#9af7e2`, switches to `#ff5c8a`
    when `count >= 11`.
- **Input field** (the visible "terminal" row): `flex; align-items:center; gap:10px;
  padding:16px 18px; border-radius:6px; background:#0b0a1e; box-shadow:inset 0 0 18px rgba(0,0,0,0.6)`.
  - Border: `2px solid rgba(154,247,236,0.6)` normally; turns `#ff5c8a` during the shake/error state.
  - Leading `>` prompt — `'VT323'`, `30px`, `#ff5c8a`.
  - **Display text** — the typed name shown in `'Press Start 2P'`, `18px`, `letter-spacing:2px`,
    `#f3f0ff`, `text-shadow:0 0 8px rgba(243,240,255,0.45)`, `white-space:nowrap; overflow:hidden`.
  - **Caret** — `13px × 24px` block, `background:#9af7e2`, `box-shadow:0 0 10px rgba(154,247,226,0.8)`,
    blinking via `gr-caret` (1s steps(1) infinite). Hidden when `count >= 12`.
  - A real `<input>` is overlaid at `opacity:0; inset:0` to capture keystrokes; clicking the
    row focuses it. (In your stack, use a normal focused text input — the zero-opacity overlay
    is just a prototype technique to render a custom caret.)
- **Hint line** below the field — `'VT323'`, `18px`, `letter-spacing:1px`,
  `rgba(255,255,255,0.55)`, centered. Text is state-dependent (see *State*).

**4. START button**
- Full width, `padding:20px; border:3px solid #0b0a1e; border-radius:4px`.
- Font `'Press Start 2P'`, `18px`, `letter-spacing:2px`, text color `#1a160a`, label `START ▶`.
- `box-shadow: 6px 6px 0 rgba(11,10,30,0.55)` (chunky pixel drop-shadow).
- Background depends on whether a name is entered:
  - Has name: `#ffe600`, `opacity:1`.
  - Empty: `rgba(255,230,0,0.45)`, `opacity:0.7`.
- **Hover** (only when a name is present): `transform:translate(2px,2px)`, shadow shrinks to
  `4px 4px 0`. **Active**: `transform:translate(6px,6px)`, shadow `0 0 0` (button presses
  into its shadow). Transition `transform .08s ease, box-shadow .08s ease`.
- The button is always clickable; pressing it with an empty field triggers the error shake
  rather than navigating.

**5. SKIP link**
- Text-button, no background/border. `'VT323'`, `22px`, `letter-spacing:3px`,
  `rgba(255,255,255,0.78)`, underlined (`text-underline-offset:5px;
  text-decoration-color:rgba(255,255,255,0.35)`). Label: `SKIP — play as GUEST →`.
- **Hover**: color `#fff`, underline color `rgba(255,255,255,0.9)`.

**6. Footer hint**
- "KEYS: D F J K" — `'VT323'`, `16px`, `letter-spacing:3px`, `rgba(255,255,255,0.45)`.

## Interactions & Behavior
- **Typing**: every keystroke is sanitized → uppercased, restricted to `[A-Z0-9 _-]`,
  truncated to 12 chars. The counter and display update live.
- **Submit (START or Enter key)**:
  - If the trimmed name is empty → run the **error shake** (`gr-shake`, 0.45s) on the input
    field, flip its border to `#ff5c8a` for the duration, and re-focus. Do **not** advance.
  - Otherwise → persist the name and advance into the game.
- **SKIP**: persist `"GUEST"` and advance.
- **Autofocus**: the input is focused on mount.
- **Counter color** flips to pink at `count >= 11`; caret hides at `count = 12`.

### Animations (keyframes)
- `gr-float`: translateY 0 → -8px → 0; 5s ease-in-out infinite (title block).
- `gr-scan`: scanline overlay background-position 0 → 6px; 1.2s linear infinite.
- `gr-twinkle`: opacity .25→1, scale .8→1.15; ~2.4–3.1s ease-in-out infinite, staggered delays.
- `gr-caret`: opacity 1→0 at 50% (steps blink); 1s infinite.
- `gr-shake`: horizontal shake (−7,6,−4,3 px); 0.45s ease, fired once per empty submit.

## State Management
Component state:
- `name: string` — sanitized current input.
- `shake: boolean` — true briefly during empty-submit error; drives border color + shake anim.
- `started: string | null` — set to the chosen name or `"GUEST"` on submit; the screen uses
  it only to show a transitional hint, then your app should route to the game.

Derived per render:
- `count = name.length`
- `hasName = name.trim().length > 0`
- `countColor = count >= 11 ? '#ff5c8a' : '#9af7e2'`
- **Hint text**:
  - default: `"Letters & numbers · up to 12 characters"`
  - when `hasName`: `"Press ENTER or START to lock it in"`
  - on guest start: `"Starting as GUEST…"`
  - on named start: `` `Welcome, ${name}! Loading…` ``

**Persistence / data contract**: the chosen name is written to
`localStorage["glowrush_player"]` (`"GUEST"` when skipped). The game and leaderboard should
read that key. In your codebase, replace this with your real player/session store as
appropriate, keeping the same contract (a single current-player name string).

## Design Tokens

**Colors**
- Background gradient: `linear-gradient(135deg, #16c79a 0%, #2f7fd6 38%, #6a4bd6 70%, #7a3fd6 100%)`
- Neon mint (titles/accents): `#9af7e2`
- Purple (title shadow): `#7a3fd6`
- Console base / input bg: `#0b0a1e`
- Display text: `#f3f0ff`
- Pink accent (prompt, error, counter-warn): `#ff5c8a`
- Action yellow: `#ffe600` (disabled `rgba(255,230,0,0.45)`)
- Button text / ink: `#1a160a`, outline `#0b0a1e`
- White tints: `0.45 / 0.55 / 0.78 / 0.82` alpha for secondary text

**Typography**
- Display/pixel: `'Press Start 2P'` (Google Fonts) — title 42px, buttons/labels 10–18px.
- Mono/body: `'VT323'` (Google Fonts) — subtitle/hint/skip 16–22px.

**Radius**: console `8px`, input `6px`, START `4px`.
**Shadows**: pixel button `6px 6px 0 rgba(11,10,30,0.55)`; console multi-glow (see component 3).
**Spacing**: column gaps `34px` / `18px`; console padding `22px`; field padding `16px 18px`.

## Assets
No image assets. Two Google Fonts (`Press Start 2P`, `VT323`). All visuals (grid, scanlines,
twinkles, glow) are pure CSS — reproduce with your styling system or keep as CSS.

## Files
- `Leaderboard-name entry.dc.html` — the design reference (markup + inline styles + logic).
