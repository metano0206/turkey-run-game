// farmer.js — the farmer AI. He chases what he can see, loses the turkey
// when it ducks into a hiding spot, searches where he last saw it, throws
// carving knives from the barnyard on, and trips over the same obstacles
// the turkey jumps — which is how a clever turkey gains ground.

import { stageAt } from './config.js';

export function createFarmer() {
  return {
    gap: 14,             // metres behind the turkey
    state: 'chase',      // chase | search | patrol
    sightT: 0,           // seconds since he last saw the turkey
    searchT: 0,
    knifeT: 5,           // seconds until he can throw again
    telegraphT: 0,       // arm raised, knife about to fly
    hopT: 0,             // tripping over an obstacle
    animT: 0,
    nextObstacle: 0,     // index into world.obstacles he has yet to pass
    worldX: -8,
  };
}

export function farmerSeesTurkey(g) {
  const t = g.turkey;
  const f = g.farmer;
  return !t.hidden && f.gap < 30;
}

export function updateFarmer(g, dt) {
  const t = g.turkey;
  const f = g.farmer;
  const stage = stageAt(t.x);
  f.worldX = t.x - f.gap;
  f.animT += dt * 3.4;

  // --- Vision and state changes -------------------------------------------
  if (farmerSeesTurkey(g)) {
    if (f.state !== 'chase') { f.state = 'chase'; g.events.push('spotted'); }
    f.sightT = 0;
  } else {
    f.sightT += dt;
    if (f.state === 'chase' && f.sightT > 0.9) {
      f.state = 'search';
      f.searchT = 0;
      g.events.push('lost');
    }
  }
  if (f.state === 'search') {
    f.searchT += dt;
    if (f.searchT > 3.2) f.state = 'patrol';
  }

  // --- Speed, by state ------------------------------------------------------
  let farmerSpeed;
  if (f.state === 'chase') {
    farmerSpeed = stage.farmerSpeed + Math.min(0.8, g.time * 0.004);
  } else if (f.state === 'search') {
    farmerSpeed = stage.turkeySpeed * 0.5; // he stops and looks around
  } else {
    // Patrol: drift back toward a lurking distance behind the turkey.
    farmerSpeed = stage.turkeySpeed + (f.gap < 17 ? -0.9 : 1.1);
  }
  if (f.hopT > 0) { farmerSpeed *= 0.3; f.hopT -= dt; }

  const prevX = f.worldX;
  f.gap += (t.speedNow - farmerSpeed) * dt;
  f.gap = Math.max(0.4, Math.min(34, f.gap));
  f.worldX = t.x - f.gap;

  // He has to hop the same fences and barrels: each one costs him time.
  const obstacles = g.world.obstacles;
  while (f.nextObstacle < obstacles.length && obstacles[f.nextObstacle].x < prevX) f.nextObstacle++;
  if (f.nextObstacle < obstacles.length) {
    const ob = obstacles[f.nextObstacle];
    if (prevX < ob.x && f.worldX >= ob.x) { f.hopT = 0.5; g.events.push('farmerHop'); }
  }

  // --- Carving-knife throws (barnyard onward) -------------------------------
  if (stage.knifeEvery > 0 && f.state === 'chase' && f.gap > 5 && f.gap < 24 && !g.knife) {
    f.knifeT -= dt;
    if (f.knifeT <= 0 && f.telegraphT === 0) f.telegraphT = 0.55;
  }
  if (f.telegraphT > 0) {
    f.telegraphT -= dt;
    if (f.telegraphT <= 0) {
      f.knifeT = stage.knifeEvery * (0.8 + Math.random() * 0.5);
      g.events.push('throwKnife');
    }
  }

  // --- The grab ---------------------------------------------------------------
  if (f.gap <= 0.75 && t.invulnT <= 0 && t.jumpZ < 30 && f.state === 'chase') {
    g.events.push('caught');
  }
}
