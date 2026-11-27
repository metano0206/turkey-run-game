// art.js — every visual is drawn with canvas paths: the turkey, the farmer,
// three stage backgrounds and all the props. Autumn palette throughout.

import { COLORS as C, GROUND_BOTTOM, GROUND_TOP, VIEW_H, VIEW_W } from './config.js';
import { groundY, depthScale } from './world.js';
import { makeRng } from './random.js';

function ellipse(ctx, x, y, rx, ry, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function rr(ctx, x, y, w, h, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

// ---------------------------------------------------------------- sky & land
export function drawBackground(ctx, stageId, camX, time) {
  if (stageId === 'kitchen') { drawKitchenBackdrop(ctx, camX, time); return; }

  const sky = ctx.createLinearGradient(0, 0, 0, GROUND_TOP);
  sky.addColorStop(0, '#ffdf9e');
  sky.addColorStop(0.75, C.sky);
  sky.addColorStop(1, C.skyLow);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEW_W, GROUND_TOP + 4);

  // Sun, low and golden.
  const sunX = VIEW_W * 0.82 - (camX * 0.6) % 40;
  ellipse(ctx, sunX, 74, 34, 34, '#fff3b0');
  ellipse(ctx, sunX, 74, 46, 46, 'rgba(255, 214, 120, 0.35)');

  // Clouds (slow parallax).
  ctx.fillStyle = 'rgba(255, 248, 230, 0.9)';
  for (let i = 0; i < 4; i++) {
    const cx = ((i * 340 + 120 - camX * 1.2) % (VIEW_W + 240) + VIEW_W + 240) % (VIEW_W + 240) - 120;
    const cy = 46 + (i % 3) * 34;
    ellipse(ctx, cx, cy, 44, 15, 'rgba(255,248,230,0.9)');
    ellipse(ctx, cx + 30, cy + 4, 32, 12, 'rgba(255,248,230,0.9)');
    ellipse(ctx, cx - 32, cy + 5, 28, 11, 'rgba(255,248,230,0.9)');
  }

  // Far hills and autumn tree line.
  ctx.fillStyle = '#c97a4a';
  ctx.beginPath();
  ctx.moveTo(0, GROUND_TOP);
  for (let x = 0; x <= VIEW_W; x += 40) {
    const wx = x + camX * 2.2;
    ctx.lineTo(x, GROUND_TOP - 46 - Math.sin(wx * 0.011) * 26 - Math.sin(wx * 0.004) * 14);
  }
  ctx.lineTo(VIEW_W, GROUND_TOP);
  ctx.fill();
  for (let i = 0; i < 9; i++) {
    const seg = Math.floor(camX / 9) + i;
    const r = makeRng(seg * 31 + 7);
    const tx = i * 120 + r.range(0, 50) - ((camX * 2.2) % 120);
    const ty = GROUND_TOP - 52 - Math.sin((tx + camX * 2.2) * 0.011) * 22;
    drawTree(ctx, tx, ty, 0.8 + r.next() * 0.5, r.pick(['#d96f26', '#c8542e', '#e0a13c']));
  }

  // Midground set pieces per stage.
  if (stageId === 'farm') drawFarmSet(ctx, camX);
  else drawBarnSet(ctx, camX);

  // Ground band.
  const g = ctx.createLinearGradient(0, GROUND_TOP, 0, VIEW_H);
  g.addColorStop(0, '#97713f');
  g.addColorStop(0.25, C.dirt);
  g.addColorStop(1, C.dirtDark);
  ctx.fillStyle = g;
  ctx.fillRect(0, GROUND_TOP, VIEW_W, VIEW_H - GROUND_TOP);
  // Grass fringe along the top of the ground.
  ctx.strokeStyle = C.grass;
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let x = 0; x < VIEW_W; x += 14) {
    const off = (camX * 7) % 14;
    ctx.moveTo(x - off, GROUND_TOP + 4);
    ctx.lineTo(x - off + 4, GROUND_TOP - 5 - ((x * 7) % 3));
  }
  ctx.stroke();
  // Dirt strokes scrolling with the world.
  ctx.strokeStyle = 'rgba(60, 35, 15, 0.25)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 26; i++) {
    const seg = Math.floor(camX / 4) + i;
    const r = makeRng(seg * 17 + 3);
    const sx = i * 40 + r.range(0, 22) - ((camX * 7) % 40);
    const sy = GROUND_TOP + 18 + r.next() * (VIEW_H - GROUND_TOP - 30);
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + 12 + r.next() * 14, sy);
    ctx.stroke();
  }
}

function drawTree(ctx, x, y, s, color) {
  ctx.fillStyle = C.woodDark;
  ctx.fillRect(x - 3 * s, y - 26 * s, 6 * s, 28 * s);
  ellipse(ctx, x, y - 40 * s, 22 * s, 18 * s, color);
  ellipse(ctx, x - 16 * s, y - 30 * s, 15 * s, 12 * s, color);
  ellipse(ctx, x + 16 * s, y - 31 * s, 15 * s, 12 * s, color);
}

function drawFarmSet(ctx, camX) {
  // A red barn and a windmill drift by at half speed.
  const segW = 620;
  const seg = Math.floor((camX * 3.5) / segW);
  for (let i = -1; i < 3; i++) {
    const r = makeRng((seg + i) * 91 + 5);
    const bx = (seg + i) * segW - camX * 3.5 + r.range(40, 160);
    if (r.chance(0.55)) drawBarn(ctx, bx, GROUND_TOP - 6, 0.9);
    else drawWindmill(ctx, bx, GROUND_TOP - 6);
  }
  // Fence line along the back of the ground.
  ctx.fillStyle = C.wood;
  const off = (camX * 7 * 0.55) % 46;
  for (let x = -46; x < VIEW_W + 46; x += 46) {
    ctx.fillRect(x - off, GROUND_TOP - 16, 5, 20);
  }
  ctx.fillRect(0, GROUND_TOP - 13, VIEW_W, 4);
  ctx.fillRect(0, GROUND_TOP - 5, VIEW_W, 4);
}

function drawBarn(ctx, x, baseY, s) {
  ctx.fillStyle = C.barnRed;
  ctx.fillRect(x, baseY - 92 * s, 118 * s, 92 * s);
  ctx.fillStyle = '#7e2d21';
  ctx.beginPath();
  ctx.moveTo(x - 8 * s, baseY - 92 * s);
  ctx.lineTo(x + 59 * s, baseY - 132 * s);
  ctx.lineTo(x + 126 * s, baseY - 92 * s);
  ctx.fill();
  ctx.fillStyle = '#fff2d8';
  ctx.fillRect(x + 42 * s, baseY - 62 * s, 34 * s, 62 * s);
  ctx.strokeStyle = '#7e2d21';
  ctx.lineWidth = 3;
  ctx.strokeRect(x + 42 * s, baseY - 62 * s, 34 * s, 62 * s);
  ctx.beginPath();
  ctx.moveTo(x + 42 * s, baseY - 62 * s); ctx.lineTo(x + 76 * s, baseY);
  ctx.moveTo(x + 76 * s, baseY - 62 * s); ctx.lineTo(x + 42 * s, baseY);
  ctx.stroke();
  ctx.fillStyle = '#ffe9bd';
  ctx.fillRect(x + 48 * s, baseY - 112 * s, 22 * s, 20 * s);
}

function drawWindmill(ctx, x, baseY) {
  ctx.strokeStyle = '#8a8f96';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x - 16, baseY); ctx.lineTo(x, baseY - 118); ctx.lineTo(x + 16, baseY);
  ctx.moveTo(x - 9, baseY - 52); ctx.lineTo(x + 9, baseY - 52);
  ctx.stroke();
  ctx.save();
  ctx.translate(x, baseY - 118);
  ctx.strokeStyle = '#6d7278';
  ctx.lineWidth = 3;
  for (let i = 0; i < 4; i++) {
    ctx.rotate(Math.PI / 2);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -30); ctx.lineTo(9, -30); ctx.lineTo(0, -12); ctx.stroke();
  }
  ctx.restore();
}

function drawBarnSet(ctx, camX) {
  // Closer, bigger barnyard pieces: silo, barn end, hay stacks.
  const segW = 540;
  const seg = Math.floor((camX * 3.5) / segW);
  for (let i = -1; i < 3; i++) {
    const r = makeRng((seg + i) * 57 + 11);
    const bx = (seg + i) * segW - camX * 3.5 + r.range(20, 120);
    if (r.chance(0.5)) {
      // Silo.
      ctx.fillStyle = '#b9bdc2';
      ctx.fillRect(bx, GROUND_TOP - 150, 44, 150);
      ellipse(ctx, bx + 22, GROUND_TOP - 150, 22, 10, '#9aa0a6');
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fillRect(bx, GROUND_TOP - 108, 44, 5);
      ctx.fillRect(bx, GROUND_TOP - 62, 44, 5);
    } else {
      drawBarn(ctx, bx, GROUND_TOP - 2, 1.25);
    }
  }
}

function drawKitchenBackdrop(ctx, camX, time) {
  // Wall with wainscot, windows and a shelf of jars.
  ctx.fillStyle = '#8a5a41';
  ctx.fillRect(0, 0, VIEW_W, GROUND_TOP + 4);
  ctx.fillStyle = '#6f452c';
  ctx.fillRect(0, 190, VIEW_W, GROUND_TOP - 190);
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(0, 188, VIEW_W, 4);
  const segW = 300;
  const seg = Math.floor((camX * 3.5) / segW);
  for (let i = -1; i < 5; i++) {
    const r = makeRng((seg + i) * 43 + 2);
    const wx = (seg + i) * segW - camX * 3.5 + 40;
    if (r.chance(0.5)) {
      // Window with gingham curtains and evening light.
      ctx.fillStyle = '#ffd98e';
      ctx.fillRect(wx, 52, 96, 116);
      ctx.fillStyle = '#c8542e';
      ctx.fillRect(wx, 52, 20, 116); ctx.fillRect(wx + 76, 52, 20, 116);
      ctx.fillStyle = '#7a4a26';
      ctx.fillRect(wx - 6, 46, 108, 8); ctx.fillRect(wx - 6, 168, 108, 8);
      ctx.fillRect(wx + 44, 52, 6, 116);
    } else {
      // Shelf with jars and a hanging pan.
      ctx.fillStyle = '#5d3719';
      ctx.fillRect(wx, 120, 130, 8);
      for (let j = 0; j < 3; j++) {
        ctx.fillStyle = ['#d9a441', '#a63d2f', '#7d8f3e'][j];
        ctx.fillRect(wx + 12 + j * 42, 92, 26, 28);
        ctx.fillStyle = '#3a2317';
        ctx.fillRect(wx + 12 + j * 42, 86, 26, 7);
      }
      ellipse(ctx, wx + 165, 108, 17, 20, '#4c4f52');
      ctx.fillRect(wx + 162, 78, 6, 14);
    }
  }
  // Chequered tile floor.
  const tile = 44;
  const off = (camX * 7) % tile;
  for (let row = 0; row < 6; row++) {
    const y = GROUND_TOP + row * tile * 0.72;
    const h = tile * 0.72;
    for (let col = -1; col < VIEW_W / tile + 1; col++) {
      if ((col + row) % 2 === 0) {
        ctx.fillStyle = row % 2 ? '#a9713f' : '#96682f';
        ctx.fillRect(col * tile - off, y, tile, h);
      } else {
        ctx.fillStyle = '#7c5226';
        ctx.fillRect(col * tile - off, y, tile, h);
      }
    }
  }
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.fillRect(0, GROUND_TOP, VIEW_W, 5);
}

// ------------------------------------------------------------------- props
export function drawMud(ctx, sx, zone) {
  const y = groundY(zone.depth + zone.depthH / 2);
  const w = zone.w * 7 * 1.6;
  ellipse(ctx, sx, y, w / 2, 15 * depthScale(zone.depth), '#5d3a1e');
  ellipse(ctx, sx - w * 0.18, y - 3, w * 0.2, 6, 'rgba(200, 160, 110, 0.5)');
}

export function drawObstacle(ctx, ob, sx, time) {
  const s = depthScale(ob.depth);
  const y = groundY(ob.depth + ob.depthH);
  ctx.save();
  ctx.translate(sx, y);
  ctx.scale(s, s);
  // Soft shadow.
  ellipse(ctx, 0, 2, 30, 6, 'rgba(40, 20, 5, 0.3)');
  switch (ob.kind) {
    case 'fence':
      ctx.fillStyle = C.wood;
      ctx.fillRect(-26, -38, 6, 38); ctx.fillRect(20, -38, 6, 38);
      ctx.fillStyle = C.woodDark;
      ctx.fillRect(-30, -32, 62, 6); ctx.fillRect(-30, -16, 62, 6);
      break;
    case 'stump':
      ctx.fillStyle = '#8a5a33';
      ctx.fillRect(-16, -26, 32, 26);
      ellipse(ctx, 0, -26, 16, 6, '#c9a06a');
      ctx.strokeStyle = '#a87f4e'; ctx.lineWidth = 2;
      ellipse(ctx, 0, -26, 9, 3.4, 'rgba(0,0,0,0)');
      ctx.stroke();
      break;
    case 'haybale':
      ellipse(ctx, 0, -22, 27, 23, '#d9a441');
      ctx.strokeStyle = '#b9832e'; ctx.lineWidth = 2.5;
      for (const r of [18, 12, 6]) { ctx.beginPath(); ctx.ellipse(0, -22, r, r * 0.85, 0, 0, Math.PI * 2); ctx.stroke(); }
      break;
    case 'rock':
      ctx.fillStyle = '#8d8d90';
      ctx.beginPath();
      ctx.moveTo(-24, 0); ctx.lineTo(-16, -22); ctx.lineTo(4, -30); ctx.lineTo(24, -12); ctx.lineTo(26, 0);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.beginPath(); ctx.moveTo(-16, -22); ctx.lineTo(4, -30); ctx.lineTo(12, -14); ctx.lineTo(-6, -12); ctx.fill();
      break;
    case 'barrel':
      ctx.fillStyle = '#9a6636';
      ctx.fillRect(-17, -46, 34, 46);
      ctx.fillStyle = '#7c4f27';
      ctx.fillRect(-17, -34, 34, 5); ctx.fillRect(-17, -12, 34, 5);
      ellipse(ctx, 0, -46, 17, 5, '#b9834a');
      break;
    case 'crate':
      ctx.fillStyle = '#b9834a';
      ctx.fillRect(-22, -46, 44, 46);
      ctx.strokeStyle = '#8a5a33'; ctx.lineWidth = 4;
      ctx.strokeRect(-22, -46, 44, 46);
      ctx.beginPath(); ctx.moveTo(-22, -46); ctx.lineTo(22, 0); ctx.moveTo(22, -46); ctx.lineTo(-22, 0); ctx.stroke();
      break;
    case 'trough':
      ctx.fillStyle = '#7a4a26';
      ctx.fillRect(-34, -26, 68, 26);
      ellipse(ctx, 0, -26, 34, 7, '#5b84a6');
      ctx.fillStyle = '#5d3719';
      ctx.fillRect(-34, -8, 68, 4);
      break;
    case 'stool':
      ellipse(ctx, 0, -28, 17, 6, '#a63d2f');
      ctx.fillStyle = '#7a4a26';
      ctx.fillRect(-13, -26, 5, 26); ctx.fillRect(8, -26, 5, 26);
      break;
    case 'pot':
      ctx.fillStyle = '#3f4247';
      ctx.beginPath();
      ctx.moveTo(-20, -34); ctx.lineTo(20, -34); ctx.lineTo(16, 0); ctx.lineTo(-16, 0);
      ctx.fill();
      ellipse(ctx, 0, -36, 21, 6, '#5a5e63');
      ctx.fillStyle = '#2c2e31';
      ctx.fillRect(-4, -44, 8, 7);
      break;
    case 'sack':
      ctx.fillStyle = '#e8dcc0';
      ctx.beginPath();
      ctx.moveTo(-18, 0); ctx.quadraticCurveTo(-24, -30, -6, -34);
      ctx.lineTo(6, -34); ctx.quadraticCurveTo(24, -30, 18, 0);
      ctx.fill();
      ctx.fillStyle = '#c9b98f';
      ctx.fillRect(-7, -38, 14, 6);
      break;
  }
  ctx.restore();
}

export function drawHideZone(ctx, zone, sx, time) {
  const s = depthScale(zone.depth);
  const y = groundY(zone.depth + zone.depthH);
  const w = zone.w * 7 * s;
  ctx.save();
  ctx.translate(sx, y);
  ctx.scale(s, s);
  switch (zone.kind) {
    case 'haystack': {
      ctx.fillStyle = '#d9a441';
      ctx.beginPath();
      ctx.moveTo(-52, 0); ctx.quadraticCurveTo(0, -96, 52, 0);
      ctx.fill();
      ctx.strokeStyle = '#b9832e'; ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(-40 + i * 6, -4);
        ctx.quadraticCurveTo(-10 + i * 8, -52, 8 + i * 7, -70 + i * 5);
        ctx.stroke();
      }
      break;
    }
    case 'cornpatch': {
      for (let i = -2; i <= 2; i++) {
        const ox = i * 16;
        ctx.strokeStyle = '#5f7030'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(ox, 0); ctx.quadraticCurveTo(ox + 4, -50, ox + 1, -92); ctx.stroke();
        ctx.fillStyle = '#7d8f3e';
        for (let j = 0; j < 3; j++) {
          ctx.beginPath();
          ctx.ellipse(ox + (j % 2 ? 9 : -9), -30 - j * 22, 12, 4.5, j % 2 ? 0.5 : -0.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ellipse(ctx, ox + 5, -58, 5, 9, '#f2c14e');
      }
      break;
    }
    case 'barrelcluster': {
      for (const [ox, oy] of [[-26, 0], [8, 0], [-9, -40]]) {
        ctx.fillStyle = '#9a6636';
        ctx.fillRect(ox - 16, oy - 44, 32, 44);
        ctx.fillStyle = '#7c4f27';
        ctx.fillRect(ox - 16, oy - 32, 32, 5); ctx.fillRect(ox - 16, oy - 11, 32, 5);
      }
      break;
    }
    case 'table': {
      // A long kitchen table with a gingham cloth: turkeys hide underneath.
      ctx.fillStyle = '#8a5a33';
      ctx.fillRect(-w / 2, -8, 7, 8 + 34); ctx.fillRect(w / 2 - 7, -8, 7, 8 + 34);
      ctx.fillStyle = '#f3ead2';
      ctx.fillRect(-w / 2 - 6, -52, w + 12, 46);
      ctx.fillStyle = 'rgba(198, 84, 46, 0.55)';
      const cell = 16;
      for (let cx = -w / 2 - 6; cx < w / 2 + 6; cx += cell * 2) ctx.fillRect(cx, -52, cell, 46);
      for (let cy = -52; cy < -6; cy += cell * 2) ctx.fillRect(-w / 2 - 6, cy, w + 12, cell * 0.5);
      ctx.fillStyle = '#fff6e3';
      ctx.fillRect(-w / 2 - 6, -55, w + 12, 5);
      break;
    }
    case 'curtain': {
      ctx.fillStyle = '#5d3719';
      ctx.fillRect(-w / 2 - 8, -118, w + 16, 6);
      ctx.fillStyle = '#c8542e';
      for (let cx = -w / 2; cx < w / 2; cx += 13) {
        ctx.fillRect(cx, -114, 8, 108 + Math.sin(cx * 1.7) * 3);
      }
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      for (let cx = -w / 2 + 8; cx < w / 2; cx += 26) ctx.fillRect(cx, -114, 4, 108);
      break;
    }
  }
  ctx.restore();
}

export function drawOven(ctx, oven, sx, blastState, time) {
  const s = depthScale(oven.depth);
  const y = groundY(oven.depth + oven.depthH);
  ctx.save();
  ctx.translate(sx, y);
  ctx.scale(s, s);
  ellipse(ctx, 0, 3, 40, 7, 'rgba(40, 20, 5, 0.35)');
  // Cast-iron stove body.
  rr(ctx, -34, -78, 68, 78, 7, '#3a3d42');
  rr(ctx, -34, -78, 68, 12, 6, '#54575c');
  ctx.fillStyle = '#2b2d30';
  ctx.fillRect(-6, -112, 12, 36); // chimney pipe
  // Fire door: glows harder as the blast builds.
  const glow = blastState === 'blast' ? 1 : blastState === 'glow' ? 0.55 + Math.sin(time * 14) * 0.2 : 0.25;
  rr(ctx, -20, -58, 40, 40, 5, `rgba(255, ${Math.floor(110 + glow * 90)}, 40, ${0.55 + glow * 0.45})`);
  ctx.strokeStyle = '#17181a'; ctx.lineWidth = 3;
  ctx.strokeRect(-20, -58, 40, 40);
  ctx.beginPath(); ctx.moveTo(-20, -38); ctx.lineTo(20, -38); ctx.stroke();
  ellipse(ctx, 14, -26, 3.5, 3.5, '#17181a');
  ctx.restore();

  // The blast itself: a fan of flame across the oven's depth band.
  if (blastState === 'blast') {
    const bandTop = groundY(oven.depth) - 6;
    const bandBot = groundY(oven.depth + oven.depthH) + 8;
    for (let i = 0; i < 16; i++) {
      const fx = sx - 46 + i * 6.2 + Math.sin(time * 31 + i * 2.1) * 3;
      const fh = (bandBot - bandTop) * (0.75 + 0.25 * Math.sin(time * 23 + i * 1.3));
      const grad = ctx.createLinearGradient(0, bandBot, 0, bandBot - fh);
      grad.addColorStop(0, 'rgba(230, 90, 30, 0.95)');
      grad.addColorStop(1, 'rgba(255, 196, 64, 0.15)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(fx - 6, bandBot);
      ctx.lineTo(fx, bandBot - fh);
      ctx.lineTo(fx + 6, bandBot);
      ctx.fill();
    }
  } else if (blastState === 'glow') {
    ctx.fillStyle = 'rgba(255, 140, 50, 0.16)';
    ctx.fillRect(sx - 48, groundY(oven.depth) - 4, 96, groundY(oven.depth + oven.depthH) - groundY(oven.depth) + 10);
  }
}

export function drawDropKnife(ctx, knife, sx) {
  const y = groundY(knife.depth);
  const topY = y - 168 + knife.fallY;
  // Ground shadow where it will land.
  ellipse(ctx, sx, y, 14, 4, 'rgba(40,20,5,0.3)');
  ctx.strokeStyle = 'rgba(60, 40, 20, 0.6)';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(sx, y - 196 + knife.fallY * 0); ctx.lineTo(sx, topY - 16); ctx.stroke();
  ctx.save();
  ctx.translate(sx, topY);
  drawKnifeShape(ctx, 0.9);
  ctx.restore();
}

export function drawKnifeShape(ctx, s) {
  ctx.save();
  ctx.scale(s, s);
  // Blade pointing down, handle up.
  ctx.fillStyle = '#cfd4d9';
  ctx.beginPath();
  ctx.moveTo(-4, -14); ctx.lineTo(6, -14); ctx.lineTo(6, 8); ctx.quadraticCurveTo(6, 20, -2, 24);
  ctx.quadraticCurveTo(-4, 12, -4, 0);
  ctx.fill();
  ctx.fillStyle = '#7a4a26';
  rr(ctx, -5, -30, 12, 17, 4, '#7a4a26');
  ctx.restore();
}

export function drawPickup(ctx, pickup, sx, time) {
  const s = depthScale(pickup.depth);
  const y = groundY(pickup.depth) - 16 * s + Math.sin(time * 3 + pickup.bob) * 3;
  ctx.save();
  ctx.translate(sx, y);
  ctx.scale(s, s);
  if (pickup.kind === 'golden') {
    ellipse(ctx, 0, 0, 20, 20, 'rgba(255, 205, 70, 0.35)');
  }
  if (pickup.kind === 'pumpkin') {
    ellipse(ctx, 0, 2, 15, 12, '#d96f26');
    ctx.strokeStyle = '#b3541a'; ctx.lineWidth = 2;
    for (const off of [-8, 0, 8]) { ctx.beginPath(); ctx.ellipse(off * 0.6, 2, 6, 11, 0, 0, Math.PI * 2); ctx.stroke(); }
    ctx.fillStyle = '#5f7030';
    ctx.fillRect(-2, -13, 5, 6);
  } else {
    // Corn cob at a jaunty angle.
    ctx.rotate(-0.5);
    ellipse(ctx, 0, 0, 7, 14, pickup.kind === 'golden' ? '#ffd94d' : '#f2c14e');
    ctx.strokeStyle = 'rgba(160, 110, 20, 0.6)'; ctx.lineWidth = 1.4;
    for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(-6, i * 5); ctx.lineTo(6, i * 5); ctx.stroke(); }
    ctx.fillStyle = '#7d8f3e';
    ctx.beginPath(); ctx.moveTo(-4, 10); ctx.quadraticCurveTo(-14, 20, -4, 22); ctx.quadraticCurveTo(-1, 14, 2, 11); ctx.fill();
  }
  ctx.restore();
}

export function drawDecoration(ctx, deco, sx) {
  const s = depthScale(deco.depth) * 0.8;
  const y = groundY(deco.depth);
  ctx.save();
  ctx.translate(sx, y);
  ctx.scale(s, s);
  if (deco.kind === 'pumpkin') {
    ellipse(ctx, 0, -6, 13, 10, '#d96f26');
    ctx.fillStyle = '#5f7030'; ctx.fillRect(-2, -18, 4, 5);
  } else if (deco.kind === 'leaves') {
    ctx.fillStyle = '#c8542e';
    for (const [ox, oy, r] of [[-8, -2, 0.4], [4, -3, 0.9], [10, -1, 0.2], [-2, -4, 1.4]]) {
      ctx.save(); ctx.translate(ox, oy); ctx.rotate(r); ctx.fillRect(-6, -2, 12, 4); ctx.restore();
    }
  } else if (deco.kind === 'sunflower') {
    ctx.strokeStyle = '#5f7030'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(1, -34); ctx.stroke();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ellipse(ctx, Math.cos(a) * 9, -38 + Math.sin(a) * 9, 5, 5, '#f2b33d');
    }
    ellipse(ctx, 0, -38, 7, 7, '#5d3719');
  } else {
    ctx.strokeStyle = '#6d7f36'; ctx.lineWidth = 2;
    for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 5, 0); ctx.lineTo(i * 5 + 3, -12 - Math.abs(i)); ctx.stroke(); }
  }
  ctx.restore();
}

// ------------------------------------------------------------------ actors
export function drawTurkey(ctx, t, sx, time) {
  const s = depthScale(t.depth);
  const y = groundY(t.depth) - t.jumpZ * s;
  ctx.save();
  ctx.translate(sx, y);
  ctx.scale(s, s);
  if (t.invulnT > 0 && Math.floor(time * 14) % 2 === 0) ctx.globalAlpha = 0.45;

  const run = t.jumpZ === 0 && !t.ducking;
  const legSwing = run ? Math.sin(t.animT * 6) * 9 : 0;
  // Legs.
  ctx.strokeStyle = '#d9a441';
  ctx.lineWidth = 3.4;
  if (t.jumpZ > 0) {
    ctx.beginPath(); ctx.moveTo(-4, -14); ctx.lineTo(-10, -2); ctx.moveTo(6, -14); ctx.lineTo(12, -4); ctx.stroke();
  } else if (t.ducking) {
    ctx.beginPath(); ctx.moveTo(-4, -10); ctx.lineTo(-8, 0); ctx.moveTo(6, -10); ctx.lineTo(10, 0); ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(-4, -15); ctx.lineTo(-4 + legSwing, 0);
    ctx.moveTo(6, -15); ctx.lineTo(6 - legSwing, 0);
    ctx.stroke();
  }

  const bodyY = t.ducking ? -20 : -27;
  // Tail fan.
  ctx.save();
  ctx.translate(-20, bodyY + 2);
  ctx.rotate(-0.5 + Math.sin(t.animT * 3) * 0.05);
  for (let i = -2; i <= 2; i++) {
    ctx.save();
    ctx.rotate(i * 0.26);
    ellipse(ctx, -13, 0, 15, 5.5, i % 2 ? '#8a5a33' : '#a5713d');
    ellipse(ctx, -24, 0, 5, 4, '#d96f26');
    ctx.restore();
  }
  ctx.restore();
  // Body.
  ellipse(ctx, 0, bodyY, 24, 16, '#96683c');
  ellipse(ctx, 2, bodyY + 3, 20, 12, '#a97a46');
  // Wing.
  ellipse(ctx, -2, bodyY + 1, 13, 8.5, '#7c5226');
  ctx.strokeStyle = 'rgba(60,35,15,0.5)'; ctx.lineWidth = 1.6;
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-11, bodyY - 2 + i * 4); ctx.quadraticCurveTo(-2, bodyY + 2 + i * 4, 8, bodyY - 1 + i * 4); ctx.stroke(); }
  // Neck and head.
  const headX = 20, headY = bodyY - (t.ducking ? 6 : 13);
  ctx.strokeStyle = '#96683c'; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.moveTo(14, bodyY - 4); ctx.quadraticCurveTo(19, bodyY - 10, headX, headY + 4); ctx.stroke();
  ellipse(ctx, headX, headY, 9.5, 8.5, '#8fa3b8');
  ellipse(ctx, headX + 2, headY - 2, 6, 5.5, '#a9bccd');
  // Wattle and snood.
  ellipse(ctx, headX + 6, headY + 6, 3.4, 5.5, '#c23b2e');
  ctx.fillStyle = '#c23b2e';
  ctx.beginPath(); ctx.ellipse(headX + 8, headY - 4, 2.4, 5, 0.5, 0, Math.PI * 2); ctx.fill();
  // Beak.
  ctx.fillStyle = '#f2b33d';
  ctx.beginPath(); ctx.moveTo(headX + 8, headY - 1); ctx.lineTo(headX + 17, headY + 1.5); ctx.lineTo(headX + 8, headY + 4); ctx.fill();
  // Eye (wide, determined) — wider still, with a sweat drop, when panicking.
  const panic = t.panic ? 1.45 : 1;
  ellipse(ctx, headX + 3, headY - 2, 2.2 * panic, 2.6 * panic, '#1d130b');
  ellipse(ctx, headX + 3.8, headY - 3, 0.8, 0.9, '#fff');
  if (t.panic) {
    ctx.fillStyle = '#9fd4e8';
    ctx.beginPath();
    ctx.ellipse(headX - 3, headY - 9 + Math.sin(time * 10) * 1.5, 2.2, 3.4, 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Ground shadow, drawn unscaled at the true ground line.
  const gy = groundY(t.depth);
  ellipse(ctx, sx, gy + 3, 24 * s, 5.5 * s, 'rgba(40, 20, 5, 0.3)');
}

export function drawFarmer(ctx, f, sx, time) {
  const s = depthScale(f.depth ?? 0.52) * 1.06;
  const y = groundY(f.depth ?? 0.52);
  ctx.save();
  ctx.translate(sx, y);
  ctx.scale(s, s);
  const running = f.state === 'chase';
  const swing = Math.sin(f.animT * (running ? 7 : 3.4)) * (running ? 10 : 5);
  const hop = f.hopT > 0 ? -Math.sin((0.5 - f.hopT) / 0.5 * Math.PI) * 16 : 0;
  ctx.translate(0, hop);

  // Legs in overalls.
  ctx.strokeStyle = '#3d5a80'; ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(-3, -34); ctx.lineTo(-3 + swing, -2);
  ctx.moveTo(5, -34); ctx.lineTo(5 - swing, -2);
  ctx.stroke();
  // Boots.
  ctx.fillStyle = '#4a2f18';
  ctx.fillRect(-8 + swing, -5, 11, 5); ctx.fillRect(0 - swing, -5, 11, 5);
  // Torso: overalls over a plaid shirt.
  rr(ctx, -13, -66, 26, 34, 4, '#3d5a80');
  ctx.fillStyle = '#b3402f';
  ctx.fillRect(-16, -70, 32, 12);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(-16, -64); ctx.lineTo(16, -64); ctx.moveTo(-8, -70); ctx.lineTo(-8, -58); ctx.moveTo(6, -70); ctx.lineTo(6, -58); ctx.stroke();
  // Arms: the rear arm swings; the front arm holds a carving fork, raised to throw.
  ctx.strokeStyle = '#b3402f'; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(-11, -64); ctx.lineTo(-16, -44 + swing * 0.7); ctx.stroke();
  if (f.telegraphT > 0) {
    ctx.beginPath(); ctx.moveTo(11, -64); ctx.lineTo(24, -84); ctx.stroke();
    ctx.save(); ctx.translate(27, -88); ctx.rotate(0.7); drawKnifeShape(ctx, 0.85); ctx.restore();
  } else {
    ctx.beginPath(); ctx.moveTo(11, -64); ctx.lineTo(17, -44 - swing * 0.7); ctx.stroke();
    // Carving fork in hand.
    ctx.strokeStyle = '#cfd4d9'; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(17, -44 - swing * 0.7); ctx.lineTo(23, -30 - swing * 0.7);
    ctx.moveTo(23, -30 - swing * 0.7); ctx.lineTo(20, -24 - swing * 0.7);
    ctx.moveTo(23, -30 - swing * 0.7); ctx.lineTo(26, -24 - swing * 0.7); ctx.stroke();
  }
  // Head, straw hat, moustache.
  ellipse(ctx, 1, -76, 10.5, 11, '#e8b58a');
  ctx.fillStyle = '#5d4037';
  ctx.fillRect(-4, -70, 12, 3.4);
  ellipse(ctx, 5, -79, 1.8, 2.2, '#1d130b');
  ctx.fillStyle = '#e5c15c';
  ctx.beginPath(); ctx.ellipse(1, -85, 19, 4.6, 0, 0, Math.PI * 2); ctx.fill();
  rr(ctx, -8, -97, 18, 10, 3, '#e5c15c');
  ctx.restore();

  ellipse(ctx, sx, y + 3, 22 * s, 5 * s, 'rgba(40, 20, 5, 0.3)');

  // State marks.
  ctx.font = 'bold 26px Georgia, serif';
  ctx.textAlign = 'center';
  if (f.state === 'search') {
    ctx.fillStyle = '#fff6e3';
    ctx.fillText('?', sx + Math.sin(time * 2.2) * 6, y - 118 * s + Math.sin(time * 3) * 3);
  }
}

// ------------------------------------------------------- signature hazards
export function drawTractor(ctx, tractor, sx, time) {
  const s = depthScale(tractor.depth);
  const y = groundY(tractor.depth + 0.24);
  ctx.save();
  ctx.translate(sx, y);
  ctx.scale(s, s);
  ellipse(ctx, 0, 3, 62, 8, 'rgba(40, 20, 5, 0.3)');
  const dir = tractor.dir >= 0 ? 1 : -1;
  ctx.scale(dir, 1);
  // Exhaust puffs.
  ctx.fillStyle = 'rgba(240, 235, 225, 0.5)';
  for (let i = 0; i < 3; i++) {
    const px = -26 + Math.sin(time * 2 + i) * 2;
    const py = -86 - ((time * 22 + i * 14) % 34);
    ellipse(ctx, px, py, 5 + i * 2.4, 4 + i * 1.8, 'rgba(240,235,225,0.4)');
  }
  // Big rear wheel, small front wheel.
  const spin = time * 3.2 * dir;
  for (const [wx, wr] of [[-30, 21], [30, 12.5]]) {
    ellipse(ctx, wx, -wr + 2, wr, wr, '#2e2a26');
    ellipse(ctx, wx, -wr + 2, wr * 0.45, wr * 0.45, '#8a8f96');
    ctx.strokeStyle = '#57534e'; ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      const a = spin + (i * Math.PI) / 3;
      ctx.beginPath();
      ctx.moveTo(wx - Math.cos(a) * wr * 0.8, -wr + 2 - Math.sin(a) * wr * 0.8);
      ctx.lineTo(wx + Math.cos(a) * wr * 0.8, -wr + 2 + Math.sin(a) * wr * 0.8);
      ctx.stroke();
    }
  }
  // Body: bonnet, cab, driver silhouette.
  rr(ctx, -6, -52, 48, 26, 4, '#b3402f');
  rr(ctx, -38, -78, 34, 52, 4, '#a63d2f');
  ctx.fillStyle = '#ffd98e';
  ctx.fillRect(-33, -72, 24, 18);
  ellipse(ctx, -21, -62, 6, 7, '#3a2317'); // the driver's head
  ctx.fillStyle = '#7e2d21';
  ctx.fillRect(-40, -80, 38, 5);
  ctx.fillStyle = '#2e2a26';
  ctx.fillRect(-30, -88, 5, 12); // exhaust stack
  ctx.restore();
}

export function drawRollingBarrel(ctx, roller, sx, time) {
  const s = depthScale(roller.depth);
  const y = groundY(roller.depth + 0.22);
  ctx.save();
  ctx.translate(sx, y);
  ctx.scale(s, s);
  ellipse(ctx, 0, 3, 24, 5.5, 'rgba(40, 20, 5, 0.3)');
  ctx.translate(0, -23);
  ctx.rotate(roller.rollX * 0.55);
  ctx.fillStyle = '#9a6636';
  ctx.beginPath(); ctx.ellipse(0, 0, 21, 23, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#7c4f27'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.ellipse(0, 0, 21, 23, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-21, 0); ctx.lineTo(21, 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -23); ctx.lineTo(0, 23); ctx.stroke();
  ellipse(ctx, 0, 0, 5, 5, '#7c4f27');
  ctx.restore();
}
