# GOBBLE & RUN! — The Great Thanksgiving Escape

[![make.fun](https://make.fun/badge/turkey-run-game-01.svg)](https://make.fun/bounty/turkey-run-game-01)
[![rank](https://make.fun/badge/turkey-run-game-01/metano0206/turkey-run-game/rank.svg)](https://make.fun/bounty/turkey-run-game-01)
[![reward](https://make.fun/badge/turkey-run-game-01/metano0206/turkey-run-game/reward.svg)](https://make.fun/bounty/turkey-run-game-01)

Bounty: https://make.fun/bounty/turkey-run-game-01

## The game

One bird. Three worlds. Zero dinner reservations.

You are the turkey, and dinner is at six. The farmer — carving fork in one
hand, knife in the other — wants you on the table. Run 1,500 metres from
Maplewood Farm, through the Old Barnyard, and across the Farmhouse Kitchen
to the gate of Freedom Forest. You have three feathers. When they're gone,
it's turkey dinner.

A side-scrolling chase runner in plain Canvas 2D — no libraries, no build
step, no network. Open `game/index.html` and play.

## How it plays

- **Move** with WASD or the arrow keys: up/down changes your lane in depth,
  right runs faster, left brakes. **SPACE** jumps fences, stumps, barrels
  and blast zones. **SHIFT / C** ducks — duck inside a haystack, a corn
  patch or under a kitchen table and the farmer loses sight of you.
- **The farmer thinks.** He chases what he can see, hops the obstacles you
  hurdle (so jumping only buys you a little ground), and when he loses you
  he searches your last known spot, then gives up and patrols — until he
  spots you again. Every stage he runs faster, throws his carving knife
  from stage two, and grabs you if he gets within arm's reach.
- **Signature hazards per stage:** patrolling tractors on the farm (too
  tall to jump — dodge them in depth), barrels that roll downhill at you in
  the barnyard, and in the kitchen, ovens that glow, blast flame on a
  timer, and carving knives that drop from the ceiling racks.
- **Score** by distance, corn (+50), pumpkins (+150) and golden corn
  (+400, with a speed burst), near-miss knife dodges (+25), stage clears
  (+150), and finishing with feathers to spare (+250 each).
- Mud slows you down. A stumble costs you ground, not a feather. A hit
  costs a feather and buys you a head start — the farmer stops to catch
  his breath, but not for long.
- Title screen, pause (P / Esc), mute (M), caught and escaped end screens
  with full run stats and one-click restart. Best score is kept.
- All sound is synthesized live with WebAudio: gobbles, squawks, knife
  whooshes, oven blasts, pickup chimes, and a plucked little melody. No
  audio files.

## Deterministic screenshots

The four shots in `screenshots/` are real renders of the game's own code,
frozen with `?shot=` scenes (see `shots.json`): `title`, `farm`,
`kitchen`, `escaped` — append `&seed=` to vary the world. A self-test that
plays a whole run with a simple bot lives behind `?test=fullrun` and
publishes its result on `window.__testResult`.

## Layout

- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to
  the output directory and writes `dossier.json` via `buildDossier`.
- `game/index.html` + `game/style.css` — the page shell.
- `game/src/config.js` — view, physics and the three-stage tuning table.
- `game/src/world.js` — the seeded world: obstacles, hiding spots, mud,
  ovens, ceiling knives, pickups, tractors and rolling barrels.
- `game/src/turkey.js` / `game/src/farmer.js` — the runner and the
  chasing farmer's chase / search / patrol brain.
- `game/src/game.js` — the rules: collisions, scoring, HUD, screens.
- `game/src/art.js` — every sprite drawn in code: turkey, farmer, farm,
  barnyard and kitchen.
- `game/src/audio.js` — the WebAudio synth: effects and music.
- `game/src/input.js` — keyboard and pointer.
- `game/src/main.js` — boot, the fixed-step loop, shot scenes, self-test.
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged.
