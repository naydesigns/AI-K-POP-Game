# GlowRush — Dev Log

A running log of design and development sessions, written for a portfolio case study audience.

---

## 2026-06-20 — Dev Session

Today was a build day in the truest sense — GlowRush went from a concept to a playable rhythm game prototype in a single morning session. The work broke into two clean phases: first, constructing the game engine and home screen from scratch; second, making the whole thing work properly on a phone. Both happened within about twelve minutes of each other, which says something about the rhythm of how this project is moving.

The core prototype that landed in the first commit is more substantial than most "first builds" get. A 4-lane falling-tile canvas engine with hit detection, a live combo multiplier, a health bar, and a scoring system — all in roughly 560 lines of JavaScript. What made this possible so quickly was having the Figma designs as a clear target. The home screen — the GLOWRUSH wordmark, the teal-to-purple gradient, the retro TV idol illustration, the yellow arcade button — was styled directly against the mockup rather than improvised. That Figma-to-code fidelity is a meaningful signal for the portfolio case study: it demonstrates that design decisions made upstream (color system, visual metaphor, button hierarchy) translate directly into production behavior without a handoff gap.

The chart data architecture is also worth noting. The song timing data lives in a separate JSON file (`neon-lights.json`) rather than being hardcoded into the game logic. That's a small decision with significant downstream implications — it means adding new songs, adjusting difficulty, and eventually supporting community-created charts all become much more tractable. It reflects a design principle that's easy to miss in early prototypes: separating content from behavior is what makes a game engine, not just a demo.

The second commit came twelve minutes later and tackled mobile from first principles. Rather than bolt on responsiveness as an afterthought, the approach was to rethink every system that assumes a fixed viewport: font sizes rewritten using `clamp()` and viewport-relative units, lane detection rebuilt around bounding rect ratios instead of hardcoded pixel coordinates, iOS safe area insets accounted for, scroll and bounce behaviors suppressed. The touch interaction model was also reconsidered — keyboard hints are hidden on touch devices and replaced with a tap instruction. This matters for the K-pop audience: the overwhelming majority of players will encounter GlowRush on a phone, and a rhythm game that doesn't feel native to touch isn't a rhythm game at all.

Taken together, today's session moved GlowRush from documented strategy to something you can actually play — and play on the device your target users actually own. The next logical step is play-testing: does the tile fall speed feel right? Is the hit window forgiving enough for casual players but tight enough to feel skilled? Those are questions that only emerge through contact with a real build, and that build now exists.

---

## 2026-06-20 — Evening Dev Session

The evening session was shorter but sharper — a focused design decision that deleted more than it added. The member selection screen, which had existed as a way to let players choose between idols before jumping into a level, was cut entirely. In its place: a level intro screen that fades in, holds for 2.5 seconds, and drops directly into gameplay. The net change was 197 deletions against 71 additions. That ratio tells its own story.

Removing the member selection flow wasn't a concession to simplicity — it was a clarification of what GlowRush actually is at this stage. Member selection implies consequence: that the choice of idol changes something meaningful about the game experience. Without that differentiation designed and built, the screen was friction with no payoff. Keeping it would have been design theater, presenting the vocabulary of depth without the substance. The cut was a principled one.

What replaced it is more considered than it might appear. The level intro screen is matched directly to the Figma Level 1 design — idol portrait cropped and overlapping in that specific way, "Level 1" in yellow, the song name visible below. It's cinematic in a way that the member selection screen never could be, because it knows what you're about to play. The auto-transition after 2.5 seconds is also deliberate: it removes the need for a tap-to-continue, creating a moment of anticipation rather than a gate. For a rhythm game, the pre-roll is part of the experience.

The home button label change — from "SELECT MEMBER" to "PLAY" — is the kind of copy decision that looks minor but matters enormously to first impressions. "Select Member" tells you about the system. "Play" tells you what happens next. For a casual K-pop audience encountering the game cold, that single word reduces perceived friction and sets an expectation the game can actually deliver on. It's also more honest: right now, there's one idol and one song. The copy should match the reality.

Taken together, today's full arc — from 559 lines of blank canvas to a playable, mobile-native game with a proper level intro — is a strong foundation for the portfolio story. The morning built the engine; the evening tightened the experience. Both moves reflect the same underlying discipline: only ship what you can stand behind.

---

## 2026-06-20 — Late Night: Music, Figma, and Firebase

Three significant pieces landed in the late session, each touching a different layer of the project.

**MP3 music playback.** The game now plays an actual song — "Neon Frequency" by VEIL, a 3:25 track at 128 BPM. The audio system loads the MP3 during chart initialization, starts playback after the 3-second countdown, and pauses/resets on game end. The implementation uses a simple `Audio` element synced to the game's `performance.now()` clock rather than the Web Audio API — a deliberate choice to keep complexity low while the chart timing is still being tuned. A new chart JSON was generated with ~300 notes distributed across intro, verse, chorus, bridge, and outro sections with varying density to match the energy arc of a K-pop track. The chart data architecture from the earlier session paid off immediately: adding a new song meant creating a new JSON file and pointing to it, not touching any game logic.

**Desktop Figma screens.** Four 1440×900 desktop screens were created in the existing Figma file: Home, Gameplay, Results, and Fail. These aren't placeholder wireframes — they're pixel-matched to the live CSS, reusing image assets from the mobile frames. The gameplay screen includes the 4-lane layout with falling tiles, the HUD with score/combo/health, and the hit zone with key hints. Having desktop Figma screens alongside the mobile ones completes the design system story for the portfolio: it shows the design scales intentionally, not accidentally.

**Firebase Firestore connected.** A Firebase project was set up and the Firestore SDK is now loaded in the game. The `Leaderboard` utility — with methods for submitting scores, fetching the top 20, and rendering a ranked list — is built and ready in `game.js`. The leaderboard UI itself was intentionally held back from this push. The backend is wired; the frontend will ship when the interaction design is right. This is a pattern worth highlighting in the case study: infrastructure before interface.

---

## 2026-06-21 — Polish Pass: Fail Screen, Home Layout, and Key Readability

Today was a refinement session — no new systems, just tightening what exists until it feels considered.

**Fail screen redesign.** The screen went through three changes that collectively shift its emotional register. The title changed to "TRY AGAIN!" in the GLOWRUSH teal (#7cf9e2), replacing the red "FAILED!" — a deliberate move away from punishment language toward encouragement. The revive/$0.99 button was removed entirely; in its place, a "PLAY AGAIN" button with the same yellow arcade styling as the home screen. The VEIL group illustration was added as a full-bleed background at 20% opacity. The result is a screen that feels like the group is cheering you on rather than a game-over wall.

**Home screen Figma-matched.** The home layout was rebuilt to match the desktop Figma frame proportions exactly: 77px title, TV image at 37vw (530px max), keyboard key caps in a horizontal row. The previous iteration had the title overflowing the viewport and the TV too large — classic symptoms of scaling components individually rather than as a system. Using `get_design_context` from the Figma MCP to pull exact positions and sizes made the fix precise rather than iterative.

**Gameplay key visibility.** The D/F/J/K key hints in the gameplay canvas were upgraded from near-invisible 10px text at 30% opacity to keyboard-style badges — dark backgrounds, colored lane borders, white bold text. Small change, but it eliminates the most common first-time-player confusion: "what keys do I press?"

---

## 2026-06-27 — Dev Session

Today was a deep systems day — the kind that doesn't look dramatic in the commit log but represents a major shift in what GlowRush actually is. The session started just after midnight and stretched into the evening, with four commits that collectively tell a story of design ambition, infrastructure debugging, and the kind of patient problem-solving that doesn't always get captured in retrospectives.

The design decision at the heart of today was a consolidation: two separate screens — the results screen and the fail screen — were merged into a single post-game screen. This is the same discipline that appeared in the June 20th evening session when the member selection screen was cut. Both moves are rooted in the same principle: a screen that can't justify its own existence is friction, not feature. The unified post-game screen knows whether you passed or failed and adapts accordingly, rather than routing players to separate destinations with separate visual treatments. Fewer screens also means fewer edge cases, fewer layout bugs, and a simpler navigation model — a less glamorous argument, but one that compounds over time.

The bigger story today was the leaderboard. The Firebase infrastructure that was connected in the late June 20th session finally became the visible surface it was always meant to be: a live ranked list of scores, a CRT-style name entry field with an 8-character limit, and an inline save button that submits directly to Firestore. The design of the name entry is worth unpacking. The 8-character constraint isn't arbitrary — it's an intentional reference to arcade score entry, where initials and short handles were a hard limit. For a K-pop rhythm game with retro visual DNA, that choice lands correctly. The profanity filter is quieter but equally deliberate; the leaderboard is a shared space, and the community context of K-pop fanbases makes content moderation table stakes from day one rather than an afterthought.

What the commit history also shows, honestly, is the cost of real integration. Three of today's four commits were variations on fixing the Firebase connection — wrong project ID, wrong database name, SDK version mismatches, the default versus named database question. Each debugging pass required a commit; each commit is a small data point in understanding how infrastructure problems actually look in practice. The final solution — correcting the API key and project ID, using the modular SDK against the named `glowrush-db` database, and implementing an optimistic save pattern that gives users instant UI feedback while syncing in the background — was only reachable by working through the wrong answers first. The optimistic save is the design insight worth highlighting here: it removes the anxiety of waiting for a network response, which matters especially on mobile where connections are variable. The user sees their score saved; the actual Firestore write is a background concern.

The session also produced about 400 lines of deleted CSS — dead styles left over from the removed results and fail screens. There's a useful design principle embedded in that deletion: the cost of keeping old code isn't zero, and cleaning it up when the context is fresh (right after the related feature is removed) is significantly easier than treating it as tech debt to address later. GlowRush is still small enough that cleanliness is achievable without discipline; building the habit now matters for what comes next.

---

## 2026-06-28 — Dev Session

This session ran in two distinct bursts — an evening push on June 27th that finished around 9:30pm, and an early-morning continuation starting around 4:40am that wrapped up just before 5. Together they produced five commits, all focused on two concerns: getting Firebase to behave reliably, and stripping the post-game screen down to something that actually feels like it belongs in the game.

The Firebase thread from yesterday's session wasn't fully resolved when the June 27th entry was written. The optimistic save pattern was in place, but the SDK configuration had accumulated contradictions across iterations — the project ID, API key, and named-database reference had drifted out of sync between `index.html` and `game.js` in ways that only surfaced at runtime. The evening session corrected the config and added something new: localStorage caching of the leaderboard. The cache means that on return visits, the leaderboard renders immediately from the previous fetch rather than showing a loading state. The Firebase read still happens in the background to pull fresh scores, but the player never waits. This is a meaningful UX improvement in a rhythm game context, where the post-game screen is a high-stakes moment — you just finished a run and want to see where you landed. Every second of loading state between "score saved" and "here's the board" is friction that costs engagement.

The more interesting design work happened in the early-morning session: a significant restructuring of the post-game screen layout. The previous version displayed score, accuracy, and max combo as three separate stat cards — each with a large value and a label, arranged horizontally in a row. That treatment works at desktop scale but competes aggressively for vertical space on mobile, where the post-game screen also needs to fit a leaderboard, a name entry field, and action buttons. The redesign collapsed all three stats into a single inline text line — `SCORE 48,200 · ACCURACY 91% · COMBO 34` — tucked beneath the "WAVE COMPLETE" title and the song name. The information loss is zero; the vertical real estate recovered is substantial. It's the kind of decision that reads as obvious in retrospect but requires deliberate intention to actually make: the instinct is to give each metric its own visual weight, when the more considered choice is to treat the entire stat group as a single subordinate detail.

The song name addition — `NEON FREQUENCY — VEIL` appearing just below the result title — closes a context gap that's been present since the post-game screen launched. Previously the screen told you your score but not which song you just played, which matters more than it sounds: if a player is chasing a personal best, they need to verify they're looking at the right run. The fix required untangling a scope bug introduced by the redesign — the song name was being read directly from `game.chart`, a variable that wasn't accessible from the post-game context. The solution was to pass chart metadata through the `scoreData` object when the game ends, rather than reaching up the scope chain. That's a clean architectural move that also makes the post-game module less coupled to the game state overall.

The name entry wrapper also got simplified: the dark console box with its border-glow styling was replaced by a flat section, and the character counter moved from a header row to below the input field, left-aligned. The visual language of the old console box implied something more interactive and complex than what it actually is — type your name, press save. Removing the box reduces that false promise. The leaderboard ranking was also pared down: previously the top three spots got medal emojis (crown, star, diamond); now only #1 gets the crown, and everyone else gets a number. Less decoration, same hierarchy. It's a small editorial choice that makes the leaderboard feel less like a participation trophy and more like a scoreboard.

---
