// world.js — builds the whole escape route from a seed: three stages of
// obstacles to jump, hiding spots to duck into, mud, ovens, falling knives
// and pickups. The same seed always builds the same route.

import { FINISH_DISTANCE, GROUND_BOTTOM, GROUND_TOP, STAGES } from './config.js';
import { makeRng } from './random.js';

export function groundY(depth) {
  return GROUND_TOP + depth * (GROUND_BOTTOM - GROUND_TOP);
}
export function depthScale(depth) {
  return 0.8 + depth * 0.4;
}

const OBSTACLE_KINDS = {
  farm: [
    { kind: 'fence', h: 36, w: 0.9 },
    { kind: 'stump', h: 26, w: 0.7 },
    { kind: 'haybale', h: 46, w: 1.1 },
    { kind: 'rock', h: 30, w: 0.8 },
  ],
  barn: [
    { kind: 'barrel', h: 44, w: 0.8 },
    { kind: 'crate', h: 48, w: 0.9 },
    { kind: 'haybale', h: 46, w: 1.1 },
    { kind: 'trough', h: 30, w: 1.3 },
  ],
  kitchen: [
    { kind: 'stool', h: 30, w: 0.7 },
    { kind: 'pot', h: 38, w: 0.8 },
    { kind: 'crate', h: 48, w: 0.9 },
    { kind: 'sack', h: 34, w: 0.9 },
  ],
};

const HIDE_KINDS = {
  farm: ['haystack', 'cornpatch'],
  barn: ['haystack', 'barrelcluster'],
  kitchen: ['table', 'curtain'],
};

export function generateWorld(seed) {
  const rng = makeRng(seed);
  const obstacles = [];
  const hideZones = [];
  const muds = [];
  const ovens = [];
  const dropKnives = [];
  const pickups = [];
  const decorations = [];

  for (const stage of STAGES) {
    let x = stage.from + rng.range(14, 22);
    while (x < stage.to - 12) {
      const roll = rng.next();
      if (roll < 0.52) {
        // One or two obstacles, always leaving a depth gap to slip through.
        const def = rng.pick(OBSTACLE_KINDS[stage.id]);
        const depth = rng.range(0.08, 0.78);
        obstacles.push({ x, depth, depthH: 0.24, ...def });
        if (rng.chance(0.4)) {
          const def2 = rng.pick(OBSTACLE_KINDS[stage.id]);
          const depth2 = depth > 0.45 ? rng.range(0.02, 0.3) : rng.range(0.62, 0.9);
          obstacles.push({ x: x + rng.range(-0.4, 0.4), depth: depth2, depthH: 0.22, ...def2 });
        }
        x += rng.range(9, 15);
      } else if (roll < 0.68) {
        hideZones.push({ x, depth: rng.range(0.1, 0.62), depthH: 0.3, w: rng.range(1.6, 2.2), kind: rng.pick(HIDE_KINDS[stage.id]) });
        x += rng.range(8, 13);
      } else if (roll < 0.78 && stage.id !== 'kitchen') {
        muds.push({ x, depth: rng.range(0.05, 0.6), depthH: 0.32, w: rng.range(2.2, 3.4) });
        x += rng.range(9, 14);
      } else if (roll < 0.86 && stage.id === 'kitchen') {
        ovens.push({ x, depth: rng.range(0.08, 0.5), depthH: 0.34, phase: rng.range(0, 3.4) });
        x += rng.range(10, 15);
      } else if (roll < 0.92 && stage.id !== 'farm') {
        dropKnives.push({ x, depth: rng.range(0.1, 0.8), state: 'hanging', fallY: 0, timer: 0 });
        x += rng.range(9, 14);
      } else {
        // A little run of pickups in an arc.
        const kind = rng.chance(0.14) ? 'golden' : rng.chance(0.3) ? 'pumpkin' : 'corn';
        const baseDepth = rng.range(0.15, 0.8);
        const n = rng.int(2, 3);
        for (let i = 0; i < n; i++) {
          pickups.push({ x: x + i * 1.1, depth: Math.min(0.92, Math.max(0.05, baseDepth + Math.sin(i * 1.2) * 0.12)), kind, taken: false, bob: rng.range(0, 6) });
        }
        x += rng.range(8, 13);
      }
      // Scenery sprinkled between set pieces.
      if (rng.chance(0.75)) {
        const kinds = stage.id === 'kitchen' ? ['pumpkin', 'leaves'] : ['pumpkin', 'leaves', 'sunflower', 'grass'];
        decorations.push({ x: x + rng.range(0, 6), depth: rng.range(0.02, 0.95), kind: rng.pick(kinds) });
      }
    }
    // One guaranteed hiding spot and snack early in each stage.
    hideZones.push({ x: stage.from + 30, depth: 0.3, depthH: 0.3, w: 2, kind: HIDE_KINDS[stage.id][0] });
    pickups.push({ x: stage.from + 18, depth: 0.5, kind: 'corn', taken: false, bob: 0 });
  }

  // Signature hazards: patrolling tractors on the farm, barrels that roll
  // downhill at the turkey in the barnyard.
  const tractors = [];
  for (let i = 0; i < 3; i++) {
    const minX = 120 + i * 130 + rng.range(0, 30);
    tractors.push({ minX, maxX: minX + rng.range(22, 30), x: minX + 8, depth: rng.range(0.15, 0.6), dir: 1, speed: rng.range(1.9, 2.5) });
  }
  const rollers = [];
  for (let x = 545; x < 985; x += rng.range(52, 78)) {
    rollers.push({ x, startX: x, depth: rng.range(0.12, 0.8), state: 'waiting', rollX: 0 });
  }

  const byX = (a, b) => a.x - b.x;
  obstacles.sort(byX); hideZones.sort(byX); muds.sort(byX);
  ovens.sort(byX); dropKnives.sort(byX); pickups.sort(byX); decorations.sort(byX);
  return { obstacles, hideZones, muds, ovens, dropKnives, pickups, decorations, tractors, rollers, finishX: FINISH_DISTANCE };
}

// Is a point (x in metres, depth 0..1) inside a zone's footprint?
export function insideZone(zone, x, depth, pad = 0) {
  return Math.abs(x - zone.x) <= zone.w / 2 + pad &&
    depth >= zone.depth - pad * 0.2 && depth <= zone.depth + zone.depthH + pad * 0.2;
}
