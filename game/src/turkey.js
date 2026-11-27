// turkey.js — the player: running, depth movement, jumping, ducking into
// hiding spots, stumbling, and the little speed burst from a golden corn.

import { stageAt } from './config.js';
import { insideZone } from './world.js';

export function createTurkey() {
  return {
    x: 6,               // metres along the route
    depth: 0.5,          // 0 = far side of the ground, 1 = near side
    jumpZ: 0,            // pixels above the ground while jumping
    jumpV: 0,
    lives: 3,
    invulnT: 0,          // seconds of post-hit invulnerability
    burstT: 0,           // golden-corn speed burst
    stumbleT: 0,
    ducking: false,
    hidden: false,
    inMud: false,
    animT: 0,            // run-cycle clock
    speedNow: 0,
  };
}

export function turkeySpeed(g) {
  const t = g.turkey;
  const stage = stageAt(t.x);
  let speed = stage.turkeySpeed;
  if (g.input.right()) speed *= 1.18;
  if (g.input.left()) speed *= 0.78;
  if (t.inMud) speed *= 0.55;
  if (t.stumbleT > 0) speed *= 0.35;
  if (t.burstT > 0) speed *= 1.35;
  if (t.ducking) speed *= 0.45;
  return speed;
}

export function updateTurkey(g, dt) {
  const t = g.turkey;
  const input = g.input;

  t.inMud = g.world.muds.some((mud) => insideZone(mud, t.x, t.depth));
  t.ducking = input.duck() && t.jumpZ === 0;

  // Depth movement across the ground band.
  const depthRate = t.ducking ? 0.7 : 1.7;
  if (input.up()) t.depth -= depthRate * dt;
  if (input.down()) t.depth += depthRate * dt;
  t.depth = Math.min(0.95, Math.max(0.03, t.depth));

  // Jump.
  if (input.jumpPressed && t.jumpZ === 0 && !t.ducking) {
    t.jumpV = 640;
    g.events.push('jump');
  }
  if (t.jumpZ > 0 || t.jumpV > 0) {
    t.jumpZ += t.jumpV * dt;
    t.jumpV -= 1650 * dt;
    if (t.jumpZ <= 0) { t.jumpZ = 0; t.jumpV = 0; g.events.push('land'); }
  }

  // Hidden only while ducking inside a hiding spot.
  t.hidden = t.ducking && g.world.hideZones.some((zone) => insideZone(zone, t.x, t.depth, 0.15));

  t.speedNow = turkeySpeed(g);
  t.x += t.speedNow * dt;
  t.animT += dt * (2.2 + t.speedNow * 0.55);

  if (t.invulnT > 0) t.invulnT -= dt;
  if (t.burstT > 0) t.burstT -= dt;
  if (t.stumbleT > 0) t.stumbleT -= dt;
}
