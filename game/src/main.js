// main.js — boot: canvas, input wiring, the fixed-step game loop, and the
// maker's deterministic screenshot scenes (?shot=title|farm|kitchen|escaped)
// plus a self-test that plays a full run with a simple bot (?test=fullrun).

import { VIEW_H, VIEW_W } from './config.js';
import { createGame, handleClick, ovenState, renderGame, setupShot, startRun, updateGame } from './game.js';
import { endInputFrame, installInput, keys } from './input.js';
import { isMuted, setMuted, unlockAudio } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW_W;
canvas.height = VIEW_H;
installInput(canvas);

const params = new URLSearchParams(location.search);
const seed = Number(params.get('seed') ?? 7) || 7;

const input = {
  up: () => keys.up(),
  down: () => keys.down(),
  left: () => keys.left(),
  right: () => keys.right(),
  duck: () => keys.duck(),
  jumpPressed: false,
  pointer: keys.pointer,
};

const game = createGame(seed, input);
const shot = params.get('shot') || params.get('scene');

addEventListener('keydown', () => unlockAudio(), { once: true });
canvas.addEventListener('pointerdown', () => unlockAudio(), { once: true });

if (params.get('test') === 'fullrun') {
  runSelfTest();
} else if (shot) {
  setupShot(game, shot);
  const draw = () => { renderGame(ctx, game); requestAnimationFrame(draw); };
  requestAnimationFrame(draw);
} else {
  let last = performance.now();
  let acc = 0;
  const STEP = 1 / 60;
  const frame = (now) => {
    acc += Math.min(0.12, (now - last) / 1000);
    last = now;
    let first = true;
    while (acc >= STEP) {
      input.jumpPressed = first && keys.pressed('Space');
      first = false;
      stepOnce();
      acc -= STEP;
    }
    if (keys.pointer.clicked) handleClick(game);
    renderGame(ctx, game);
    endInputFrame();
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

function stepOnce() {
  if (keys.pressed('KeyP') || keys.pressed('Escape')) {
    if (game.mode === 'playing') game.mode = 'paused';
    else if (game.mode === 'paused') game.mode = 'playing';
  }
  if (keys.pressed('KeyM')) setMuted(!isMuted());
  if (keys.pressed('Enter')) {
    if (game.mode === 'title' || game.mode === 'caught' || game.mode === 'escaped') startRun(game);
    else if (game.mode === 'paused') game.mode = 'playing';
  }
  updateGame(game, STEP);
}

// A simple bot that runs right, jumps obstacles, dodges tractors in depth
// and ducks into hiding spots when the farmer closes in. It exists to prove
// a full run can be finished; ?test=fullrun publishes the result on window.
function runSelfTest() {
  const bot = {
    up: () => botTarget() < game.turkey.depth - 0.05,
    down: () => botTarget() > game.turkey.depth + 0.05,
    left: () => false,
    right: () => true,
    duck: () => game.turkey.hidden !== undefined && isInHideZone() &&
      game.farmer.state === 'chase' && game.farmer.gap < 8,
    jumpPressed: false,
    pointer: { x: -1, y: -1, clicked: false },
  };
  function isInHideZone() {
    const t = game.turkey;
    return game.world.hideZones.some((z) =>
      Math.abs(z.x - t.x) < z.w / 2 && t.depth >= z.depth - 0.05 && t.depth <= z.depth + z.depthH + 0.05);
  }
  function botTarget() {
    const t = game.turkey;
    if (game.knife && game.knife.t > 0.35) {
      return game.knife.toDepth > t.depth ? Math.max(0.05, game.knife.toDepth - 0.3) : Math.min(0.95, game.knife.toDepth + 0.3);
    }
    for (const o of game.world.ovens) {
      if (o.x > t.x - 1 && o.x < t.x + 9 && ovenState(o, game.time) !== 'idle') {
        return t.depth < o.depth + o.depthH / 2 ? Math.max(0.05, o.depth - 0.22) : Math.min(0.95, o.depth + o.depthH + 0.22);
      }
    }
    for (const tr of game.world.tractors) {
      if (tr.x > t.x - 2 && tr.x < t.x + 7) return tr.depth > 0.45 ? 0.08 : 0.92;
    }
    if (game.farmer.state === 'chase' && game.farmer.gap < 5) {
      const zone = game.world.hideZones.find((z) => z.x > t.x - 1 && z.x < t.x + 10);
      if (zone) return zone.depth + zone.depthH / 2;
    }
    return 0.5;
  }
  game.input = bot;
  startRun(game);
  const dt = 1 / 60;
  let steps = 0;
  while (game.mode === 'playing' && steps < 60 * 1500) {
    const t = game.turkey;
    bot.jumpPressed = t.jumpZ === 0 && (game.world.obstacles.some((ob) =>
      ob.x - t.x > 0.2 && ob.x - t.x < 1.15 && Math.abs(t.depth - (ob.depth + ob.depthH / 2)) < 0.21) ||
      game.world.rollers.some((r) => r.state === 'rolling' && r.x - t.x > -0.4 && r.x - t.x < 2.8 && Math.abs(t.depth - r.depth) < 0.15));
    updateGame(game, dt);
    steps++;
  }
  window.__testResult = {
    mode: game.mode,
    score: Math.floor(game.score),
    distance: Math.floor(game.turkey.x),
    lives: game.turkey.lives,
    seconds: Math.round(steps / 60),
  };
  document.title = `TEST ${game.mode} ${window.__testResult.score}`;
  renderGame(ctx, game);
}
