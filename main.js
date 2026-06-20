const arena = document.getElementById('arena');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const arenaComposite = document.getElementById('arenaComposite');
const arenaControlsRight = document.querySelector('.arena-controls--right');
const arenaControlsBottom = document.querySelector('.arena-controls--bottom');
const shrinkArenaBtnRight = arenaControlsRight.querySelector('.arena-size-btn--minus');
const addArenaBtnRight = arenaControlsRight.querySelector('.arena-size-btn--plus');
const shrinkArenaBtnBottom = arenaControlsBottom.querySelector('.arena-size-btn--minus');
const addArenaBtnBottom = arenaControlsBottom.querySelector('.arena-size-btn--plus');
const ballCountInput = document.getElementById('ballCount');
const ballCountDisplay = document.getElementById('ballCountDisplay');
const areaValue = document.getElementById('areaValue');
const densityValue = document.getElementById('densityValue');
const resetBtn = document.getElementById('resetBtn');

const BALL_RADIUS = 4;
const SPEED = 5;
const MAX_BALLS = 90;
const MIN_ARENA_SIZE = 100;
const MIN_AREA_CM2 = 1;
const MAX_AREA_CM2 = 36;
const DEFAULT_AREA_CM2 = 4;
const DEFAULT_BALL_COUNT = 4;
const MAX_SIDE_CM = Math.sqrt(MAX_AREA_CM2);
const MAX_CONTENT_SIZE = MIN_ARENA_SIZE * Math.sqrt(MAX_AREA_CM2 / MIN_AREA_CM2);
const START_PATTERN_COUNT = 10;

let balls = [];
let ballCount = Number(ballCountInput.value) || DEFAULT_BALL_COUNT;
let squareCount = 1;
let rowCount = 1;
let cellSize = MIN_ARENA_SIZE * Math.sqrt(DEFAULT_AREA_CM2 / MIN_AREA_CM2);
let dragState = null;
let areaCm2 = 0;
let width = 0;
let height = 0;
let lastStartPatternIndex = -1;
let currentStartPatternIndex = 0;

function getBorderSumPx() {
  const s = getComputedStyle(arena);
  const bx = (Number.parseFloat(s.borderLeftWidth) || 0) + (Number.parseFloat(s.borderRightWidth) || 0);
  const by = (Number.parseFloat(s.borderTopWidth) || 0) + (Number.parseFloat(s.borderBottomWidth) || 0);
  return { bx, by };
}

function getMaxAreaCm2() {
  const maxFromWidth = (MAX_SIDE_CM / squareCount) ** 2;
  const maxFromHeight = (MAX_SIDE_CM / rowCount) ** 2;
  const maxFromDimensions = Math.min(maxFromWidth, maxFromHeight);
  return Math.min(MAX_AREA_CM2, Math.max(MIN_AREA_CM2, Math.floor(maxFromDimensions)));
}

function getMaxCellSize() {
  const maxFromDimensions = MIN_ARENA_SIZE * Math.sqrt(getMaxAreaCm2() / MIN_AREA_CM2);
  return Math.min(
    (window.innerWidth - 360) / squareCount,
    (window.innerHeight - 80) / rowCount,
    maxFromDimensions
  );
}

function getTotalWidth() {
  return cellSize * squareCount;
}

function getTotalHeight() {
  return cellSize * rowCount;
}

function getTotalAreaCm2() {
  return areaCm2 * squareCount * rowCount;
}

function getDensity() {
  const totalArea = getTotalAreaCm2();
  if (!totalArea) return 0;
  return balls.length / totalArea;
}

function ballWord(count) {
  if (!Number.isInteger(count)) return 'míčku';

  const n = Math.abs(count);
  const last = n % 10;
  const lastTwo = n % 100;

  if (count === 1) return 'míček';
  if (lastTwo >= 11 && lastTwo <= 14) return 'míčků';
  if (last >= 2 && last <= 4) return 'míčky';
  return 'míčků';
}

function formatDensityText(value) {
  const rounded = Math.round(value * 100) / 100;
  const number = rounded.toFixed(2).replace(/\.?0+$/, '').replace('.', ',');
  return `${number} ${ballWord(rounded)} na cm²`;
}

function getSideLengthCm() {
  return Math.sqrt(areaCm2);
}

function canDuplicateHorizontally() {
  const nextSquareCount = squareCount * 2;
  const side = getSideLengthCm();
  return (
    side <= MAX_SIDE_CM &&
    nextSquareCount * side <= MAX_SIDE_CM
  );
}

function canDuplicateVertically() {
  const nextRowCount = rowCount * 2;
  const side = getSideLengthCm();
  return (
    side <= MAX_SIDE_CM &&
    nextRowCount * side <= MAX_SIDE_CM
  );
}

function canShrinkHorizontally() {
  return squareCount >= 2;
}

function canShrinkVertically() {
  return rowCount >= 2;
}

function updateSizeButtons() {
  const horizontalExpandAllowed = canDuplicateHorizontally();
  const verticalExpandAllowed = canDuplicateVertically();
  const horizontalShrinkAllowed = canShrinkHorizontally();
  const verticalShrinkAllowed = canShrinkVertically();

  addArenaBtnRight.disabled = !horizontalExpandAllowed;
  addArenaBtnRight.title = horizontalExpandAllowed
    ? 'Zkopírovat plochu vpravo'
    : 'Nelze zkopírovat — celková plocha by měla stranu delší než 6 cm';

  shrinkArenaBtnRight.disabled = !horizontalShrinkAllowed;
  shrinkArenaBtnRight.title = horizontalShrinkAllowed
    ? 'Zmenšit plochu vpravo'
    : 'Nelze zmenšit — zbývá jen jeden sloupec čtverců';

  addArenaBtnBottom.disabled = !verticalExpandAllowed;
  addArenaBtnBottom.title = verticalExpandAllowed
    ? 'Zkopírovat plochu dolů'
    : 'Nelze zkopírovat — celková plocha by měla stranu delší než 6 cm';

  shrinkArenaBtnBottom.disabled = !verticalShrinkAllowed;
  shrinkArenaBtnBottom.title = verticalShrinkAllowed
    ? 'Zmenšit plochu dolů'
    : 'Nelze zmenšit — zbývá jen jeden řádek čtverců';
}

function updateStats() {
  ballCountDisplay.textContent = String(balls.length);
  areaValue.textContent = getTotalAreaCm2() ? `${getTotalAreaCm2()} cm²` : '—';
  densityValue.textContent = getTotalAreaCm2()
    ? formatDensityText(getDensity())
    : '—';
  updateSizeButtons();
}

function colorsForIndex(index) {
  const hue = (index * 137.508) % 360;
  return [
    `hsl(${hue} 92% 72%)`,
    `hsl(${hue} 86% 52%)`,
    `hsl(${hue} 86% 34%)`,
  ];
}

function pickStartPatternIndex() {
  let index = Math.floor(Math.random() * START_PATTERN_COUNT);
  if (START_PATTERN_COUNT > 1) {
    while (index === lastStartPatternIndex) {
      index = Math.floor(Math.random() * START_PATTERN_COUNT);
    }
  }
  lastStartPatternIndex = index;
  currentStartPatternIndex = index;
  return index;
}

function getStartAngle(index, count, patternIndex = currentStartPatternIndex) {
  const patternRotation = (Math.PI * 2 * patternIndex) / START_PATTERN_COUNT;
  return (Math.PI * 2 * index) / Math.max(count, 1) + patternRotation;
}

function setBallVelocity(ball, index, count, patternIndex = currentStartPatternIndex) {
  const angle = getStartAngle(index, count, patternIndex);
  ball.vx = Math.cos(angle) * SPEED;
  ball.vy = Math.sin(angle) * SPEED;
}

function applyStartVelocities(ballList) {
  const count = ballList.length;
  ballList.forEach((ball, index) => setBallVelocity(ball, index, count));
}

function createBall(index, count) {
  const ball = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    radius: BALL_RADIUS,
    colors: colorsForIndex(index),
  };
  setBallVelocity(ball, index, count);
  return ball;
}

function cloneBall(ball) {
  return {
    x: ball.x,
    y: ball.y,
    vx: ball.vx,
    vy: ball.vy,
    radius: ball.radius,
    colors: [...ball.colors],
  };
}

function normalizeSpeed(ball) {
  const speed = Math.hypot(ball.vx, ball.vy) || 1;
  ball.vx = (ball.vx / speed) * SPEED;
  ball.vy = (ball.vy / speed) * SPEED;
}

function layoutSquareBalls(squareCol, squareRow) {
  const margin = BALL_RADIUS * 3;
  const cols = Math.min(4, Math.max(1, Math.ceil(Math.sqrt(ballCount))));
  const gridRows = Math.ceil(ballCount / cols);
  const offsetX = squareCol * cellSize;
  const offsetY = squareRow * cellSize;
  const newBalls = [];

  for (let i = 0; i < ballCount; i++) {
    const ballCol = i % cols;
    const ballRow = Math.floor(i / cols);
    const ball = createBall(i, ballCount);
    ball.x = offsetX + margin + ballCol * (cellSize - 2 * margin) / Math.max(cols - 1, 1);
    ball.y = offsetY + margin + ballRow * (cellSize - 2 * margin) / Math.max(gridRows - 1, 1);
    normalizeSpeed(ball);
    newBalls.push(ball);
  }

  return newBalls;
}

function layoutAllSquares() {
  pickStartPatternIndex();
  balls = [];
  for (let row = 0; row < rowCount; row++) {
    for (let col = 0; col < squareCount; col++) {
      balls.push(...layoutSquareBalls(col, row));
    }
  }
}

function clampBalls() {
  const totalWidth = getTotalWidth();
  const totalHeight = getTotalHeight();
  const r = BALL_RADIUS;

  balls.forEach((ball) => {
    ball.x = Math.max(r, Math.min(totalWidth - r, ball.x));
    ball.y = Math.max(r, Math.min(totalHeight - r, ball.y));
  });
}

function syncCanvas() {
  const { bx, by } = getBorderSumPx();
  const contentWidth = getTotalWidth();
  const contentHeight = getTotalHeight();
  arena.style.width = `${contentWidth + bx}px`;
  arena.style.height = `${contentHeight + by}px`;
  width = canvas.width = arena.clientWidth;
  height = canvas.height = arena.clientHeight;
  clampBalls();
  updateStats();
}

function setCellSize(size) {
  const maxArea = getMaxAreaCm2();
  const clampedPx = Math.max(MIN_ARENA_SIZE, Math.min(getMaxCellSize(), size));
  const rawArea = (clampedPx / MIN_ARENA_SIZE) ** 2 * MIN_AREA_CM2;
  const snappedArea = Math.max(MIN_AREA_CM2, Math.min(maxArea, Math.round(rawArea)));
  areaCm2 = snappedArea;
  cellSize = MIN_ARENA_SIZE * Math.sqrt(snappedArea / MIN_AREA_CM2);
  syncCanvas();
}

function duplicateHorizontally() {
  if (!canDuplicateHorizontally()) return;

  const oldCellSize = cellSize;
  const oldSquareCount = squareCount;
  const snapshots = balls.map((ball) => ({
    localX: ball.x,
    localY: ball.y,
    data: cloneBall(ball),
  }));

  squareCount *= 2;
  setCellSize(cellSize);

  const scale = oldCellSize ? cellSize / oldCellSize : 1;
  balls.forEach((ball) => {
    ball.x *= scale;
    ball.y *= scale;
  });

  const offsetX = oldSquareCount * cellSize;
  const newBalls = [];
  snapshots.forEach(({ localX, localY, data }) => {
    newBalls.push({
      ...data,
      x: localX * scale + offsetX,
      y: localY * scale,
    });
  });
  balls.push(...newBalls);
  pickStartPatternIndex();
  applyStartVelocities(newBalls);

  clampBalls();
  updateStats();
}

function duplicateVertically() {
  if (!canDuplicateVertically()) return;

  const oldCellSize = cellSize;
  const oldRowCount = rowCount;
  const snapshots = balls.map((ball) => ({
    localX: ball.x,
    localY: ball.y,
    data: cloneBall(ball),
  }));

  rowCount *= 2;
  setCellSize(cellSize);

  const scale = oldCellSize ? cellSize / oldCellSize : 1;
  balls.forEach((ball) => {
    ball.x *= scale;
    ball.y *= scale;
  });

  const offsetY = oldRowCount * cellSize;
  const newBalls = [];
  snapshots.forEach(({ localX, localY, data }) => {
    newBalls.push({
      ...data,
      x: localX * scale,
      y: localY * scale + offsetY,
    });
  });
  balls.push(...newBalls);
  pickStartPatternIndex();
  applyStartVelocities(newBalls);

  clampBalls();
  updateStats();
}

function removeHalfOfBalls() {
  balls = balls.slice(0, Math.floor(balls.length / 2));
}

function shrinkHorizontally() {
  if (!canShrinkHorizontally()) return;

  const oldCellSize = cellSize;
  removeHalfOfBalls();

  squareCount /= 2;
  setCellSize(cellSize);

  const scale = oldCellSize ? cellSize / oldCellSize : 1;
  if (scale !== 1) {
    balls.forEach((ball) => {
      ball.x *= scale;
      ball.y *= scale;
    });
  }

  clampBalls();
  updateStats();
}

function shrinkVertically() {
  if (!canShrinkVertically()) return;

  const oldCellSize = cellSize;
  removeHalfOfBalls();

  rowCount /= 2;
  setCellSize(cellSize);

  const scale = oldCellSize ? cellSize / oldCellSize : 1;
  if (scale !== 1) {
    balls.forEach((ball) => {
      ball.x *= scale;
      ball.y *= scale;
    });
  }

  clampBalls();
  updateStats();
}

function resizeDelta(edge, dx, dy) {
  if (edge === 'e') return dx;
  if (edge === 'w') return -dx;
  if (edge === 's') return dy;
  if (edge === 'n') return -dy;
  return 0;
}

function startResize(e, handle) {
  e.preventDefault();
  handle.setPointerCapture(e.pointerId);
  dragState = {
    edge: handle.dataset.edge,
    startX: e.clientX,
    startY: e.clientY,
    startSize: cellSize,
    handle,
  };
  handle.classList.add('active');
}

function moveResize(e) {
  if (!dragState) return;
  const delta = resizeDelta(
    dragState.edge,
    e.clientX - dragState.startX,
    e.clientY - dragState.startY
  );
  setCellSize(dragState.startSize + delta);
}

function stopResize(e) {
  if (!dragState) return;
  if (e && dragState.handle.hasPointerCapture(e.pointerId)) {
    dragState.handle.releasePointerCapture(e.pointerId);
  }
  dragState.handle.classList.remove('active');
  dragState = null;
}

arenaComposite.querySelectorAll('.resize-handle').forEach((handle) => {
  handle.addEventListener('pointerdown', (e) => startResize(e, handle));
});

window.addEventListener('pointermove', moveResize);
window.addEventListener('pointerup', stopResize);
window.addEventListener('pointercancel', stopResize);

function drawBall(ball) {
  const { x, y, radius, colors } = ball;
  const gradient = ctx.createRadialGradient(
    x - radius * 0.35, y - radius * 0.35, radius * 0.1,
    x, y, radius
  );
  gradient.addColorStop(0, colors[0]);
  gradient.addColorStop(0.5, colors[1]);
  gradient.addColorStop(1, colors[2]);

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(x - radius * 0.3, y - radius * 0.3, radius * 0.25, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawSquareDividers() {
  const totalWidth = getTotalWidth();
  const totalHeight = getTotalHeight();
  if (squareCount <= 1 && rowCount <= 1) return;

  ctx.strokeStyle = 'rgba(88, 166, 255, 0.35)';
  ctx.lineWidth = 2;

  for (let i = 1; i < squareCount; i++) {
    const x = i * cellSize;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, totalHeight);
    ctx.stroke();
  }

  for (let i = 1; i < rowCount; i++) {
    const y = i * cellSize;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(totalWidth, y);
    ctx.stroke();
  }
}

function updateWalls(ball) {
  ball.x += ball.vx;
  ball.y += ball.vy;

  const r = ball.radius;
  const totalWidth = getTotalWidth();
  const totalHeight = getTotalHeight();

  if (ball.x - r < 0) {
    ball.x = r;
    ball.vx = -ball.vx;
  } else if (ball.x + r > totalWidth) {
    ball.x = totalWidth - r;
    ball.vx = -ball.vx;
  }

  if (ball.y - r < 0) {
    ball.y = r;
    ball.vy = -ball.vy;
  } else if (ball.y + r > totalHeight) {
    ball.y = totalHeight - r;
    ball.vy = -ball.vy;
  }
}

function resolveCollisions() {
  for (let i = 0; i < balls.length; i++) {
    for (let j = i + 1; j < balls.length; j++) {
      const a = balls[i];
      const b = balls[j];
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      let dist = Math.hypot(dx, dy);
      const minDist = a.radius + b.radius;

      if (dist === 0) {
        dx = 1;
        dy = 0;
        dist = 1;
      }

      if (dist >= minDist) continue;

      const nx = dx / dist;
      const ny = dy / dist;
      const velAlongNormal = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;

      if (velAlongNormal > 0) {
        a.vx -= velAlongNormal * nx;
        a.vy -= velAlongNormal * ny;
        b.vx += velAlongNormal * nx;
        b.vy += velAlongNormal * ny;
      }

      const overlap = minDist - dist;
      a.x -= nx * overlap / 2;
      a.y -= ny * overlap / 2;
      b.x += nx * overlap / 2;
      b.y += ny * overlap / 2;
    }
  }
}

function update() {
  balls.forEach(updateWalls);
  for (let pass = 0; pass < 3; pass++) {
    resolveCollisions();
  }
  balls.forEach(normalizeSpeed);
}

function loop() {
  ctx.clearRect(0, 0, width, height);
  update();
  drawSquareDividers();
  balls.forEach(drawBall);
  requestAnimationFrame(loop);
}

function findNearestBall(x, y) {
  if (balls.length === 0) return null;
  return balls.reduce((nearest, ball) => {
    const dist = Math.hypot(ball.x - x, ball.y - y);
    return dist < nearest.dist ? { ball, dist } : nearest;
  }, { ball: balls[0], dist: Infinity }).ball;
}

canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;
  const ball = findNearestBall(clickX, clickY);
  if (!ball) return;

  const dx = clickX - ball.x;
  const dy = clickY - ball.y;
  const dist = Math.hypot(dx, dy) || 1;
  ball.vx = (dx / dist) * SPEED;
  ball.vy = (dy / dist) * SPEED;
});

function setBallCount(count) {
  ballCount = Math.max(1, Math.min(MAX_BALLS, Math.floor(count)));
  ballCountInput.value = String(ballCount);
  layoutAllSquares();
  updateStats();
}

function resetToInitial() {
  squareCount = 1;
  rowCount = 1;
  ballCount = DEFAULT_BALL_COUNT;
  ballCountInput.value = String(DEFAULT_BALL_COUNT);
  cellSize = MIN_ARENA_SIZE * Math.sqrt(DEFAULT_AREA_CM2 / MIN_AREA_CM2);
  setCellSize(cellSize);
  layoutAllSquares();
  updateStats();
}

ballCountInput.addEventListener('input', () => {
  setBallCount(Number(ballCountInput.value));
});

resetBtn.addEventListener('click', resetToInitial);

shrinkArenaBtnRight.addEventListener('click', shrinkHorizontally);
addArenaBtnRight.addEventListener('click', duplicateHorizontally);
shrinkArenaBtnBottom.addEventListener('click', shrinkVertically);
addArenaBtnBottom.addEventListener('click', duplicateVertically);

window.addEventListener('resize', () => {
  setCellSize(cellSize);
});

setCellSize(cellSize);
layoutAllSquares();
updateStats();
loop();
