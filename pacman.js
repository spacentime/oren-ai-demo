import {
  directions,
  DIRS,
  CELL_DOT,
  CELL_WALL,
  CELL_POWER,
  CELL_CAGE_WALL,
  CELL_DOOR,
  CELL_EATEN,
  CELL_CAGE_INTERIOR,
  RAW,
  ROWS,
  COLS,
  CS,
  TOP,
  TILE,
  HALF,
} from './constants.js';
import Game from './Game.js';
import Audio from './Audio.js';
import GameRenderer from './GameRenderer.js';

const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

canvas.width = COLS * CS;
canvas.height = ROWS * CS + TOP + 20;

// Parse maze
let maze = RAW.map(r => r.split('').map(Number));

// Count total dots
let totalDots = 0;
maze.forEach(r => r.forEach(c => { if(c===CELL_DOT||c===CELL_POWER) totalDots++; }));

// ── AUDIO ────────────────────────────────────────────────

const AC = new (window.AudioContext||window.webkitAudioContext)();
let audio = new Audio(AC);

// Pass the entire audio object into Game so it can call methods directly
// (Game will access `playEat`, `playDeath`, `playPowerUp`, S`toggleMute`, `isMuted`, etc.)
// ── GAME INSTANCE ────────────────────────────────────────
const game = new Game(audio);

// ── UPDATE ───────────────────────────────────────────────
// (All update logic is now in Game class)

// ── INPUT ────────────────────────────────────────────────
document.addEventListener('keydown',e=>{
  game.handleKeyDown(e.code);
  e.preventDefault();
});

// ── DRAW ─────────────────────────────────────────────────
const renderer = new GameRenderer(canvas, ctx, game, audio);

// ── MAIN LOOP ─────────────────────────────────────────────
function loop(){
  updateMobileButtons();
  game.incrementGlobalDot();
  ctx.fillStyle='#000';
  ctx.fillRect(0,0,canvas.width,canvas.height);

  if(game.state==='TITLE'){
    renderer.drawTitle();
  } 
  else if(game.state==='GAMEOVER'){
    renderer.drawMaze();
    renderer.drawHUD();
    renderer.drawGameOver();
  }
  else {
    renderer.drawMaze();
    renderer.drawParticles();
    renderer.drawPointBubbles(game.pointBubbles);
    game.cherry.draw(ctx, game.globalDot);
    game.ghosts.forEach(g => renderer.drawGhost(g));
    if(game.pac.alive) renderer.drawPac(game.pac);
    renderer.drawHUD();

    if(game.state==='EXIT_CONFIRM'){ renderer.drawExitConfirm(); }
    if(game.state==='PAUSED'){
      ctx.fillStyle='rgba(0,0,0,0.45)';
      ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.fillStyle='#FFE000';
      ctx.font='bold 28px monospace';
      ctx.textAlign='center';
      ctx.fillText('PAUSED',canvas.width/2,canvas.height/2);
      ctx.font='14px monospace';
      ctx.fillText('press space to resume',canvas.width/2,canvas.height/2+28);
    }
    if(game.state==='PLAYING'){
      game.updateGameplay();
      game.updateCherryCollection();
    }
    else if(game.state==='DEAD'){
      const t=1-(game.deadTimer/180);
      const px=game.pac.x*CS+HALF, py=game.pac.y*CS+HALF+TOP;
      ctx.fillStyle='#FFE000';
      ctx.beginPath();
      ctx.moveTo(px,py);
      ctx.arc(px,py,HALF-1, t*Math.PI, (2-t)*Math.PI);
      ctx.closePath(); ctx.fill();
      game.updateDeadState();
    }
    else if(game.state==='LEVELUP'){
      renderer.drawLevelUp();
      game.updateLevelUp();
    }
  }
  requestAnimationFrame(loop);
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
  const isMobile = isMobileDevice();
  game.updateMobileState(isMobile);
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
  if(game.state === prevMobileState) return;
  prevMobileState = game.state;

  // menu-mode: wide horizontal button, no D-pad
  const isMenu = game.state==='TITLE' || game.state==='GAMEOVER' || game.state==='EXIT_CONFIRM';
  mobileControls.classList.toggle('menu-mode',  isMenu);
  mobileControls.classList.toggle('game-mode', !isMenu);
  resizeCanvas(); // always resize on state change so canvas fits before next paint

  const [pi='', pl='', pv=false] = PRIMARY_CFG[game.state] || [];
  const [si='', sl='', sv=false] = SECONDARY_CFG[game.state] || [];
  
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
    audio.toggleSound(true);
    game.handleDpadDirection(dir);
    prevMobileState = '';
    updateMobileButtons();
  }, { passive:false });
});

// Primary action button (PLAY / YES)
btnPrimary.addEventListener('touchstart', e => {
  e.preventDefault();
  audio.toggleSound(true);
  game.handleKeyDown('Enter');
  prevMobileState = '';
  updateMobileButtons();
}, { passive:false });

btnSecondary.addEventListener('touchstart', e => {
  e.preventDefault();
  audio.toggleSound(true);
    game.handleKeyDown('KeyN');
    prevMobileState = '';
    updateMobileButtons();
}, { passive:false });

// Back button (device or browser) → exit confirm; second back → cancel
history.pushState({pacman:true}, '');
window.addEventListener('popstate', ()=>{
  audio.toggleSound(true);
  if(game.handleBackButton()){
    history.pushState({pacman:true}, '');
  }
});

// Unlock AudioContext on first touch (required on iOS)
document.addEventListener('touchstart', ()=>{ audio.toggleSound(true); }, { once:true });
// Prevent scroll/bounce during gameplay
document.addEventListener('touchmove', e=>e.preventDefault(), { passive:false });

loop();