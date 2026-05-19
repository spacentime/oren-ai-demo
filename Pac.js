import {
  directions,
  DIRS,
  CELL_DOT,
  CELL_POWER,
  CELL_EATEN,
  CELL_WALL,
  CELL_CAGE_WALL,
  CELL_DOOR,
  CELL_CAGE_INTERIOR,
  HALF,
  TILE,
  COLS,
} from './constants.js';

export default class Pac {
  #dir = directions.NONE;

  constructor(props = {}) {
    const defaultProps = {
      x: 13.5,
      y: 21,
      nextDir: directions.UP,
      mouthAngle: 0,
      mouthOpen: true,
      speed: 0.1,
      alive: true,
      radius: HALF - 1,
    };

    Object.assign(this, { ...defaultProps, ...props });
    if (typeof props.dir === 'number') {
      this.#dir = props.dir;
    }
  }

  get dir() {
    return this.#dir;
  }

  resetPosition() {
    this.x = 13.5;
    this.y = 21;
    this.changeDirection(directions.NONE);
    this.nextDir = directions.NONE;
    this.alive = true;
  }

  changeDirection(newDir) {
    if (newDir < 0 || newDir > 4) {
      throw new Error('dir must be between 0 and 4');
    }
    this.#dir = newDir;
  }

  isMoving() {
    return this.#dir !== directions.NONE;
  }

  #cellOpen(cx, cy, maze) {
    if (cy < 0 || cy >= maze.length) return false;
    if (cx < 0 || cx >= COLS) return true;
    const c = maze[cy][cx];
    return c !== CELL_WALL && c !== CELL_CAGE_WALL && c !== CELL_DOOR && c !== CELL_CAGE_INTERIOR;
  }

  canMove(dx, dy, maze) {
    return this.#cellOpen(Math.round(this.x + dx * 0.5), Math.round(this.y + dy * 0.5), maze);
  }

  #canTurn(maze) {
    const [dx, dy] = DIRS[this.nextDir];
    const cx = dx < 0 ? Math.floor(this.x + dx * 0.5) : Math.round(this.x + dx * 0.5);
    const cy = dy < 0 ? Math.floor(this.y + dy * 0.5) : Math.round(this.y + dy * 0.5);
    return this.#cellOpen(cx, cy, maze);
  }

  tryTurn(maze) {
    if (this.nextDir !== directions.NONE && this.#canTurn(maze)) {
      this.changeDirection(this.nextDir);
    }
    return this;
  }

  moveBy(maze) {
    const [dx, dy] = DIRS[this.dir];
    if (!(this.isMoving() && this.canMove(dx, dy, maze))) return this;
    this.x += dx * this.speed;
    this.y += dy * this.speed;
    if (this.x < 0) this.x = COLS - 0.5;
    if (this.x >= COLS) this.x = 0;
    if (dx !== 0) this.y = Math.round(this.y);
    if (dy !== 0) this.x = Math.round(this.x);
    return this;
  }

  openMouth() {
    const mouthSpeed = 0.1;
    this.mouthAngle = this.mouthOpen ? this.mouthAngle + mouthSpeed : this.mouthAngle - mouthSpeed;
    if (this.mouthAngle > 0.6) this.mouthOpen = false;
    if (this.mouthAngle < 0.01) this.mouthOpen = true;
    return this;
  }

  eatCell(maze) {
    const cx = Math.round(this.x);
    const cy = Math.round(this.y);
    const c = maze[cy][cx];
    if (c === CELL_DOT) {
      maze[cy][cx] = CELL_EATEN;
      return { ate: true, points: 10, soundType: 'eat' };
    }
    if (c === CELL_POWER) {
      maze[cy][cx] = CELL_EATEN;
      return { ate: true, points: 50, soundType: 'power' };
    }
    return { ate: false };
  }

  update(maze) {
    if (!this.alive) return { ate: false };
    this.tryTurn(maze).moveBy(maze).openMouth();
    return this.eatCell(maze);
  }

  static createTitlePac(x) {
    return new Pac({ radius: TILE / 1.3, x, mouthAngle: 0.6 });
  }
}
