const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

// ── MAZE ────────────────────────────────────────────────
const CELL_DOT       = 0;
const CELL_WALL      = 1;
const CELL_POWER     = 2;
const CELL_CAGE_WALL = 3;
const CELL_DOOR          = 4;
const CELL_EATEN         = 5;
const CELL_CAGE_INTERIOR = 6;

const RAW = [
 "1111111111111111111111111111",
 "1000000000000110000000000001",
 "1011110111110110111110111101",
 "1211110111110110111110111121",
 "1011110111110110111110111101",
 "1000000000000000000000000001",
 "1011110110111111110110111101",
 "1011110110111111110110111101",
 "1000000110000110000110000001",
 "1111110111110110111110111111",
 "1111110110000000000110111111",
 "1111110110333443330110111111",
 "1111110110366666630110111111",
 "0000000000366666630000000000",
 "1111110110366666630110111111",
 "1111110110333333330110111111",
 "1111110110000000000110111111",
 "1111110110111111110110111111",
 "1000000000000110000000000001",
 "1011110111110110111110111101",
 "1011110111110110111110111101",
 "1200110000000000000000110021",
 "1110110110111111110110110111",
 "1110110110111111110110110111",
 "1000000110000110000110000001",
 "1011111111110110111111111101",
 "1011111111110110111111111101",
 "1000000000000000000000000001",
 "1111111111111111111111111111",
];

const ROWS = RAW.length;
const COLS = RAW[0].length;
const CS = 20; // cell size
const TOP = 40; // score bar height

canvas.width  = COLS * CS;
canvas.height = ROWS * CS + TOP + 20;

// Parse maze
let maze = RAW.map(r => r.split('').map(Number));

// Count total dots
let totalDots = 0;
maze.forEach(r => r.forEach(c => { if(c===CELL_DOT||c===CELL_POWER) totalDots++; }));

// ── AUDIO ────────────────────────────────────────────────
const AC = new (window.AudioContext||window.webkitAudioContext)();
function beep(f,d,t='square',v=0.25){
  try{
    const o=AC.createOscillator(), g=AC.createGain();
    o.connect(g); g.connect(AC.destination);
    o.type=t; o.frequency.value=f;
    g.gain.setValueAtTime(v,AC.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001,AC.currentTime+d);
    o.start(); o.stop(AC.currentTime+d);
  }catch(e){}
}
function playEat(){ beep(440+Math.random()*80,0.04,'square',0.15); }
function playDeath(){
  [523,415,330,262,208,165,131].forEach((f,i)=>setTimeout(()=>beep(f,0.12,'sawtooth'),i*120));
}
function playPowerUp(){ beep(660,0.08); setTimeout(()=>beep(880,0.12),80); }

// ── STATE ────────────────────────────────────────────────
const TILE = CS;
const HALF = TILE/2;

let score=0, lives=3, dotsEaten=0, level=1;
let state='TITLE'; // TITLE PLAYING PAUSED EXIT_CONFIRM DEAD LEVELUP GAMEOVER
let exitPrevState='PLAYING';
let isMobile=false;
let titleBlink=0, deadTimer=0, levelTimer=0;
let globalDot=0; // dot animation phase
let pointBubbles=[];

class Cherry {
  static X = 13;
  static Y = 16;
  static VISIBLE = 480;
  static INTERVAL = 600;
  static spawnTimer = Cherry.INTERVAL;
  static cherriesLeft = 3;
  static active = null;
  static nextPoints = 0;

  constructor(level) {
    this.x = Cherry.X;
    this.y = Cherry.Y;
    this.timer = Cherry.VISIBLE;
    this.points = Cherry.nextPoints;
  }

  static #calculateBasePoints(lvl) {
    return Math.min(100 * lvl, 1000);
  }

  static reset() {
    Cherry.active = null;
    Cherry.spawnTimer = Cherry.INTERVAL;
    Cherry.cherriesLeft = 3;
    Cherry.nextPoints = Cherry.#calculateBasePoints(level);
  }

  static resetSpawn() {
    Cherry.active = null;
    Cherry.spawnTimer = Cherry.INTERVAL;
  }

  static update() {
    if (Cherry.active) {
      Cherry.active.timer--;
      if (Cherry.active.timer <= 0) {
        Cherry.active = null;
        Cherry.spawnTimer = Cherry.INTERVAL;
        return;
      }
      if (Math.hypot(Cherry.active.x - pac.x, Cherry.active.y - pac.y) < 0.75) {
        score += Cherry.active.points;
        pointBubbles.push({
          x: Cherry.active.x * CS + HALF,
          y: Cherry.active.y * CS + HALF + TOP,
          pts: Cherry.active.points,
          life: 1,
          dy: -0.4
        });
        beep(1047, 0.06);
        setTimeout(() => beep(1319, 0.08), 60);
        setTimeout(() => beep(1568, 0.1), 120);
        Cherry.cherriesLeft--;
        Cherry.active = null;
        Cherry.nextPoints *= 2;
        Cherry.spawnTimer = Cherry.INTERVAL;
      }
    } else {
      Cherry.spawnTimer--;
      if (Cherry.spawnTimer <= 0 && Cherry.cherriesLeft > 0) {
        Cherry.active = new Cherry(level);
      }
    }
  }

  static draw() {
    if (!Cherry.active) return;
    if (Cherry.active.timer < 120 && Math.floor(globalDot / 8) % 2 === 0) return;
    const px = Cherry.active.x * CS + HALF;
    const py = Cherry.active.y * CS + HALF + TOP;

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

class PowerSession {
  constructor() {
    this.powerTimer = 0;
    this.ghostEatChain = 0;
    this.powerSessionValue = 0;
  }

  get isActive() {
    return this.powerTimer > 0;
  }

  get isEnding() {
    return this.isActive && this.powerTimer < 100;
  }

  start() {
    this.powerTimer = 400;
    this.ghostEatChain = 0;
    this.powerSessionValue++;
  }

  update() {
    if (this.powerTimer > 0) {
      this.powerTimer--;
      if (this.powerTimer === 0) {
        this.ghostEatChain = 0;
      }
    }
  }

  reset() {
    this.powerTimer = 0;
    this.ghostEatChain = 0;
    this.powerSessionValue = 0;
  }
}

let powerSessionInstance = new PowerSession();

// Pac-Man
class Pac {
  // Private field
  #dir = 4;

  constructor() {
    // Public properties
    this.x = 13.5;
    this.y = 21;
    this.nextDir = 0;
    this.mouthAngle = 0;
    this.mouthOpen = true;
    this.speed = 0.1;
    this.alive = true;
    this.radius = HALF - 1;
  }

  // Public getter
  get dir() {
    return this.#dir;
  }

  resetPosition() {
    this.x=13.5; this.y=21; this.changeDirection(4); this.nextDir=4; this.alive=true;
  }
  // No setter → dir cannot be changed directly

  // Public method to safely change direction
  changeDirection(newDir) {
    if (newDir < 0 || newDir > 4) {
      throw new Error("dir must be between 0 and 4");
    }
    this.#dir = newDir;
  }

  isMoving() {
    return this.#dir !== 4;
  }

  #cellOpen(cx,cy){
    if(cy<0||cy>=ROWS) return false;
    if(cx<0||cx>=COLS) return true;
    const c=maze[cy][cx];
    return c!==CELL_WALL && c!==CELL_CAGE_WALL && c!==CELL_DOOR && c!==CELL_CAGE_INTERIOR;
  }

  // Used for movement: Math.round gives symmetric stopping distance in all directions.
  canMove(dx,dy){
    return this.#cellOpen(Math.round(this.x+dx*0.5), Math.round(this.y+dy*0.5));
  }

  // Used for direction switching: Math.floor on negative axes prevents prematurely switching
  // direction when pressing into a wall, so Pacman keeps going in its current direction.
  canTurn(dx,dy){
    const cx=dx<0 ? Math.floor(this.x+dx*0.5) : Math.round(this.x+dx*0.5);
    const cy=dy<0 ? Math.floor(this.y+dy*0.5) : Math.round(this.y+dy*0.5);
    return this.#cellOpen(cx,cy);
  }
}

let pac = new Pac();

// direction vectors [dx,dy]
const DIRS = [[1,0],[0,-1],[-1,0],[0,1],[0,0]];
// dir indices: 0=R 1=U 2=L 3=D 4=stop

// Ghosts
const GHOST_COLORS = ['#FF0000','#FFB8FF','#00FFFF','#FFB852'];
const GHOST_NAMES  = ['BLINKY','PINKY','INKY','CLYDE'];
const GHOST_HOME   = [[13,10],[13,13],[12,13],[14,13]];
 
function makeGhost(i){
  return {
    x: GHOST_HOME[i][0], y: GHOST_HOME[i][1],
    dir: 1, color: GHOST_COLORS[i], name: GHOST_NAMES[i],
    mode: i===0?'chase':'house', // blinky starts outside
    houseTimer: i*120,
    speed: 0.085,
    eaten: false,
    path: [], pathIdx: 0,
    cellX: -1, cellY: -1,
    immuneSession: -1,
    radius: HALF-1,
  };
}

function makeTitleGhost(i){
  var g = makeGhost(i);
  g.radius = TILE/1.3;
  g.speed = 0;
  g.dir = i;
  g.x = (i*(HALF-3))+HALF/3;
  g.y = 2;
  return g;
}


let ghosts = [0,1,2,3].map(makeGhost);
let titleGhosts = [0,1,2,3].map(makeTitleGhost); 
let frightenedGhost = makeTitleGhost(0) ;
frightenedGhost.isFrightened = true;
frightenedGhost.x = titleGhosts[3].x;
frightenedGhost.y = pac.y;
let titlePac = new Pac();
titlePac.x = titleGhosts[0].x;
titlePac.radius = TILE/1.3;
for(let i=0;i<5;i++) { pacOpenMouth(titlePac); }

// ── HELPERS ──────────────────────────────────────────────
function cellAt(x,y){
  const cx=Math.round(x), cy=Math.round(y);
  if(cy<0||cy>=ROWS||cx<0||cx>=COLS) return 1;
  return maze[cy][cx];
}

function canMoveGhost(x,y,dx,dy){
  // Check from exact grid position one full cell ahead
  const nx=x+dx, ny=y+dy;
  let cx=Math.round(nx), cy=Math.round(ny);
  if(cy<0||cy>=ROWS) return false;
  if(cx<0) cx=COLS-1;
  if(cx>=COLS) cx=0;
  const c=maze[cy][cx];
  return c!==CELL_WALL && c!==CELL_CAGE_WALL && c!==CELL_DOOR && c!==CELL_CAGE_INTERIOR;
}

// ── UPDATE ───────────────────────────────────────────────
function resetPositions(){
  pac.resetPosition();
  ghosts=[0,1,2,3].map(makeGhost);
  powerSessionInstance.reset(); pointBubbles=[]; Cherry.reset();
}

function resetPositionsAfterDeath(){
  pac.resetPosition();
  ghosts=[0,1,2,3].map(makeGhost);
  powerSessionInstance.reset(); pointBubbles=[]; Cherry.resetSpawn();
}

function eatCell(){
  const cx=Math.round(pac.x), cy=Math.round(pac.y);
  const c=maze[cy][cx];
  const markEatCell = (deltaPoints, soundFx) => {
    maze[cy][cx]=CELL_EATEN;
    dotsEaten++;
    score+=deltaPoints;
    soundFx();
  }
  if(c===CELL_DOT) { 
    markEatCell(10, playEat); 
  }
  else if(c===CELL_POWER){
    markEatCell(50, playPowerUp);
    powerSessionInstance.start();
  }
  if(dotsEaten>=totalDots){ state='LEVELUP'; levelTimer=120; }
}

function movePacman(pac, dx, dy){ 
    pac.x+=dx*pac.speed;
    pac.y+=dy*pac.speed;
    // tunnel wrap
    if(pac.x<0) pac.x=COLS-0.5;
    if(pac.x>=COLS) pac.x=0;
    // snap to grid
    if(dx!==0) pac.y=Math.round(pac.y);
    if(dy!==0) pac.x=Math.round(pac.x);
}

function pacOpenMouth(pac){
  
  // Calculate mouth animation position based on whether we're opening or closing, and switch direction if we hit the limits.
  const mouthSpeed = 0.1;
  pac.mouthAngle = pac.mouthOpen ? pac.mouthAngle+mouthSpeed : pac.mouthAngle-mouthSpeed;
  if(pac.mouthAngle>0.6){ pac.mouthOpen=false; }
  if(pac.mouthAngle<0.01){ pac.mouthOpen=true; }
}

function updatePac(pac){
  if(!pac.alive) return;

  // try next direction
  const [ndx,ndy]=DIRS[pac.nextDir];
  if(pac.nextDir!==4 && (pac.canTurn(ndx,ndy))) pac.changeDirection(pac.nextDir);

  const [dx,dy]=DIRS[pac.dir];

  if(pac.isMoving() && pac.canMove(dx,dy)){
    movePacman(pac, dx, dy); 
  }
  pacOpenMouth(pac);
  eatCell();
}

function isFrightened(g){ return g.isFrightened || (powerSessionInstance.isActive && g.immuneSession!==powerSessionInstance.powerSessionValue); }

function bfsPath(sx, sy, tx, ty){
  const q = [[Math.round(sx), Math.round(sy)]];
  const visited = {};
  const prev = {};
  const key = (x,y) => x+','+y;
  visited[key(q[0][0], q[0][1])] = true;
  while(q.length){
    const [cx,cy] = q.shift();
    if(cx===tx && cy===ty){
      const path=[];
      let cur=key(tx,ty);
      while(prev[cur]){ path.unshift(prev[cur]); cur=key(...prev[cur]); }
      path.push([tx,ty]);
      return path;
    }
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      let nx=cx+dx, ny=cy+dy;
      if(nx<0) nx=COLS-1; if(nx>=COLS) nx=0;
      if(ny<0||ny>=ROWS) continue;
      const c=maze[ny][nx];
      if(c===CELL_WALL || c===CELL_CAGE_WALL) continue;
      const k=key(nx,ny);
      if(!visited[k]){ visited[k]=true; prev[k]=[cx,cy]; q.push([nx,ny]); }
    }
  }
  return [[tx,ty]];
}

function updateGhosts(){
  const sp = level===1?1:1+level*0.05;
  ghosts.forEach((g,i)=>{
    if(g.eaten){
      if(!g.path.length){
        g.path = bfsPath(g.x, g.y, GHOST_HOME[0][0], 12);
        g.pathIdx = 0;
      }
      if(g.pathIdx >= g.path.length){
        g.eaten=false; g.mode='house'; g.houseTimer=60;
        g.immuneSession=powerSessionInstance.powerSessionValue; g.path=[]; return;
      }
      const [wx,wy] = g.path[g.pathIdx];
      const dx=wx-g.x, dy=wy-g.y;
      if(Math.abs(dx)+Math.abs(dy)<0.12){
        g.x=wx; g.y=wy; g.pathIdx++;
      } else {
        const spd=0.18;
        g.x+=Math.sign(dx)*Math.min(Math.abs(dx),spd);
        g.y+=Math.sign(dy)*Math.min(Math.abs(dy),spd);
      }
      return;
    }

    if(g.mode==='house'){
      g.houseTimer--;
      // bob up and down in house
      g.y += Math.sin(globalDot*0.1)*0.03;
      if(g.houseTimer<=0){ g.mode='exit'; }
      return;
    }

    if(g.mode==='exit'){
      // move toward exit (13, 10) — corridor above cage
      const tx=13, ty=10;
      const dxe=tx-g.x, dye=ty-g.y;
      if(Math.abs(dxe)+Math.abs(dye)<0.3){ g.mode='chase'; g.dir=1; g.cellX=-1; g.cellY=-1; }
      g.x+=Math.sign(dxe)*g.speed*sp;
      g.y+=Math.sign(dye)*g.speed*sp;
      return;
    }

    // chase / frightened
    const frightened = isFrightened(g);
    const gsp = frightened ? g.speed*0.6*sp : g.speed*sp;

    // At a grid intersection — snap and choose new direction (only once per cell)
    const snapX = Math.round(g.x), snapY = Math.round(g.y);
    const atCenter = Math.abs(g.x - snapX) < gsp+0.06 &&
                     Math.abs(g.y - snapY) < gsp+0.06 &&
                     (snapX !== g.cellX || snapY !== g.cellY);

    if(atCenter){
      g.cellX = snapX; g.cellY = snapY;
      g.x = snapX;
      g.y = snapY;

      let tx=pac.x, ty=pac.y;
      if(frightened){
        tx = pac.x + (g.x-pac.x)*3;
        ty = pac.y + (g.y-pac.y)*3;
      } else if(i===1){ tx=pac.x+DIRS[pac.dir][0]*4; ty=pac.y+DIRS[pac.dir][1]*4; }
      else if(i===2){ tx=COLS/2; ty=ROWS/2; }

      const possible=[0,1,2,3].filter(d=>{
        const rev=(g.dir+2)%4;
        if(d===rev && !frightened) return false;
        const [ddx,ddy]=DIRS[d];
        return canMoveGhost(g.x,g.y,ddx,ddy);
      });

      if(possible.length>0){
        let best;
        if(frightened){
          best=possible[Math.floor(Math.random()*possible.length)];
        } else {
          let minDist=Infinity;
          possible.forEach(d=>{
            const [ddx,ddy]=DIRS[d];
            const dist=(g.x+ddx-tx)**2+(g.y+ddy-ty)**2;
            if(dist<minDist){ minDist=dist; best=d; }
          });
        }
        g.dir=best;
      }
    }

    // Only move if not blocked by a wall
    const [gdx,gdy]=DIRS[g.dir];
    const ahead = { x: Math.round(g.x+gdx*0.6), y: Math.round(g.y+gdy*0.6) };
    let bx=ahead.x; if(bx<0)bx=COLS-1; if(bx>=COLS)bx=0;
    const blocked = ahead.y>=0 && ahead.y<ROWS && maze[ahead.y][bx]===CELL_WALL;

    if(!blocked){
      g.x+=gdx*gsp; g.y+=gdy*gsp;
      if(g.x<0) g.x=COLS-1;
      if(g.x>=COLS) g.x=0;
    }
  });

  // collision with pac
  ghosts.forEach(g=>{
    if(g.eaten) return;
    const dist=Math.hypot(g.x-pac.x, g.y-pac.y);
    if(dist<0.75){
      if(isFrightened(g)){
        const pts=200*Math.pow(2,powerSessionInstance.ghostEatChain);
        powerSessionInstance.ghostEatChain++;
        g.eaten=true; g.path=[]; g.pathIdx=0;
        score+=pts;
        pointBubbles.push({x:g.x*CS+HALF, y:g.y*CS+HALF+TOP, pts, life:1, dy:-0.4});
        beep(880,0.05); beep(1100,0.08);
      } else {
        pac.alive=false;
        lives--;
        state='DEAD';
        deadTimer=180;
        playDeath();
      }
    }
  });
}

// ── CHERRY ───────────────────────────────────────────────

// ── INPUT ────────────────────────────────────────────────
document.addEventListener('keydown',e=>{
  if(e.code==='Space') {
    if(state==='PLAYING') {
      state='PAUSED';
    }
    else if(state==='PAUSED') { 
      state='PLAYING';
    }
    else if(state==='TITLE' || state==='GAMEOVER') {
      restartGame();
    }
    e.preventDefault(); 
    return; 
  }
  else if (e.code==='Escape'||e.code==='Backspace') {
    if (state==='PLAYING'||state==='PAUSED') { 
      exitPrevState=state; state='EXIT_CONFIRM';
    }
    else if (state==='EXIT_CONFIRM') {
      state=exitPrevState;
    }
    else if(state==='GAMEOVER') {
      state='TITLE'; 
    } 
    e.preventDefault(); 
    return; 
  }
  if(state==='EXIT_CONFIRM'){
    if(e.code==='KeyY'||e.code==='Enter'){ restartGame(); state='TITLE'; }
    else if(e.code==='KeyN'){ state=exitPrevState; }
    e.preventDefault(); return;
  }
  if(state!=='PLAYING') return;
  if(e.code==='ArrowRight'||e.code==='KeyD') pac.nextDir=0;
  if(e.code==='ArrowUp'   ||e.code==='KeyW') pac.nextDir=1;
  if(e.code==='ArrowLeft' ||e.code==='KeyA') pac.nextDir=2;
  if(e.code==='ArrowDown' ||e.code==='KeyS') pac.nextDir=3;
  e.preventDefault();
});

function restartGame(){
  score=0; lives=3; dotsEaten=0; level=1; powerSessionInstance.reset(); Cherry.reset();
  maze=RAW.map(r=>r.split('').map(Number));
  totalDots=0;
  maze.forEach(r=>r.forEach(c=>{if(c===CELL_DOT||c===CELL_POWER)totalDots++;}));
  resetPositions();
  state='PLAYING';
}

// ── DRAW ─────────────────────────────────────────────────
function drawMaze(){
  maze.forEach((row,ry)=>{
    row.forEach((cell,cx)=>{
      const px=cx*CS, py=ry*CS+TOP;
      if(cell===CELL_WALL){
        ctx.fillStyle='#1a1aff';
        ctx.fillRect(px,py,CS,CS);
        // inner highlight
        ctx.fillStyle='#3333ff';
        ctx.fillRect(px+1,py+1,CS-2,CS-2);
        ctx.fillStyle='#1a1aff';
        ctx.fillRect(px+2,py+2,CS-4,CS-4);
      } else if(cell===CELL_DOT){
        // dot
        ctx.fillStyle='#ffb8ae';
        ctx.beginPath();
        ctx.arc(px+HALF,py+HALF,2,0,Math.PI*2);
        ctx.fill();
      } else if(cell===CELL_POWER){
        // power pellet - blinking
        if(Math.floor(globalDot/15)%2===0){
          ctx.fillStyle='#ffb8ae';
          ctx.shadowColor='#ffb8ae';
          ctx.shadowBlur=8;
          ctx.beginPath();
          ctx.arc(px+HALF,py+HALF,5,0,Math.PI*2);
          ctx.fill();
          ctx.shadowBlur=0;
        }
      } else if(cell===CELL_CAGE_WALL){
        // ghost cage wall - white with 3-D bevel
        ctx.fillStyle='#aaaaaa';
        ctx.fillRect(px,py,CS,CS);
        ctx.fillStyle='#ffffff';
        ctx.fillRect(px+1,py+1,CS-2,CS-2);
        ctx.fillStyle='#dddddd';
        ctx.fillRect(px+2,py+2,CS-4,CS-4);
      } else if(cell===CELL_DOOR){
        ctx.fillStyle='#FF44FF';
        ctx.fillRect(px, py+HALF-1, CS, 3);
      }
    });
  });
}

function drawPac(pac){
  const px=pac.x*CS+HALF, py=pac.y*CS+HALF+TOP;
  const ma=pac.mouthAngle;

  ctx.shadowColor='#ffff00';
  ctx.shadowBlur=10;
  ctx.fillStyle='#FFE000';

  // rotation based on dir
  const angles=[[0],[Math.PI*1.5],[Math.PI],[Math.PI*0.5]];
  const rot = pac.isMoving() ? angles[pac.dir][0] : 0;

  ctx.save();
  ctx.translate(px,py);
  ctx.rotate(rot);
  ctx.beginPath();
  ctx.moveTo(0,0);
  ctx.arc(0,0,pac.radius,ma,Math.PI*2-ma); // draw as a circle with a wedge missing for the mouth
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.shadowBlur=0;
}

function drawGhost(g){
  const px=g.x*CS+HALF, py=g.y*CS+HALF+TOP;
  const radius = g.radius || HALF-1;
  const eyeRadiusX = radius / 3;
  const eyeRadiusY = radius / 2.25;
  const eyeOffsetX = radius / 2.5;
  const pupilRadius = eyeRadiusX * 2 / 3;
  const eyesXlist = [-eyeOffsetX, eyeOffsetX];

  function drawEyesEaten(edx, edy){
    eyesXlist.forEach(ox=>{
      ctx.fillStyle='#ffffff';
      ctx.beginPath();
      ctx.ellipse(px+ox, py-3, eyeRadiusX, eyeRadiusY, 0, 0, Math.PI*2); // eaten ghost eyes
      ctx.fill();
      ctx.fillStyle='#000099';
      ctx.beginPath();
      ctx.arc(px+ox+edx*2, py-3+edy*2, pupilRadius, 0, Math.PI*2);
      ctx.fill();
    });
  }

  function drawEyesNormal(){
    eyesXlist.forEach(ox=>{
      ctx.fillStyle=eyeColor;
      ctx.beginPath();
      ctx.ellipse(px+ox,py-3,eyeRadiusX,eyeRadiusY,0,0,Math.PI*2);
      ctx.fill();
      // pupils
      const [dd]=DIRS[g.dir];
      ctx.fillStyle=pupilColor;
      ctx.beginPath();
      ctx.arc(px+ox+DIRS[g.dir][0]*2,py-3+DIRS[g.dir][1]*2,pupilRadius,0,Math.PI*2);
      ctx.fill();
    });
  }

  // eyes: two small dots
  function drawFrightenedEyes(fc) {
    const eyeRadius = radius / 4.5;
    ctx.fillStyle = fc;
    eyesXlist.forEach(ox=>{
      ctx.beginPath();
      ctx.arc(px+ox, py-4, eyeRadius, 0, Math.PI*2);
      ctx.fill();
    });
  }

  if(g.eaten){
    // derive travel direction from the active path waypoint
    let edx=0, edy=0;
    if(g.path.length && g.pathIdx < g.path.length){
      const [wx,wy]=g.path[g.pathIdx];
      const ddx=wx-g.x, ddy=wy-g.y;
      const len=Math.hypot(ddx,ddy)||1;
      edx=ddx/len; edy=ddy/len;
    }
    drawEyesEaten(edx,edy);
    return;
  }

  const frightened=isFrightened(g);
  const flashing=frightened&&powerSessionInstance.isEnding&&Math.floor(globalDot/10)%2===0;

  let bodyColor = frightened ? (flashing?'#ffffff':'#2121de') : g.color;
  let eyeColor  = frightened ? '#ffb852' : '#ffffff';
  let pupilColor= frightened ? '#ffb852' : '#000099';

  ctx.shadowColor=bodyColor; ctx.shadowBlur=8;
  ctx.fillStyle=bodyColor;

  // body
  ctx.beginPath();
  ctx.arc(px,py-2,radius,Math.PI,0);
  // wavy bottom
  const wb=py+radius-4;
  ctx.lineTo(px+radius,wb);
  const segs=3, sw=(radius*2)/segs;
  for(let i=segs;i>=0;i--){
    const bx=px-radius+i*sw;
    const by=i%2===0?wb:wb+4;
    ctx.lineTo(bx,by);
  }
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur=0;

  if(!frightened){
    // eyes
    drawEyesNormal();
  } else {
    // frightened face — colour inverts so it stays visible on the flashing white body
    const fc = flashing ? '#2121de' : '#ffffff';

    drawFrightenedEyes(fc);
    
    // mouth: zigzag worried line
    const mouthWidth = radius / 1.8;
    const mouthHeight = radius / 3;
    ctx.strokeStyle = fc;
    ctx.lineWidth = radius/6;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    let my =py+radius/4;
    ctx.moveTo(px-mouthWidth, my+mouthHeight);
    ctx.lineTo(px-(mouthWidth/2), my);
    ctx.lineTo(px,    my+mouthHeight);
    ctx.lineTo(px+(mouthWidth/2),my);
    ctx.lineTo(px+mouthWidth,  my+mouthHeight);
    ctx.stroke();
  }
}

function drawHUD(){
  ctx.fillStyle='#000';
  ctx.fillRect(0,0,canvas.width,TOP);
  ctx.fillRect(0,canvas.height-20,canvas.width,20);

  ctx.textAlign='left';
  ctx.fillStyle='#ffffff';
  ctx.font='10px "Press Start 2P"';
  ctx.fillText('SCORE',8,16);
  ctx.fillStyle='#FFE000';
  ctx.fillText(String(score).padStart(6,'0'),8,30);

  ctx.fillStyle='#ffffff';
  ctx.fillText('LV '+level,canvas.width/2-20,22);

  // lives
  for(let i=0;i<lives;i++){
    const lx=canvas.width-20-(lives-1-i)*18, ly=TOP-8;
    ctx.fillStyle='#FFE000';
    ctx.beginPath();
    ctx.moveTo(lx,ly);
    ctx.arc(lx,ly,7,0.3,Math.PI*2-0.3);
    ctx.closePath();
    ctx.fill();
  }

  // cherry counter (bottom-right)
  for(let i=0;i<3;i++){
    const bx=canvas.width-10-(2-i)*16, by=canvas.height-10;
    const available=i<Cherry.cherriesLeft;
    ctx.fillStyle=available?'#cc0000':'#333';
    ctx.beginPath(); ctx.arc(bx,by,5,0,Math.PI*2); ctx.fill();
    if(available){
      ctx.strokeStyle='#33cc33'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(bx,by-5); ctx.lineTo(bx+3,by-8); ctx.stroke();
    }
  }

  // power timer bar
  if(powerSessionInstance.powerTimer>0){
    ctx.fillStyle='#2121de';
    ctx.fillRect(0,TOP-3,canvas.width*(powerSessionInstance.powerTimer/400),3);
  }
}



function drawTitle(){
  ctx.fillStyle='#000';
  ctx.fillRect(0,0,canvas.width,canvas.height);

  ctx.textAlign='center';
  titleGhosts.forEach(drawGhost);

  ctx.font='36px "Press Start 2P"';
  ctx.fillStyle='#FFE000'; ctx.shadowColor='#FFE000'; ctx.shadowBlur=20;
  ctx.fillText('PAC-MAN',canvas.width/2,160);
  ctx.shadowBlur=0;

  ctx.font='9px "Press Start 2P"';
  ctx.fillStyle='#ffb8ae';
  ctx.fillText("© 1980 NAMCO LTD.", canvas.width/2, 190);
   ctx.fillText("Remastered by Liran Barniv", canvas.width/2, 205);
  ctx.fillText("ALL RIGHTS RESERVED", canvas.width/2, 220);

  ctx.fillStyle='#00ff41';
  ctx.fillText('ARROWS / WASD = MOVE',canvas.width/2,270);
  ctx.fillText('EAT ALL DOTS TO WIN',canvas.width/2,290);
  ctx.fillText('POWER PELLETS = EAT GHOSTS',canvas.width/2,310);

  titleBlink++;
  if(Math.floor(titleBlink/20)%2===0){
    ctx.fillStyle='#FFE000'; ctx.shadowColor='#FFE000'; ctx.shadowBlur=10;
    ctx.font='12px "Press Start 2P"';
    ctx.fillText(isMobile?'TAP PLAY TO START':'PRESS SPACE TO START',canvas.width/2,380);
    ctx.shadowBlur=0;
  }

  ctx.fillStyle='#333'; ctx.font='8px "Press Start 2P"';
  ctx.fillText("1 PLAYER",canvas.width/2,canvas.height-8);

  drawPac(titlePac);
  drawGhost(frightenedGhost);
}

function drawGameOver(){
  ctx.fillStyle='rgba(0,0,0,0.6)';
  ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.textAlign='center';
  ctx.font='24px "Press Start 2P"';
  ctx.fillStyle='#FF0000'; ctx.shadowColor='#FF0000'; ctx.shadowBlur=20;
  ctx.fillText('GAME OVER',canvas.width/2,canvas.height/2-20);
  ctx.shadowBlur=0;
  ctx.font='10px "Press Start 2P"';
  ctx.fillStyle='#FFE000';
  ctx.fillText('SCORE: '+score,canvas.width/2,canvas.height/2+20);
  titleBlink++;
  if(Math.floor(titleBlink/20)%2===0){
    ctx.fillStyle='#fff';
    ctx.fillText('PRESS SPACE TO RESTART',canvas.width/2,canvas.height/2+50);
    ctx.fillText('OR ESCAPE TO RETURN TO TITLE',canvas.width/2,canvas.height/2+70);
  }
}

function drawLevelUp(){
  ctx.fillStyle='rgba(0,0,0,0.5)';
  ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.textAlign='center';
  ctx.font='16px "Press Start 2P"';
  ctx.fillStyle='#00FFFF'; ctx.shadowColor='#00FFFF'; ctx.shadowBlur=15;
  ctx.fillText('LEVEL '+level+' CLEAR!',canvas.width/2,canvas.height/2);
  ctx.shadowBlur=0;
}

function drawExitConfirm(){
  ctx.fillStyle='rgba(0,0,0,0.65)';
  ctx.fillRect(0,0,canvas.width,canvas.height);
  const bw=230, bh=110, bx=canvas.width/2-bw/2, by=canvas.height/2-bh/2;
  ctx.fillStyle='#111';
  ctx.strokeStyle='#FFE000';
  ctx.lineWidth=2;
  ctx.fillRect(bx,by,bw,bh);
  ctx.strokeRect(bx,by,bw,bh);
  ctx.textAlign='center';
  ctx.font='11px "Press Start 2P"';
  ctx.fillStyle='#fff';
  ctx.fillText('EXIT TO MENU?',canvas.width/2,by+36);
  ctx.font='9px "Press Start 2P"';
  ctx.fillStyle='#FFE000';
  if(isMobile){
    ctx.fillText('TAP YES TO EXIT',canvas.width/2,by+64);
    ctx.fillText('TAP NO TO STAY', canvas.width/2,by+82);
  } else {
    ctx.fillText('[Y] YES       [N] NO',canvas.width/2,by+76);
  }
}

// ── MAIN LOOP ─────────────────────────────────────────────
function loop(){
  updateMobileButtons();
  globalDot++;
  ctx.fillStyle='#000';
  ctx.fillRect(0,0,canvas.width,canvas.height);

  if(state==='TITLE'){ 
    drawTitle();
  } 
  else if(state==='GAMEOVER'){ 
    drawMaze();
    drawHUD();
    drawGameOver();
  }
  else {
    drawMaze();
    drawParticles();
    drawPointBubbles();
    Cherry.draw();
    ghosts.forEach(drawGhost);
    if(pac.alive) drawPac(pac);
    drawHUD();

    if(state==='EXIT_CONFIRM'){ drawExitConfirm(); }
    if(state==='PAUSED'){
      ctx.fillStyle='rgba(0,0,0,0.45)';
      ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.fillStyle='#FFE000';
      ctx.font='bold 28px monospace';
      ctx.textAlign='center';
      ctx.fillText('PAUSED',canvas.width/2,canvas.height/2);
      ctx.font='14px monospace';
      ctx.fillText('press space to resume',canvas.width/2,canvas.height/2+28);
    }
    if(state==='PLAYING'){
      powerSessionInstance.update();
      updatePac(pac);
      updateGhosts();
      Cherry.update();
    }
    else if(state==='DEAD'){
      deadTimer--;
      // death animation
      const t=1-(deadTimer/180);
      const px=pac.x*CS+HALF, py=pac.y*CS+HALF+TOP;
      ctx.fillStyle='#FFE000';
      ctx.beginPath();
      ctx.moveTo(px,py);
      ctx.arc(px,py,HALF-1, t*Math.PI, (2-t)*Math.PI);
      ctx.closePath(); ctx.fill();
      if(deadTimer<=0){
        if(lives<=0){ state='GAMEOVER'; titleBlink=0; }
        else { resetPositionsAfterDeath(); state='PLAYING'; }
      }
    }
    else if(state==='LEVELUP'){
      levelTimer--;
      drawLevelUp();
      if(levelTimer<=0){
        level++;
        lives++;  // Gain a life every level up!
        dotsEaten=0; Cherry.cherriesLeft=3;
        maze=RAW.map(r=>r.split('').map(Number));
        resetPositions();
        state='PLAYING';
        beep(523,0.1); beep(659,0.1); beep(784,0.15);
      }
    }
  }
  requestAnimationFrame(loop);
}

function drawPointBubbles(){
  ctx.font='9px "Press Start 2P"';
  ctx.textAlign='center';
  for(let i=pointBubbles.length-1;i>=0;i--){
    const b=pointBubbles[i];
    b.y+=b.dy;
    b.life-=0.018;
    if(b.life<=0){ pointBubbles.splice(i,1); continue; }
    ctx.globalAlpha=Math.min(1,b.life);
    ctx.fillStyle='#FFE000';
    ctx.shadowColor='#FF8800'; ctx.shadowBlur=6;
    ctx.fillText(b.pts,b.x,b.y);
    ctx.shadowBlur=0;
  }
  ctx.globalAlpha=1;
}

// simple particles for power-eat effect
let particles=[];
function drawParticles(){
  for(let i=particles.length-1;i>=0;i--){
    const p=particles[i];
    p.x+=p.dx; p.y+=p.dy; p.life-=0.04;
    if(p.life<=0){particles.splice(i,1);continue;}
    ctx.globalAlpha=p.life;
    ctx.fillStyle=p.c;
    ctx.fillRect(p.x,p.y,p.s,p.s);
  }
  ctx.globalAlpha=1;
}

// ── MOBILE SUPPORT ───────────────────────────────────────
const mobileControls = document.getElementById('mobile-controls');
const btnPrimary     = document.getElementById('btn-primary');
const btnSecondary   = document.getElementById('btn-secondary');
const actionBtns     = document.getElementById('action-btns');

function getDeviceType() {
  const UA = navigator.userAgent;
  
  // 1. Check for specific mobile user agents
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(UA);
  if (isMobileUA) return 'mobile';

  // 2. Check for iPad Pro / iOS touch desktops
  const isMacTouch = navigator.maxTouchPoints > 1 && /Macintosh/.test(UA);
  if (isMacTouch) return 'mobile';

  // 3. Combine coarse pointer with small screen to exclude touch desktops
  const isSmallTouch = window.matchMedia('(pointer:coarse)').matches && window.innerWidth < 1024;
  if (isSmallTouch) return 'mobile';

  return 'desktop';
}

function isMobileDevice() {return getDeviceType() === 'mobile';}

function resizeCanvas(){
  isMobile = isMobileDevice();
  mobileControls.style.display = isMobile ? 'flex' : 'none';
  // menu mode: 64px button + 14px margin; game mode: 204px dpad + 14px margin
  const isMenuMode = mobileControls.classList.contains('menu-mode');
  const controlsH  = isMobile ? (isMenuMode ? 80 : 218) : 0;
  const scaleX = window.innerWidth / canvas.width;
  const scaleY = (window.innerHeight - controlsH) / canvas.height;
  const scale  = Math.min(scaleX, scaleY, 1);
  canvas.style.width  = Math.floor(canvas.width  * scale) + 'px';
  canvas.style.height = Math.floor(canvas.height * scale) + 'px';
}
mobileControls.classList.add('menu-mode'); // game starts on TITLE screen
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Button shown only on menu-like states; gameplay uses D-pad only
const PRIMARY_CFG = {
  TITLE:        ['▶','PLAY', true],
  GAMEOVER:     ['▶','PLAY', true],
  EXIT_CONFIRM: ['✓','YES',  true],
};

const SECONDARY_CFG = {
  EXIT_CONFIRM: ['❌','No',  true],
};

let prevMobileState = '';
function updateMobileButtons(){
  if(state === prevMobileState) return;
  prevMobileState = state;

  // menu-mode: wide horizontal button, no D-pad
  const isMenu = state==='TITLE' || state==='GAMEOVER' || state==='EXIT_CONFIRM';
  mobileControls.classList.toggle('menu-mode',  isMenu);
  mobileControls.classList.toggle('game-mode', !isMenu);
  resizeCanvas(); // always resize on state change so canvas fits before next paint

  const [pi='', pl='', pv=false] = PRIMARY_CFG[state] || [];
  const [si='', sl='', sv=false] = SECONDARY_CFG[state] || [];
  
  actionBtns.style.display  = pv ? '' : 'none';
  btnPrimary.style.display  = pv ? '' : 'none';
  btnSecondary.style.display = sv ? '' : 'none';
  if(pv){
    btnPrimary.querySelector('.btn-icon').textContent  = pi;
    btnPrimary.querySelector('.btn-label').textContent = pl;
  }
  if(sv){
    btnSecondary.querySelector('.btn-icon').textContent  = si;
    btnSecondary.querySelector('.btn-label').textContent = sl;
  }
}

// D-pad: set direction (also handles TITLE/GAMEOVER taps to start)
document.querySelectorAll('#dpad [data-dir]').forEach(btn => {
  const dir = +btn.dataset.dir;
  btn.addEventListener('touchstart', e => {
    e.preventDefault();
    if(AC.state==='suspended') AC.resume();
    if(state==='TITLE'){ state='PLAYING'; resetPositions(); prevMobileState=''; updateMobileButtons(); return; }
    if(state==='GAMEOVER'){ restartGame(); prevMobileState=''; updateMobileButtons(); return; }
    if(state==='EXIT_CONFIRM'){ state=exitPrevState; prevMobileState=''; updateMobileButtons(); return; }
    if(state==='PLAYING'||state==='PAUSED'){ state='PLAYING'; pac.nextDir=dir; }
  }, { passive:false });
});

// Primary action button (PLAY / YES)
btnPrimary.addEventListener('touchstart', e => {
  e.preventDefault();
  if(AC.state==='suspended') AC.resume();
  if(state==='TITLE')             { state='PLAYING'; resetPositions(); }
  else if(state==='GAMEOVER')     { restartGame(); }
  else if(state==='EXIT_CONFIRM') { restartGame(); state='TITLE'; }
  prevMobileState = '';
  updateMobileButtons();
}, { passive:false });

btnSecondary.addEventListener('touchstart', e => {
  e.preventDefault();
  if(AC.state==='suspended') AC.resume();   
    if(state==='EXIT_CONFIRM'){ state=exitPrevState; prevMobileState=''; updateMobileButtons(); }   
}, { passive:false });

// Back button (device or browser) → exit confirm; second back → cancel
history.pushState({pacman:true}, '');
window.addEventListener('popstate', ()=>{
  if(AC.state==='suspended') AC.resume();
  if(state==='PLAYING'||state==='PAUSED'){
    exitPrevState=state; state='EXIT_CONFIRM';
    history.pushState({pacman:true}, '');
  } else if(state==='EXIT_CONFIRM'){
    state=exitPrevState;
    history.pushState({pacman:true}, '');
  }
});

// Unlock AudioContext on first touch (required on iOS)
document.addEventListener('touchstart', ()=>{ if(AC.state==='suspended') AC.resume(); }, { once:true });
// Prevent scroll/bounce during gameplay
document.addEventListener('touchmove', e=>e.preventDefault(), { passive:false });

loop();