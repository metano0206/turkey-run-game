// input.js — keyboard state and pointer position for menus.
// Movement keys: arrows / WASD. Jump: Space. Duck & hide: Shift or C.
// Pause: P or Esc. Mute: M. Confirm: Enter.

const DOWN_KEYS = new Set();
const PRESSED_KEYS = new Set();
const POINTER = { x: 0, y: 0, clicked: false };

const TRACKED = new Set([
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space',
  'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyC', 'ShiftLeft', 'ShiftRight',
  'KeyP', 'KeyM', 'Enter', 'Escape',
]);

export function installInput(canvas) {
  addEventListener('keydown', (e) => {
    if (TRACKED.has(e.code)) e.preventDefault();
    if (!e.repeat) PRESSED_KEYS.add(e.code);
    DOWN_KEYS.add(e.code);
  });
  addEventListener('keyup', (e) => DOWN_KEYS.delete(e.code));
  addEventListener('blur', () => DOWN_KEYS.clear());

  const toGame = (e) => {
    const rect = canvas.getBoundingClientRect();
    POINTER.x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    POINTER.y = ((e.clientY - rect.top) / rect.height) * canvas.height;
  };
  canvas.addEventListener('pointermove', toGame);
  canvas.addEventListener('pointerdown', (e) => { toGame(e); POINTER.clicked = true; });
}

export const keys = {
  up: () => DOWN_KEYS.has('ArrowUp') || DOWN_KEYS.has('KeyW'),
  down: () => DOWN_KEYS.has('ArrowDown') || DOWN_KEYS.has('KeyS'),
  left: () => DOWN_KEYS.has('ArrowLeft') || DOWN_KEYS.has('KeyA'),
  right: () => DOWN_KEYS.has('ArrowRight') || DOWN_KEYS.has('KeyD'),
  jump: () => DOWN_KEYS.has('Space'),
  duck: () => DOWN_KEYS.has('ShiftLeft') || DOWN_KEYS.has('ShiftRight') || DOWN_KEYS.has('KeyC'),
  pressed: (code) => PRESSED_KEYS.has(code),
  pointer: POINTER,
};

// Called once per frame after the game has read the one-shot inputs.
export function endInputFrame() {
  PRESSED_KEYS.clear();
  POINTER.clicked = false;
}
