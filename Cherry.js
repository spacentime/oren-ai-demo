import {CS, HALF, TOP} from './constants.js';

export default class Cherry {
  static X = 13;
  static Y = 16;
  static VISIBLE = 480;
  static INTERVAL = 600;

  constructor() {
  }

  reset(level) {
    this.level = level;
    this.active = null;
    this.spawnTimer = Cherry.INTERVAL;
    this.cherriesLeft = 3;
    this.nextPoints = this.calculateBasePoints();
    return this;
  }

  resetSpawn() {
    this.active = null;
    this.spawnTimer = Cherry.INTERVAL;
  }

  calculateBasePoints() {
    return Math.min(100 * this.level, 1000);
  }

  update(pac, globalDot) {
    if (this.active) {
      this.active.timer--;
      if (this.active.timer <= 0) {
        this.active = null;
        this.spawnTimer = Cherry.INTERVAL;
        return null;
      }
      // calculate visiblity     
      this.active.isVisible = !(this.active.timer < 120 && Math.floor(globalDot / 8) % 2 === 0);

      // Calculate eat cherry
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
      this.activate();
    }

    return null;
  }
  
  activate() {
    this.active = {
      x: Cherry.X,
      y: Cherry.Y,
      timer: Cherry.VISIBLE,
      points: this.nextPoints,
      isVisible: true,
    };
  }
}
