// game.js — the state machine and the referee: modes (title, playing,
// paused, caught, escaped), collisions, hazards, scoring, popups, the HUD
// and the screens. Drawing of the world itself lives in art.js.

import { COLORS as C, FINISH_DISTANCE, PX_PER_METER, STAGES, VIEW_H, VIEW_W, stageAt } from './config.js';
import { generateWorld, groundY, insideZone } from './world.js';
import { createTurkey, updateTurkey } from './turkey.js';
import { createFarmer, updateFarmer } from './farmer.js';
import * as art from './art.js';
import { sfx, startMusic, stopMusic } from './audio.js';

export function createGame(seed, input) {
  const g = {
    mode: 'title',
    seed,
    input,
    time: 0,
    score: 0,
    corn: 0,
    world: generateWorld(seed),
    turkey: createTurkey(),
    farmer: createFarmer(),
    knife: null,          // the farmer's thrown carving knife, mid-flight
    popups: [],
    particles: [],
    events: [],
    banner: null,
    shakeT: 0,
    stageIndex: 0,
    runTime: 0,
    best: 0,
    buttons: {},
    endStats: null,
  };
  g.farmer.depth = 0.5;
  try { g.best = Number(localStorage.getItem('gobble-best') || 0); } catch { g.best = 0; }
  return g;
}

export function startRun(g) {
  g.world = generateWorld(g.seed);
  g.turkey = createTurkey();
  g.farmer = createFarmer();
  g.farmer.depth = 0.5;
  g.knife = null;
  g.popups = [];
  g.particles = [];
  g.score = 0;
  g.corn = 0;
  g.time = 0;
  g.runTime = 0;
  g.stageIndex = 0;
  g.mode = 'playing';
  showBanner(g, STAGES[0].name, STAGES[0].sub + ' — reach the forest!');
  sfx.gobble();
  startMusic();
}

function showBanner(g, title, sub) {
  g.banner = { title, sub, t: 0 };
}

function popup(g, x, y, text, color = '#fff6e3', size = 21) {
  g.popups.push({ x, y, text, color, size, t: 0, life: 1.15 });
}

function feathers(g, sx, sy, n = 10) {
  for (let i = 0; i < n; i++) {
    g.particles.push({
      x: sx, y: sy, vx: (Math.random() - 0.3) * 130, vy: -Math.random() * 150 - 30,
      rot: Math.random() * 6, vr: (Math.random() - 0.5) * 9, t: 0, life: 0.9 + Math.random() * 0.4,
    });
  }
}

const camX = (g) => g.turkey.x - 46;
export const toScreenX = (g, worldX) => (worldX - camX(g)) * PX_PER_METER;

// --------------------------------------------------------------- updating
export function updateGame(g, dt) {
  g.popups = g.popups.filter((p) => (p.t += dt) < p.life);
  g.particles = g.particles.filter((p) => (p.t += dt) < p.life);
  for (const p of g.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 340 * dt; p.rot += p.vr * dt; }
  if (g.banner && (g.banner.t += dt) > 2.6) g.banner = null;
  if (g.shakeT > 0) g.shakeT -= dt;
  if (g.mode !== 'playing') { g.events.length = 0; return; }

  g.time += dt;
  g.runTime += dt;
  const t = g.turkey;
  const prevX = t.x;

  updateTurkey(g, dt);
  // The farmer eases toward the turkey's depth lane as he runs.
  g.farmer.depth += (t.depth - g.farmer.depth) * Math.min(1, dt * 1.4);
  updateFarmer(g, dt);

  g.score += t.speedNow * dt * 2;

  t.panic = g.farmer.state === 'chase' && g.farmer.gap < 6.5;

  handleEvents(g);
  handleObstacles(g, prevX);
  handlePickups(g);
  handleOvens(g, dt);
  handleDropKnives(g, dt);
  handleThrownKnife(g, dt);
  handleTractors(g, dt);
  handleRollers(g, dt);

  // Stage transitions.
  const stage = stageAt(t.x);
  const idx = STAGES.indexOf(stage);
  if (idx !== g.stageIndex) {
    g.stageIndex = idx;
    g.score += 150;
    showBanner(g, stage.name, stage.sub);
    sfx.stageClear();
  }

  if (t.x >= FINISH_DISTANCE && g.mode === 'playing') {
    g.score += 500 + t.lives * 250;
    g.mode = 'escaped';
    g.endStats = stats(g);
    sfx.win();
    stopMusic();
    saveBest(g);
  }
  g.events.length = 0;
}

function stats(g) {
  return {
    score: Math.floor(g.score),
    distance: Math.min(FINISH_DISTANCE, Math.floor(g.turkey.x)),
    time: Math.floor(g.runTime),
    corn: g.corn,
    lives: g.turkey.lives,
  };
}

function saveBest(g) {
  if (g.score > g.best) {
    g.best = Math.floor(g.score);
    try { localStorage.setItem('gobble-best', String(g.best)); } catch { /* private mode */ }
  }
}

function handleEvents(g) {
  const t = g.turkey;
  for (const ev of g.events) {
    if (ev === 'jump') sfx.jump();
    else if (ev === 'spotted') {
      popup(g, toScreenX(g, g.farmer.worldX) + 10, groundY(g.farmer.depth) - 150, 'SPOTTED!', '#ff5a3c', 24);
      sfx.spotted();
    } else if (ev === 'lost') {
      g.score += 100;
      popup(g, VIEW_W / 2, 120, 'LOST HIM! +100', '#b7e39a', 24);
      sfx.lostHim();
    } else if (ev === 'stumble') {
      sfx.stumble();
      g.shakeT = Math.max(g.shakeT, 0.18);
      popup(g, toScreenX(g, t.x), groundY(t.depth) - 90, 'OUCH!', '#ffd94d', 19);
    } else if (ev === 'throwKnife') {
      const f = g.farmer;
      g.knife = {
        fromX: f.worldX + 1, fromDepth: f.depth,
        toX: t.x + t.speedNow * 0.55, toDepth: t.depth,
        t: 0, dur: 1.0, nearCounted: false,
      };
      sfx.knifeThrow();
    } else if (ev === 'caught') {
      hitTurkey(g, 'farmer');
    }
  }
}

function hitTurkey(g, kind) {
  const t = g.turkey;
  if (t.invulnT > 0 || g.mode !== 'playing') return;
  t.lives -= 1;
  const sx = toScreenX(g, t.x);
  feathers(g, sx, groundY(t.depth) - 30, 12);
  sfx.squawk();
  g.shakeT = 0.35;
  if (t.lives <= 0) {
    g.mode = 'caught';
    g.endStats = stats(g);
    sfx.lose();
    stopMusic();
    saveBest(g);
    return;
  }
  t.invulnT = 2.2;
  t.burstT = 0.9; // a desperate dash away
  g.farmer.gap = Math.max(g.farmer.gap, 11);
  g.farmer.state = 'search';
  g.farmer.sightT = 1;
  popup(g, sx, groundY(t.depth) - 100, kind === 'oven' ? 'SINGED!' : 'NICKED!', '#ff8a5c', 22);
}

function handleObstacles(g) {
  const t = g.turkey;
  if (t.jumpZ > 0 || t.stumbleT > 0) return;
  for (const ob of g.world.obstacles) {
    if (Math.abs(ob.x - t.x) > 1.2) continue;
    const overlapX = Math.abs(ob.x - t.x) < ob.w / 2 + 0.32;
    const overlapDepth = t.depth > ob.depth - 0.05 && t.depth < ob.depth + ob.depthH + 0.05;
    if (overlapX && overlapDepth && t.jumpZ < ob.h) {
      t.stumbleT = 0.7;
      g.events.push('stumble');
      handleEventsStumbleOnly(g);
      break;
    }
  }
}
// 'stumble' is pushed after handleEvents already ran this frame; play it now.
function handleEventsStumbleOnly(g) {
  sfx.stumble();
  g.shakeT = Math.max(g.shakeT, 0.18);
  popup(g, toScreenX(g, g.turkey.x), groundY(g.turkey.depth) - 90, 'OUCH!', '#ffd94d', 19);
}

function handleTractors(g, dt) {
  const t = g.turkey;
  for (const tr of g.world.tractors) {
    tr.x += tr.dir * tr.speed * dt;
    if (tr.x > tr.maxX) { tr.x = tr.maxX; tr.dir = -1; }
    if (tr.x < tr.minX) { tr.x = tr.minX; tr.dir = 1; }
    // A tractor is far too tall to jump: dodge it in depth instead.
    if (Math.abs(tr.x - t.x) < 1.9 && Math.abs(tr.depth + 0.12 - t.depth) < 0.17 && t.jumpZ < 100) {
      hitTurkey(g, 'tractor');
    }
  }
}

function handleRollers(g, dt) {
  const t = g.turkey;
  for (const r of g.world.rollers) {
    if (r.state === 'waiting' && t.x > r.x - 13 && t.x < r.x) {
      r.state = 'rolling';
      sfx.thud();
    } else if (r.state === 'rolling') {
      r.x -= 4.6 * dt;
      r.rollX += 4.6 * dt;
      if (r.startX - r.x > 17) r.state = 'stopped';
      if (Math.abs(r.x - t.x) < 0.55 && Math.abs(r.depth - t.depth) < 0.13 && t.jumpZ < 44) {
        hitTurkey(g, 'barrel');
        r.state = 'stopped';
      }
    } else if (r.state === 'stopped') {
      // A stopped barrel is just an obstacle: it trips a grounded turkey.
      if (Math.abs(r.x - t.x) < 0.45 && Math.abs(r.depth - t.depth) < 0.13 && t.jumpZ < 44 && t.stumbleT <= 0) {
        t.stumbleT = 0.7;
        sfx.stumble();
        g.shakeT = Math.max(g.shakeT, 0.18);
      }
    }
  }
}

function handlePickups(g) {
  const t = g.turkey;
  for (const p of g.world.pickups) {
    if (p.taken || Math.abs(p.x - t.x) > 0.8) continue;
    if (Math.abs(p.depth - t.depth) < 0.14 && t.jumpZ < 46) {
      p.taken = true;
      g.corn++;
      const sx = toScreenX(g, p.x);
      if (p.kind === 'golden') {
        g.score += 400;
        t.burstT = 1.5;
        popup(g, sx, groundY(p.depth) - 70, 'GOLDEN CORN! +400', '#ffd94d', 20);
        sfx.golden();
      } else if (p.kind === 'pumpkin') {
        g.score += 150;
        popup(g, sx, groundY(p.depth) - 70, '+150', '#ffb066', 18);
        sfx.pickup();
      } else {
        g.score += 50;
        popup(g, sx, groundY(p.depth) - 70, '+50', '#ffe9bd', 17);
        sfx.pickup();
      }
    }
  }
}

export function ovenState(oven, time) {
  const cyc = (time + oven.phase) % 4.2;
  if (cyc < 2.4) return 'idle';
  if (cyc < 3.2) return 'glow';
  return 'blast';
}

function handleOvens(g, dt) {
  const t = g.turkey;
  for (const oven of g.world.ovens) {
    if (Math.abs(oven.x - t.x) > 1.4) continue;
    if (ovenState(oven, g.time) === 'blast' &&
        Math.abs(oven.x - t.x) < 0.95 &&
        t.depth > oven.depth - 0.04 && t.depth < oven.depth + oven.depthH + 0.04) {
      hitTurkey(g, 'oven');
    }
  }
}

function handleDropKnives(g, dt) {
  const t = g.turkey;
  for (const knife of g.world.dropKnives) {
    if (knife.state === 'hanging') {
      if (t.x > knife.x - 4.2 && Math.abs(knife.depth - t.depth) < 0.55) {
        knife.state = 'falling';
        sfx.knifeThrow();
      }
    } else if (knife.state === 'falling') {
      knife.fallY += 560 * dt;
      if (knife.fallY >= 168) {
        knife.state = 'stuck';
        knife.timer = 1.6;
        if (Math.abs(knife.x - t.x) < 0.5 && Math.abs(knife.depth - t.depth) < 0.11 && t.jumpZ < 22 && !t.ducking) {
          hitTurkey(g, 'knife');
        } else if (Math.abs(knife.x - t.x) < 1.5) {
          g.score += 25;
          popup(g, toScreenX(g, knife.x), groundY(knife.depth) - 60, 'CLOSE! +25', '#ffe9bd', 16);
          sfx.knifeNear();
        }
        sfx.thud();
      }
    } else if (knife.state === 'stuck') {
      knife.timer -= dt;
      if (knife.timer <= 0) knife.state = 'gone';
    }
  }
}

function handleThrownKnife(g, dt) {
  const knife = g.knife;
  if (!knife) return;
  knife.t += dt / knife.dur;
  const t = g.turkey;
  if (knife.t >= 1) {
    const hit = Math.abs(knife.toX - t.x) < 0.55 && Math.abs(knife.toDepth - t.depth) < 0.12 &&
      t.jumpZ < 26 && !t.ducking;
    if (hit) hitTurkey(g, 'knife');
    else if (Math.abs(knife.toX - t.x) < 1.6) {
      g.score += 25;
      popup(g, toScreenX(g, t.x), groundY(t.depth) - 96, 'CLOSE! +25', '#ffe9bd', 16);
      sfx.knifeNear();
    }
    g.knife = null;
  }
}

// -------------------------------------------------------------- rendering
export function renderGame(ctx, g) {
  ctx.save();
  if (g.shakeT > 0) {
    ctx.translate((Math.random() - 0.5) * 7 * g.shakeT * 3, (Math.random() - 0.5) * 5 * g.shakeT * 3);
  }
  if (g.mode === 'title') { renderTitle(ctx, g); ctx.restore(); return; }
  renderScene(ctx, g);
  if (g.mode === 'playing' || g.mode === 'paused') renderHud(ctx, g);
  if (g.mode === 'paused') renderPause(ctx, g);
  if (g.mode === 'caught') renderEnd(ctx, g, false);
  if (g.mode === 'escaped') renderEnd(ctx, g, true);
  ctx.restore();
}

function renderScene(ctx, g) {
  const t = g.turkey;
  const stage = stageAt(Math.min(t.x, FINISH_DISTANCE - 1));
  art.drawBackground(ctx, stage.id, camX(g), g.time);

  // The finish gate: a forest arch at the end of the route.
  const gateSx = toScreenX(g, FINISH_DISTANCE);
  if (gateSx > -80 && gateSx < VIEW_W + 80) drawGate(ctx, gateSx);

  const drawables = [];
  const add = (depth, fn) => drawables.push({ depth, fn });

  for (const d of g.world.decorations) {
    const sx = toScreenX(g, d.x);
    if (sx > -60 && sx < VIEW_W + 60) add(d.depth - 0.02, () => art.drawDecoration(ctx, d, sx));
  }
  for (const m of g.world.muds) {
    const sx = toScreenX(g, m.x);
    if (sx > -140 && sx < VIEW_W + 140) add(m.depth, () => art.drawMud(ctx, sx, m));
  }
  for (const ob of g.world.obstacles) {
    const sx = toScreenX(g, ob.x);
    if (sx > -70 && sx < VIEW_W + 70) add(ob.depth + ob.depthH, () => art.drawObstacle(ctx, ob, sx, g.time));
  }
  for (const z of g.world.hideZones) {
    const sx = toScreenX(g, z.x);
    if (sx > -160 && sx < VIEW_W + 160) add(z.depth + z.depthH, () => art.drawHideZone(ctx, z, sx, g.time));
  }
  for (const o of g.world.ovens) {
    const sx = toScreenX(g, o.x);
    if (sx > -90 && sx < VIEW_W + 90) add(o.depth + o.depthH, () => art.drawOven(ctx, o, sx, ovenState(o, g.time), g.time));
  }
  for (const k of g.world.dropKnives) {
    if (k.state === 'gone') continue;
    const sx = toScreenX(g, k.x);
    if (sx > -40 && sx < VIEW_W + 40) add(k.depth, () => art.drawDropKnife(ctx, k, sx));
  }
  for (const p of g.world.pickups) {
    if (p.taken) continue;
    const sx = toScreenX(g, p.x);
    if (sx > -40 && sx < VIEW_W + 40) add(p.depth, () => art.drawPickup(ctx, p, sx, g.time));
  }

  for (const tr of g.world.tractors) {
    const sx = toScreenX(g, tr.x);
    if (sx > -110 && sx < VIEW_W + 110) add(tr.depth + 0.24, () => art.drawTractor(ctx, tr, sx, g.time));
  }
  for (const r of g.world.rollers) {
    const sx = toScreenX(g, r.x);
    if (sx > -50 && sx < VIEW_W + 50) add(r.depth + 0.22, () => art.drawRollingBarrel(ctx, r, sx, g.time));
  }

  const farmerSx = toScreenX(g, g.farmer.worldX);
  add(g.farmer.depth + 0.24, () => art.drawFarmer(ctx, g.farmer, farmerSx, g.time));
  const turkeySx = toScreenX(g, t.x);
  add(t.depth + 0.24, () => art.drawTurkey(ctx, t, turkeySx, g.time));

  drawables.sort((a, b) => a.depth - b.depth);
  for (const d of drawables) d.fn();

  // A hiding turkey is covered by its hiding spot.
  if (t.hidden) {
    const zone = g.world.hideZones.find((z) => insideZone(z, t.x, t.depth, 0.15));
    if (zone) art.drawHideZone(ctx, zone, toScreenX(g, zone.x), g.time);
  }

  // The thrown knife arcs above everything.
  if (g.knife) {
    const k = g.knife;
    const p = Math.min(1, k.t);
    const x = k.fromX + (k.toX - k.fromX) * p;
    const depth = k.fromDepth + (k.toDepth - k.fromDepth) * p;
    const sx = toScreenX(g, x);
    const sy = groundY(depth) - 44 - Math.sin(p * Math.PI) * 66;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(p * 9);
    art.drawKnifeShape(ctx, 1.05);
    ctx.restore();
  }

  // Feathers and popups.
  for (const p of g.particles) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.globalAlpha = 1 - p.t / p.life;
    ctx.fillStyle = '#f3e3c2';
    ctx.beginPath(); ctx.ellipse(0, 0, 7, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  ctx.textAlign = 'center';
  for (const p of g.popups) {
    ctx.globalAlpha = 1 - p.t / p.life;
    ctx.font = `bold ${p.size}px Georgia, serif`;
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(58, 35, 23, 0.85)';
    const y = p.y - p.t * 34;
    ctx.strokeText(p.text, p.x, y);
    ctx.fillStyle = p.color;
    ctx.fillText(p.text, p.x, y);
  }
  ctx.globalAlpha = 1;

  // Danger vignette when the farmer is close.
  const gap = g.farmer.gap;
  if (g.mode === 'playing' && gap < 6) {
    const a = (1 - gap / 6) * (0.16 + 0.07 * Math.sin(g.time * 9));
    const grad = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.42, VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.85);
    grad.addColorStop(0, 'rgba(180, 30, 10, 0)');
    grad.addColorStop(1, `rgba(180, 30, 10, ${a})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  // Stage banner.
  if (g.banner) {
    const b = g.banner;
    const a = b.t < 0.3 ? b.t / 0.3 : b.t > 2.1 ? Math.max(0, (2.6 - b.t) / 0.5) : 1;
    ctx.globalAlpha = a;
    ctx.textAlign = 'center';
    ctx.font = 'bold 40px Georgia, serif';
    ctx.lineWidth = 7; ctx.strokeStyle = 'rgba(58,35,23,0.9)';
    ctx.strokeText(b.title, VIEW_W / 2, 150);
    ctx.fillStyle = C.cream;
    ctx.fillText(b.title, VIEW_W / 2, 150);
    ctx.font = 'italic 19px Georgia, serif';
    ctx.fillStyle = '#fff6e3';
    ctx.fillText(b.sub, VIEW_W / 2, 180);
    ctx.globalAlpha = 1;
  }
}

function drawGate(ctx, sx) {
  // Two pines and a wooden arch: the way into Freedom Forest.
  for (const off of [-58, 58]) {
    ctx.fillStyle = '#5d3719';
    ctx.fillRect(sx + off - 5, 218, 10, 110);
    ctx.fillStyle = '#3f6034';
    for (let i = 0; i < 3; i++) {
      const w = 44 - i * 10;
      ctx.beginPath();
      ctx.moveTo(sx + off - w / 2, 246 - i * 30);
      ctx.lineTo(sx + off + w / 2, 246 - i * 30);
      ctx.lineTo(sx + off, 214 - i * 30);
      ctx.fill();
    }
  }
  ctx.fillStyle = C.wood;
  ctx.fillRect(sx - 66, 196, 132, 10);
  ctx.save();
  ctx.translate(sx, 186);
  ctx.fillStyle = '#7a4a26';
  ctx.beginPath(); ctx.roundRect(-64, -16, 128, 30, 6); ctx.fill();
  ctx.fillStyle = '#fff6e3';
  ctx.font = 'bold 15px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('FREEDOM FOREST', 0, 5);
  ctx.restore();
}

function renderHud(ctx, g) {
  const t = g.turkey;
  // Top strip.
  ctx.fillStyle = 'rgba(41, 59, 50, 0.85)';
  ctx.fillRect(0, 0, VIEW_W, 58);
  ctx.fillStyle = 'rgba(255, 233, 189, 0.25)';
  ctx.fillRect(0, 58, VIEW_W, 2);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffe9bd';
  ctx.font = 'bold 12px Georgia, serif';
  ctx.fillText('SCORE', 18, 20);
  ctx.font = 'bold 24px Georgia, serif';
  ctx.fillStyle = '#fff6e3';
  ctx.fillText(String(Math.floor(g.score)).padStart(6, '0'), 18, 47);
  ctx.font = 'bold 12px Georgia, serif';
  ctx.fillStyle = 'rgba(255, 233, 189, 0.9)';
  ctx.fillText('OBJECTIVE: Reach Freedom Forest — don\'t get caught!', 18, VIEW_H - 12);

  // Route progress with turkey and farmer markers.
  const barX = 250, barW = 460, barY = 30;
  ctx.fillStyle = 'rgba(255,246,227,0.25)';
  ctx.beginPath(); ctx.roundRect(barX, barY, barW, 9, 5); ctx.fill();
  ctx.fillStyle = '#f2b33d';
  ctx.beginPath(); ctx.roundRect(barX, barY, barW * Math.min(1, t.x / FINISH_DISTANCE), 9, 5); ctx.fill();
  for (const s of STAGES) {
    const x = barX + (s.to / FINISH_DISTANCE) * barW;
    ctx.fillStyle = 'rgba(255,246,227,0.6)';
    ctx.fillRect(x - 1, barY - 3, 2, 15);
  }
  const tX = barX + (t.x / FINISH_DISTANCE) * barW;
  const fX = barX + (Math.max(0, t.x - g.farmer.gap) / FINISH_DISTANCE) * barW;
  ctx.font = '13px Georgia, serif';
  ctx.fillText('🧑‍🌾', fX - 7, barY - 6);
  ctx.fillText('🦃', tX - 7, barY - 6);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffe9bd';
  ctx.font = 'bold 13px Georgia, serif';
  ctx.fillText(`${stageAt(t.x).name} · ${Math.floor(t.x)} m / ${FINISH_DISTANCE} m`, barX + barW / 2, 18);

  // Lives as feathers, top right.
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffe9bd';
  ctx.font = 'bold 12px Georgia, serif';
  ctx.fillText('FEATHERS', VIEW_W - 18, 20);
  for (let i = 0; i < 3; i++) {
    const x = VIEW_W - 34 - i * 26;
    ctx.save();
    ctx.translate(x, 40);
    ctx.rotate(0.7);
    ctx.globalAlpha = i < t.lives ? 1 : 0.22;
    ctx.fillStyle = '#f3e3c2';
    ctx.beginPath(); ctx.ellipse(0, 0, 11, 4.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#b9832e'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(11, 0); ctx.stroke();
    ctx.restore();
  }
  ctx.globalAlpha = 1;

  // Farmer proximity meter (bottom-right, over the dirt where it reads).
  if (g.farmer.gap < 16) {
    const w = 150;
    const x = VIEW_W - 18 - w;
    ctx.fillStyle = 'rgba(43,24,12,0.6)';
    ctx.beginPath(); ctx.roundRect(x, VIEW_H - 26, w, 9, 4); ctx.fill();
    ctx.fillStyle = g.farmer.gap < 6 ? '#ff5a3c' : '#f2b33d';
    ctx.beginPath(); ctx.roundRect(x, VIEW_H - 26, w * (1 - g.farmer.gap / 16), 9, 4); ctx.fill();
    ctx.fillStyle = '#ffe9bd';
    ctx.font = 'bold 10px Georgia, serif';
    ctx.textAlign = 'right';
    ctx.fillText('FARMER!', VIEW_W - 18, VIEW_H - 32);
  }
  // Hide hint.
  if (t.hidden) {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#b7e39a';
    ctx.font = 'bold 15px Georgia, serif';
    ctx.fillText('HIDDEN — he can\'t see you!', VIEW_W / 2, 84);
  }
}

// ---------------------------------------------------------------- screens
function panel(ctx, w, h) {
  const x = (VIEW_W - w) / 2, y = (VIEW_H - h) / 2;
  ctx.fillStyle = 'rgba(43, 24, 12, 0.55)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = '#fff6e3';
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 16); ctx.fill();
  ctx.strokeStyle = C.wood;
  ctx.lineWidth = 4;
  ctx.stroke();
  return { x, y, w, h };
}

function button(ctx, g, id, cx, cy, w, h, label, color = '#a63d2f') {
  const x = cx - w / 2, y = cy - h / 2;
  g.buttons[id] = { x, y, w, h };
  const hover = g.input.pointer.x >= x && g.input.pointer.x <= x + w &&
    g.input.pointer.y >= y && g.input.pointer.y <= y + h;
  ctx.fillStyle = hover ? '#c8542e' : color;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 10); ctx.fill();
  ctx.fillStyle = '#fff6e3';
  ctx.font = 'bold 21px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, cx, cy + 7);
}

function renderTitle(ctx, g) {
  // A calm farm scene behind the title.
  const fake = { ...g, turkey: { ...g.turkey, x: 46, depth: 0.55, jumpZ: 0, animT: 2 } };
  art.drawBackground(ctx, 'farm', 0, g.time);
  art.drawTurkey(ctx, fake.turkey, 600, g.time);
  const f = { ...g.farmer, state: 'search', depth: 0.55 };
  art.drawFarmer(ctx, f, 180, g.time);

  ctx.fillStyle = 'rgba(43, 24, 12, 0.35)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.font = 'bold 21px Georgia, serif';
  ctx.fillStyle = '#ffd94d';
  ctx.fillText('— THE GREAT THANKSGIVING ESCAPE —', VIEW_W / 2, 84);
  ctx.font = 'bold 84px Georgia, serif';
  ctx.lineWidth = 11; ctx.strokeStyle = 'rgba(58,35,23,0.9)';
  ctx.strokeText('GOBBLE & RUN!', VIEW_W / 2, 172);
  ctx.fillStyle = '#fff6e3';
  ctx.fillText('GOBBLE & RUN!', VIEW_W / 2, 172);
  ctx.font = 'italic 21px Georgia, serif';
  ctx.fillStyle = '#ffe9bd';
  ctx.fillText('One bird. Three worlds. Zero dinner reservations.', VIEW_W / 2, 208);
  ctx.font = '16px Georgia, serif';
  ctx.fillText('Dinner is at six and you are NOT on the menu — run 1,500 m to Freedom Forest!', VIEW_W / 2, 236);

  const p = { x: (VIEW_W - 580) / 2, y: 258, w: 580, h: 118 };
  ctx.fillStyle = '#fff6e3';
  ctx.beginPath(); ctx.roundRect(p.x, p.y, p.w, p.h, 14); ctx.fill();
  ctx.strokeStyle = C.wood; ctx.lineWidth = 4; ctx.stroke();
  ctx.fillStyle = C.ink;
  ctx.font = '16.5px Georgia, serif';
  ctx.fillText('🏃  Move: WASD / Arrows · Jump: SPACE · Duck & hide: SHIFT', VIEW_W / 2, p.y + 36);
  ctx.fillText('🌽  Grab corn for points. Duck into haystacks & under tables to hide.', VIEW_W / 2, p.y + 63);
  ctx.fillText('🔪  Dodge tractors, rolling barrels, ovens & knives — 3 feathers is all you get!', VIEW_W / 2, p.y + 90);
  button(ctx, g, 'start', VIEW_W / 2, p.y + 152, 260, 54, '▶  START THE RUN');
  ctx.font = '15px Georgia, serif';
  ctx.fillStyle = '#ffe9bd';
  if (g.best > 0) ctx.fillText(`Best score so far: ${g.best}`, VIEW_W / 2, p.y + 192);
}

function renderPause(ctx, g) {
  const p = panel(ctx, 360, 190);
  ctx.fillStyle = C.ink;
  ctx.textAlign = 'center';
  ctx.font = 'bold 34px Georgia, serif';
  ctx.fillText('PAUSED', VIEW_W / 2, p.y + 62);
  ctx.font = '17px Georgia, serif';
  ctx.fillText('The farmer is catching his breath too.', VIEW_W / 2, p.y + 96);
  button(ctx, g, 'resume', VIEW_W / 2, p.y + 142, 210, 46, '▶  KEEP RUNNING');
}

function renderEnd(ctx, g, escaped) {
  const s = g.endStats ?? stats(g);
  // Keep the scene visible behind a soft veil.
  renderScene(ctx, g);
  const p = panel(ctx, 520, 330);
  ctx.textAlign = 'center';
  ctx.font = 'bold 46px Georgia, serif';
  ctx.fillStyle = escaped ? '#5f7030' : '#a63d2f';
  ctx.fillText(escaped ? 'YOU ESCAPED!' : 'TURKEY DINNER!', VIEW_W / 2, p.y + 72);
  ctx.font = 'italic 18px Georgia, serif';
  ctx.fillStyle = C.ink;
  ctx.fillText(
    escaped ? 'You burst through the pines, free as a bird. No gravy today!'
            : 'The farmer\'s net closes in… Thanksgiving is back on.',
    VIEW_W / 2, p.y + 106);
  ctx.font = '19px Georgia, serif';
  const mins = Math.floor(s.time / 60), secs = String(s.time % 60).padStart(2, '0');
  ctx.fillText(`Score  ${s.score}`, VIEW_W / 2, p.y + 152);
  ctx.fillText(`Distance  ${s.distance} m   ·   Time  ${mins}:${secs}   ·   Corn  🌽 × ${s.corn}`, VIEW_W / 2, p.y + 184);
  ctx.fillText(escaped ? `Feathers left: ${s.lives}  (+${s.lives * 250} bonus included)` : `Best score: ${g.best}`, VIEW_W / 2, p.y + 216);
  button(ctx, g, 'restart', VIEW_W / 2, p.y + 272, 250, 52, '↻  RUN AGAIN');
  ctx.font = '14px Georgia, serif';
  ctx.fillStyle = '#8a6a4a';
  ctx.fillText('or press ENTER', VIEW_W / 2, p.y + 308);
}

// ------------------------------------------------- deterministic scenes
// ?shot=<name> freezes the game in a composed, reproducible scene so the
// maker's screenshots are real renders of the game's own code and UI.
export function setupShot(g, name) {
  const t = g.turkey;
  const f = g.farmer;
  if (name === 'title') {
    g.mode = 'title';
    g.time = 3.2;
    return;
  }
  g.mode = 'playing';
  if (name === 'farm' || name === 'play') {
    t.x = 176; t.depth = 0.55; t.jumpZ = 52; t.jumpV = 120; t.animT = 5.2; t.panic = true;
    f.gap = 6.2; f.state = 'chase'; f.worldX = t.x - f.gap; f.depth = 0.5;
    g.score = 1240; g.corn = 9; g.runTime = 25; g.time = 25.4;
    popup(g, toScreenX(g, f.worldX) + 12, groundY(f.depth) - 152, 'SPOTTED!', '#ff5a3c', 24);
  } else if (name === 'kitchen') {
    t.x = 1242; t.depth = 0.78; t.animT = 8.4;
    f.gap = 7.2; f.state = 'chase'; f.worldX = t.x - f.gap; f.depth = 0.46;
    g.score = 5470; g.corn = 21; g.runTime = 118; g.time = 118.0;
    let oven = g.world.ovens.find((o) => o.x > t.x + 2 && o.x < t.x + 55);
    if (!oven && g.world.ovens.length) {
      oven = g.world.ovens[g.world.ovens.length - 1];
      oven.x = t.x + 18; // compose the shot: a blasting oven just ahead
    }
    if (oven) oven.phase = ((3.7 - g.time) % 4.2 + 4.2) % 4.2; // mid-blast now
    g.knife = { fromX: f.worldX + 1, fromDepth: f.depth, toX: t.x + 2, toDepth: t.depth, t: 0.5, dur: 0.85, nearCounted: true };
    popup(g, toScreenX(g, f.worldX) + 12, groundY(f.depth) - 152, 'SPOTTED!', '#ff5a3c', 24);
  } else if (name === 'escaped') {
    t.x = FINISH_DISTANCE - 4; t.depth = 0.5; t.animT = 11;
    f.gap = 17; f.state = 'search'; f.worldX = t.x - f.gap; f.depth = 0.44;
    g.score = 8930; g.corn = 34; g.runTime = 187; g.time = 187.3;
    g.mode = 'escaped';
    g.endStats = { score: 8930, distance: 1500, time: 187, corn: 34, lives: 2 };
  } else if (name === 'caught' || name === 'end') {
    t.x = 1140; t.depth = 0.5;
    f.gap = 1.6; f.state = 'chase'; f.worldX = t.x - f.gap; f.depth = 0.5;
    g.score = 3860; g.corn = 23; g.runTime = 132; g.time = 132.2;
    g.mode = 'caught';
    g.endStats = { score: 3860, distance: 1140, time: 132, corn: 23, lives: 0 };
  }
}

// Click routing for menu buttons; returns true when a button was hit.
export function handleClick(g) {
  const { x, y } = g.input.pointer;
  for (const [id, r] of Object.entries(g.buttons)) {
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
      if (id === 'start' && g.mode === 'title') { sfx.click(); startRun(g); return true; }
      if (id === 'restart' && (g.mode === 'caught' || g.mode === 'escaped')) { sfx.click(); startRun(g); return true; }
      if (id === 'resume' && g.mode === 'paused') { g.mode = 'playing'; sfx.click(); return true; }
    }
  }
  return false;
}
