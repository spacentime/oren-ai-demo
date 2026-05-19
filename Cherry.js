import {CS, HALF, TOP} from './constants.js';

export default class Cherry {
  static X = 13;
  static Y = 16;
  static VISIBLE = 480;
  static INTERVAL = 600;

  constructor(level) {
    this.reset(level);
  }

  reset(level) {
    this.level = level;
    this.active = null;
    this.spawnTimer = Cherry.INTERVAL;
    this.cherriesLeft = 3;
    this.nextPoints = this.calculateBasePoints();
  }

  resetSpawn() {
    this.active = null;
    this.spawnTimer = Cherry.INTERVAL;
  }

  calculateBasePoints() {
    return Math.min(100 * this.level, 1000);
  }

  update(pac) {
    if (this.active) {
      this.active.timer--;
      if (this.active.timer <= 0) {
        this.active = null;
        this.spawnTimer = Cherry.INTERVAL;
        return null;
      }

      if (Math.hypot(this.active.x - pac.x, this.active.y - pac.y) < 0.75) {
        const points = this.active.points;
        const x = this.active.x;
        const y = this.active.y;
        this.cherriesLeft--;
        this.active = null;
        this.nextPoints *= 2;
        this.spawnTimer = Cherry.INTERVAL;
        return { collected: true, points, x, y };
      }

      return null;
    }

    if (this.cherriesLeft <= 0) return null;

    this.spawnTimer--;
    if (this.spawnTimer <= 0) {
      this.active = {
        x: Cherry.X,
        y: Cherry.Y,
        timer: Cherry.VISIBLE,
        points: this.nextPoints,
      };
    }

    return null;
  }

  draw(ctx, globalDot) {
    if (!this.active) return;
    if (this.active.timer < 120 && Math.floor(globalDot / 8) % 2 === 0) return;

    const px = this.active.x * CS + HALF;
    const py = this.active.y * CS + HALF + TOP;

    ctx.strokeStyle = '#33cc33';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(px - 2, py + 1);
    ctx.quadraticCurveTo(px - 5, py - 5, px, py - 7);
    ctx.moveTo(px + 2, py + 1);
    ctx.quadraticCurveTo(px + 5, py - 5, px, py - 7);
    ctx.stroke();

    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 6;
    [-4, 4].forEach(ox => {
      ctx.fillStyle = '#cc0000';
      ctx.beginPath();
      ctx.arc(px + ox, py + 3, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff5555';
      ctx.beginPath();
      ctx.arc(px + ox - 1, py + 1, 1.5, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.shadowBlur = 0;
  }
}
