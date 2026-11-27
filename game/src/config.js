// config.js — tuning constants and the stage table for The Great Gobble Escape.
// Everything gameplay-shaping lives here so the other modules stay mechanical.

export const VIEW_W = 960;
export const VIEW_H = 540;

// The ground is a band the turkey can roam in depth: y grows toward the viewer.
export const GROUND_TOP = 318;
export const GROUND_BOTTOM = 508;
export const PX_PER_METER = 7;

export const FINISH_DISTANCE = 1500; // metres to the Freedom Forest gate
export const START_LIVES = 3;

// The three stages, in order. Speeds are metres per second.
export const STAGES = [
  {
    id: 'farm',
    name: 'MAPLEWOOD FARM',
    sub: 'Stage 1 · The Farmyard',
    from: 0,
    to: 500,
    turkeySpeed: 7.6,
    farmerSpeed: 7.9,
    knifeEvery: 0, // the farmer throws no knives yet
  },
  {
    id: 'barn',
    name: 'THE OLD BARNYARD',
    sub: 'Stage 2 · Barrels & Crates',
    from: 500,
    to: 1000,
    turkeySpeed: 8.6,
    farmerSpeed: 9.0,
    knifeEvery: 6.5, // seconds between thrown carving knives
  },
  {
    id: 'kitchen',
    name: 'THE FARMHOUSE KITCHEN',
    sub: 'Stage 3 · Ovens & Knives',
    from: 1000,
    to: 1500,
    turkeySpeed: 9.6,
    farmerSpeed: 10.1,
    knifeEvery: 5.2,
  },
];

export function stageAt(distance) {
  for (const stage of STAGES) if (distance < stage.to) return stage;
  return STAGES[STAGES.length - 1];
}

// Autumn palette shared by every drawing routine.
export const COLORS = {
  ink: '#3a2317',
  paper: '#fff6e3',
  cream: '#ffe9bd',
  orange: '#e07b39',
  pumpkin: '#d96f26',
  red: '#a63d2f',
  barnRed: '#9c3a2d',
  gold: '#f2b33d',
  leaf: '#c8542e',
  grass: '#7d8f3e',
  grassDark: '#5f7030',
  dirt: '#8a5a33',
  dirtDark: '#6f4525',
  sky: '#ffd98e',
  skyLow: '#ff9e6b',
  wood: '#7a4a26',
  woodDark: '#5d3719',
};
