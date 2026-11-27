// Hand-in program for "The Great Gobble Escape" (turkey-run-game-01).
//
// The game itself is the game/ folder next to this file: plain static files
// (game/index.html plus its ES modules) that a desktop browser plays offline
// with no build step and no network request. This program's only job is the
// hand-in: copy game/ and screenshots/ into the output directory and write
// dossier.json there with the vendored make.fun library, so the gate can
// rebuild the same dossier from the output and compare it byte for byte.
//
// Run it the way the grader does, or locally with an output override:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoDir = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoDir, 'game'), join(outputDir, 'game'), { recursive: true });
if (existsSync(join(repoDir, 'screenshots'))) {
  mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
  cpSync(join(repoDir, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

// The caps below mirror the gate's own limits, so the dossier this writes is
// exactly the one the scorer rebuilds: at most 4 screenshots of 256 KiB, at
// most 993 files and 48 MiB under game/, no game/ path over 1000 bytes, and
// the dossier text capped at 160 KiB.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
