import {
  directions,
  DIRS,
  CELL_WALL,
  CELL_CAGE_WALL,
  CELL_DOOR,
  CELL_CAGE_INTERIOR,
  GHOST_COLORS,
  GHOST_NAMES,
  GHOST_HOME,
  TILE,
  HALF,
  COLS,
  ROWS,
} from './constants.js';
import { bfsPath, canMoveGhost } from './utils.js';

export default class Ghost {
  constructor(index, props = {}) {
    this.index = index;
    const defaultProps = {
      dir: directions.UP,
      speed: 0.085,
      eaten: false,
      path: [],
      pathIdx: 0,
      cellX: -1,
      cellY: -1,
      immuneSession: -1,
      radius: HALF - 1,
      forceFrightened: false,
    };

    Object.assign(this, defaultProps, this.#propsByIndex(index), props);
  }

  #propsByIndex(i) {
    return {
      x: GHOST_HOME[i][0],
      y: GHOST_HOME[i][1],
      color: GHOST_COLORS[i],
      name: GHOST_NAMES[i],
      mode: i === 0 ? 'chase' : 'house',
      houseTimer: i * 150,
    };
  }

  isFrightened(powerSession) {
    return this.forceFrightened || (powerSession.isActive && this.immuneSession !== powerSession.powerSessionValue);
  }

  update(sp, pac, maze, powerSession, globalDot) {
    if (this.eaten) return this._updateEaten(maze, powerSession);
    if (this.mode === 'house') return this._updateHouse(globalDot);
    if (this.mode === 'exit') return this._updateExit(sp);
    return this._updateChase(sp, pac, maze, powerSession);
  }

  _updateEaten(maze, powerSession) {
    if (!this.path.length) {
      this.path = bfsPath(this.x, this.y, GHOST_HOME[0][0], 12, maze);
      this.pathIdx = 0;
    }
    if (this.pathIdx >= this.path.length) {
      this.eaten = false;
      this.mode = 'house';
      this.houseTimer = 30 + this.index * 30; // stagger return-to-play by 10s per ghost
      this.immuneSession = powerSession.powerSessionValue;
      this.path = [];
      return;
    }

    const [wx, wy] = this.path[this.pathIdx];
    const dx = wx - this.x;
    const dy = wy - this.y;
    if (Math.abs(dx) + Math.abs(dy) < 0.12) {
      this.x = wx;
      this.y = wy;
      this.pathIdx++;
    } else {
      const spd = 0.18;
      this.x += Math.sign(dx) * Math.min(Math.abs(dx), spd);
      this.y += Math.sign(dy) * Math.min(Math.abs(dy), spd);
    }
  }

  _updateHouse(globalDot) {
    this.houseTimer--;
    this.y += Math.sin(globalDot * 0.1) * 0.03;
    if (this.houseTimer <= 0) this.mode = 'exit';
  }

  _updateExit(sp) {
    const tx = 13;
    const ty = 10;
    const dxe = tx - this.x;
    const dye = ty - this.y;
    if (Math.abs(dxe) + Math.abs(dye) < 0.3) {
      this.mode = 'chase';
      this.dir = directions.UP;
      this.cellX = -1;
      this.cellY = -1;
    }
    this.x += Math.sign(dxe) * this.speed * sp;
    this.y += Math.sign(dye) * this.speed * sp;
  }

  _updateChase(sp, pac, maze, powerSession) {
    const frightened = this.isFrightened(powerSession);
    const gsp = frightened ? this.speed * 0.6 * sp : this.speed * sp;

    const snapX = Math.round(this.x);
    const snapY = Math.round(this.y);
    const atCenter = Math.abs(this.x - snapX) < gsp + 0.06 &&
                     Math.abs(this.y - snapY) < gsp + 0.06 &&
                     (snapX !== this.cellX || snapY !== this.cellY);

    if (atCenter) {
      this.cellX = snapX;
      this.cellY = snapY;
      this.x = snapX;
      this.y = snapY;

      let tx = pac.x;
      let ty = pac.y;
      if (frightened) {
        tx = pac.x + (this.x - pac.x) * 3;
        ty = pac.y + (this.y - pac.y) * 3;
      } else if (this.index === 1) {
        tx = pac.x + DIRS[pac.dir][0] * 4;
        ty = pac.y + DIRS[pac.dir][1] * 4;
      } else if (this.index === 2) {
        tx = COLS / 2;
        ty = ROWS / 2;
      }

      const possible = [0, 1, 2, 3].filter(d => {
        const rev = (this.dir + 2) % 4;
        if (d === rev && !frightened) return false;
        const [ddx, ddy] = DIRS[d];
        return canMoveGhost(this.x, this.y, ddx, ddy, maze);
      });

      if (possible.length > 0) {
        if (frightened) {
          this.dir = possible[Math.floor(Math.random() * possible.length)];
        } else {
          let minDist = Infinity;
          possible.forEach(d => {
            const [ddx, ddy] = DIRS[d];
            const dist = (this.x + ddx - tx) ** 2 + (this.y + ddy - ty) ** 2;
            if (dist < minDist) {
              minDist = dist;
              this.dir = d;
            }
          });
        }
      }
    }

    const [gdx, gdy] = DIRS[this.dir];
    const ahead = { x: Math.round(this.x + gdx * 0.6), y: Math.round(this.y + gdy * 0.6) };
    let bx = ahead.x;
    if (bx < 0) bx = COLS - 1;
    if (bx >= COLS) bx = 0;
    const blocked = ahead.y >= 0 && ahead.y < ROWS && maze[ahead.y][bx] === CELL_WALL;

    if (!blocked) {
      this.x += gdx * gsp;
      this.y += gdy * gsp;
      if (this.x < 0) this.x = COLS - 1;
      if (this.x >= COLS) this.x = 0;
    }
  }

  static makeTitleGhost(i) {
    const g = new Ghost(i);
    g.radius = TILE / 1.3;
    g.speed = 0;
    g.dir = i;
    g.x = (i * (HALF - 3)) + HALF / 3;
    g.y = 2;
    return g;
  }

  static makeTitleFrightenedGhost(x, y) {
    const g = Ghost.makeTitleGhost(0);
    g.forceFrightened = true;
    g.x = x;
    g.y = y;
    return g;
  }
}
