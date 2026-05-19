import {
  directions,
  DIRS,
  CELL_DOT,
  CELL_POWER,
  CELL_CAGE_INTERIOR,
  CELL_WALL,
  CELL_CAGE_WALL,
  CELL_DOOR,
  CELL_EATEN,
  RAW,
  ROWS,
  COLS,
} from './constants.js';
import Cherry from './Cherry.js';
import PowerSession from './PowerSession.js';
import Pac from './Pac.js';
import Ghost from './Ghost.js';

export default class Game {
  // Game state
  #score = 0;
  #lives = 3;
  #dotsEaten = 0;
  #level = 1;
  #state = 'TITLE'; // TITLE PLAYING PAUSED EXIT_CONFIRM DEAD LEVELUP GAMEOVER
  #exitPrevState = 'PLAYING';
  #isMobile = false;
  #titleBlink = 0;
  #deadTimer = 0;
  #levelTimer = 0;
  #globalDot = 0; // dot animation phase
  #pointBubbles = [];

  // Game objects
  #powerSession;
  #cherry;
  #pac;
  #ghosts;
  #titleGhosts;
  #frightenedGhost;
  #titlePac;
  #maze;
  #totalDots;

  // Audio callback
  #audioCallbacks;

  constructor(audioCallbacks = {}) {
    this.#audioCallbacks = {
      playEat: audioCallbacks.playEat || (() => {}),
      playDeath: audioCallbacks.playDeath || (() => {}),
      playPowerUp: audioCallbacks.playPowerUp || (() => {}),
      beep: audioCallbacks.beep || (() => {}),
    };

    this.#initializeGameState();
  }

  #initializeGameState() {
    this.#powerSession = new PowerSession();
    this.#cherry = new Cherry(this.#level);
    this.#pac = new Pac();
    this.#maze = RAW.map(r => r.split('').map(Number));
    this.#totalDots = this.#countTotalDots();
    this.#ghosts = [0, 1, 2, 3].map(i => new Ghost(i));
    this.#initializeTitleScreen();
  }

  #initializeTitleScreen() {
    this.#titleGhosts = [0, 1, 2, 3].map(i => Ghost.makeTitleGhost(i));
    this.#frightenedGhost = Ghost.makeTitleFrightenedGhost(this.#titleGhosts[3].x, this.#pac.y);
    this.#titlePac = Pac.createTitlePac(this.#titleGhosts[0].x);
  }

  #countTotalDots() {
    let count = 0;
    this.#maze.forEach(r => r.forEach(c => {
      if (c === CELL_DOT || c === CELL_POWER) count++;
    }));
    return count;
  }

  // ── GETTERS ──────────────────────────────────────────────
  get score() { return this.#score; }
  get lives() { return this.#lives; }
  get dotsEaten() { return this.#dotsEaten; }
  get level() { return this.#level; }
  get state() { return this.#state; }
  get exitPrevState() { return this.#exitPrevState; }
  get isMobile() { return this.#isMobile; }
  get titleBlink() { return this.#titleBlink; }
  get deadTimer() { return this.#deadTimer; }
  get levelTimer() { return this.#levelTimer; }
  get globalDot() { return this.#globalDot; }
  get pointBubbles() { return this.#pointBubbles; }
  get powerSession() { return this.#powerSession; }
  get cherry() { return this.#cherry; }
  get pac() { return this.#pac; }
  get ghosts() { return this.#ghosts; }
  get titleGhosts() { return this.#titleGhosts; }
  get frightenedGhost() { return this.#frightenedGhost; }
  get titlePac() { return this.#titlePac; }
  get maze() { return this.#maze; }
  get totalDots() { return this.#totalDots; }

  // ── SETTERS ──────────────────────────────────────────────
  setState(newState) {
    this.#state = newState;
  }

  setExitPrevState(prevState) {
    this.#exitPrevState = prevState;
  }

  setIsMobile(isMobile) {
    this.#isMobile = isMobile;
  }

  incrementGlobalDot() {
    this.#globalDot++;
  }

  addScore(points) {
    this.#score += points;
  }

  // ── GAME LOGIC ───────────────────────────────────────────
  resetPositions() {
    this.#pac.resetPosition();
    this.#ghosts = [0, 1, 2, 3].map(i => new Ghost(i));
    this.#powerSession.reset();
    this.#pointBubbles = [];
    this.#cherry.reset(this.#level);
  }

  resetPositionsAfterDeath() {
    this.#pac.resetPosition();
    this.#ghosts = [0, 1, 2, 3].map(i => new Ghost(i));
    this.#powerSession.reset();
    this.#pointBubbles = [];
    this.#cherry.resetSpawn();
  }

  restartGame() {
    this.#score = 0;
    this.#lives = 3;
    this.#dotsEaten = 0;
    this.#level = 1;
    this.#powerSession.reset();
    this.#cherry.reset(this.#level);
    this.#maze = RAW.map(r => r.split('').map(Number));
    this.#totalDots = this.#countTotalDots();
    this.resetPositions();
    this.#state = 'PLAYING';
  }

  updateGhosts() {
    const sp = this.#level === 1 ? 1 : 1 + this.#level * 0.05;
    this.#ghosts.forEach(g => g.update(sp, this.#pac, this.#maze, this.#powerSession, this.#globalDot));

    // Collision with pac
    this.#ghosts.forEach(g => {
      if (g.eaten) return;
      const dist = Math.hypot(g.x - this.#pac.x, g.y - this.#pac.y);
      if (dist < 0.75) {
        if (g.isFrightened(this.#powerSession)) {
          const pts = 200 * Math.pow(2, this.#powerSession.ghostEatChain);
          this.#powerSession.ghostEatChain++;
          g.eaten = true;
          g.path = [];
          g.pathIdx = 0;
          this.#score += pts;
          this.#pointBubbles.push({
            x: g.x * 20 + 10,
            y: g.y * 20 + 10 + 40,
            pts,
            life: 1,
            dy: -0.4,
          });
          this.#audioCallbacks.beep(880, 0.05);
          this.#audioCallbacks.beep(1100, 0.08);
        } else {
          this.#pac.alive = false;
          this.#lives--;
          this.#state = 'DEAD';
          this.#deadTimer = 180;
          this.#audioCallbacks.playDeath();
        }
      }
    });
  }

  updateGameplay() {
    this.#powerSession.update();
    const eatEvent = this.#pac.update(this.#maze);
    if (eatEvent?.ate) {
      this.#dotsEaten++;
      this.#score += eatEvent.points;
      if (eatEvent.soundType === 'eat') {
        this.#audioCallbacks.playEat();
      } else if (eatEvent.soundType === 'power') {
        this.#audioCallbacks.playPowerUp();
        this.#powerSession.start();
      }
      if (this.#dotsEaten >= this.#totalDots) {
        this.#state = 'LEVELUP';
        this.#levelTimer = 120;
      }
    }
    this.updateGhosts();
  }

  updateCherryCollection() {
    const cherryEvent = this.#cherry.update(this.#pac);
    if (cherryEvent?.collected) {
      this.#score += cherryEvent.points;
      this.#pointBubbles.push({
        x: cherryEvent.x * 20 + 10,
        y: cherryEvent.y * 20 + 10 + 40,
        pts: cherryEvent.points,
        life: 1,
        dy: -0.4,
      });
      this.#audioCallbacks.beep(1047, 0.06);
      setTimeout(() => this.#audioCallbacks.beep(1319, 0.08), 60);
      setTimeout(() => this.#audioCallbacks.beep(1568, 0.1), 120);
    }
  }

  updateDeadState() {
    this.#deadTimer--;
    if (this.#deadTimer <= 0) {
      if (this.#lives <= 0) {
        this.#state = 'GAMEOVER';
        this.#titleBlink = 0;
      } else {
        this.resetPositionsAfterDeath();
        this.#state = 'PLAYING';
      }
    }
  }

  updateLevelUp() {
    this.#levelTimer--;
    if (this.#levelTimer <= 0) {
      this.#level++;
      this.#lives++;
      this.#dotsEaten = 0;
      this.#cherry.cherriesLeft = 3;
      this.#maze = RAW.map(r => r.split('').map(Number));
      this.#totalDots = this.#countTotalDots();
      this.resetPositions();
      this.#state = 'PLAYING';
      this.#audioCallbacks.beep(523, 0.1);
      this.#audioCallbacks.beep(659, 0.1);
      this.#audioCallbacks.beep(784, 0.15);
    }
  }

  // ── INPUT HANDLING ───────────────────────────────────────
  handleKeyDown(code) {
    if (code === 'Space' || code === 'Enter') {
      if (this.#state === 'PLAYING') {
        this.#state = 'PAUSED';
      } else if (this.#state === 'PAUSED') {
        this.#state = 'PLAYING';
      } else if (this.#state === 'TITLE' || this.#state === 'GAMEOVER') {
        this.restartGame();
      } else if (this.#state === 'EXIT_CONFIRM') {
        this.#state = 'TITLE';
      }
    } else if (code === 'Escape' || code === 'Backspace') {
      if (this.#state === 'PLAYING' || this.#state === 'PAUSED') {
        this.#exitPrevState = this.#state;
        this.#state = 'EXIT_CONFIRM';
      } else if (this.#state === 'EXIT_CONFIRM') {
        this.#state = this.#exitPrevState;
      } else if (this.#state === 'GAMEOVER') {
        this.#state = 'TITLE';
      }
    } else if (code === 'KeyN') {
      if (this.#state === 'EXIT_CONFIRM') {
        this.#state = this.#exitPrevState;
      }
    } else if (code === 'KeyY') {
      if (this.#state === 'EXIT_CONFIRM') {
        this.#state = 'TITLE';
      }
    }
    else if (this.#state === 'PLAYING') {
      if (code === 'ArrowRight' || code === 'KeyD') {
        this.#pac.nextDir = directions.RIGHT;
      }
      if (code === 'ArrowUp' || code === 'KeyW') {
        this.#pac.nextDir = directions.UP;
      }
      if (code === 'ArrowLeft' || code === 'KeyA') {
        this.#pac.nextDir = directions.LEFT;
      }
      if (code === 'ArrowDown' || code === 'KeyS') {
        this.#pac.nextDir = directions.DOWN;
      }
    }
  }

  handleDpadDirection(dir) {
    if (this.#state === 'TITLE') {
      this.setState('PLAYING');
      this.resetPositions();
      return;
    }
    if (this.#state === 'GAMEOVER') {
      this.restartGame();
      return;
    }
    if (this.#state === 'EXIT_CONFIRM') {
      this.#state = this.#exitPrevState;
      return;
    }
    if (this.#state === 'PLAYING' || this.#state === 'PAUSED') {
      this.#state = 'PLAYING';
      this.#pac.nextDir = dir;
    }
  }

  handleBackButton() {
    if (this.#state === 'PLAYING' || this.#state === 'PAUSED') {
      this.#exitPrevState = this.#state;
      this.#state = 'EXIT_CONFIRM';
      return true;
    } else if (this.#state === 'EXIT_CONFIRM') {
      this.#state = this.#exitPrevState;
      return true;
    }
    return false;
  }

  // ── ANIMATION & UI STATE ─────────────────────────────────
  incrementTitleBlink() {
    this.#titleBlink++;
  }

  updateMobileState(isMobile) {
    this.#isMobile = isMobile;
  }
}
