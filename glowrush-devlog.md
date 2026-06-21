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
