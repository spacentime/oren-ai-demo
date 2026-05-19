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

// ── GAME INSTANCE ────────────────────────────────────────
const game = new Game({
  playEat,
  playDeath,
  playPowerUp,
  beep,
});

// ── UPDATE ───────────────────────────────────────────────
// (All update logic is now in Game class)

// ── INPUT ────────────────────────────────────────────────
document.addEventListener('keydown',e=>{
  game.handleKeyDown(e.code);
  e.preventDefault();
});

// ── DRAW ─────────────────────────────────────────────────
function drawMaze(){
  game.maze.forEach((row,ry)=>{
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
        if(Math.floor(game.globalDot/15)%2===0){
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

function drawPac(pacCharacter){
  const px=pacCharacter.x*CS+HALF, py=pacCharacter.y*CS+HALF+TOP;
  const ma=pacCharacter.mouthAngle;

  ctx.shadowColor='#ffff00';
  ctx.shadowBlur=10;
  ctx.fillStyle='#FFE000';

  // rotation based on dir
  const angles=[[0],[Math.PI*1.5],[Math.PI],[Math.PI*0.5]];
  const rot = pacCharacter.isMoving() ? angles[pacCharacter.dir][0] : 0;

  ctx.save();
  ctx.translate(px,py);
  ctx.rotate(rot);
  ctx.beginPath();
  ctx.moveTo(0,0);
  ctx.arc(0,0,pacCharacter.radius,ma,Math.PI*2-ma); // draw as a circle with a wedge missing for the mouth
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

  const frightened = g.isFrightened(game.powerSession);
  const flashing=frightened&&game.powerSession.isEnding&&Math.floor(game.globalDot/10)%2===0;

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
  ctx.fillText(String(game.score).padStart(6,'0'),8,30);

  ctx.fillStyle='#ffffff';
  ctx.fillText('LV '+game.level,canvas.width/2-20,22);

  // lives
  for(let i=0;i<game.lives;i++){
    const lx=canvas.width-20-(game.lives-1-i)*18, ly=TOP-8;
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
    const available=i<game.cherry.cherriesLeft;
    ctx.fillStyle=available?'#cc0000':'#333';
    ctx.beginPath(); ctx.arc(bx,by,5,0,Math.PI*2); ctx.fill();
    if(available){
      ctx.strokeStyle='#33cc33'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(bx,by-5); ctx.lineTo(bx+3,by-8); ctx.stroke();
    }
  }

  // power timer bar
  if(game.powerSession.powerTimer>0){
    ctx.fillStyle='#2121de';
    ctx.fillRect(0,TOP-3,canvas.width*(game.powerSession.powerTimer/400),3);
  }
}



function drawTitle(){
  ctx.fillStyle='#000';
  ctx.fillRect(0,0,canvas.width,canvas.height);

  ctx.textAlign='center';
  game.titleGhosts.forEach(drawGhost);

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

  game.incrementTitleBlink();
  if(Math.floor(game.titleBlink/20)%2===0){
    ctx.fillStyle='#FFE000'; ctx.shadowColor='#FFE000'; ctx.shadowBlur=10;
    ctx.font='12px "Press Start 2P"';
    ctx.fillText(game.isMobile?'TAP PLAY TO START':'PRESS SPACE TO START',canvas.width/2,380);
    ctx.shadowBlur=0;
  }

  ctx.fillStyle='#333'; ctx.font='8px "Press Start 2P"';
  ctx.fillText("1 PLAYER",canvas.width/2,canvas.height-8);

  drawPac(game.titlePac);
  drawGhost(game.frightenedGhost);
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
  ctx.fillText('SCORE: '+game.score,canvas.width/2,canvas.height/2+20);
  game.incrementTitleBlink();
  if(Math.floor(game.titleBlink/20)%2===0){
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
  ctx.fillText('LEVEL '+game.level+' CLEAR!',canvas.width/2,canvas.height/2);
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
  if(game.isMobile){
    ctx.fillText('TAP YES TO EXIT',canvas.width/2,by+64);
    ctx.fillText('TAP NO TO STAY', canvas.width/2,by+82);
  } else {
    ctx.fillText('[Y] YES       [N] NO',canvas.width/2,by+76);
  }
}

// ── MAIN LOOP ─────────────────────────────────────────────
function loop(){
  updateMobileButtons();
  game.incrementGlobalDot();
  ctx.fillStyle='#000';
  ctx.fillRect(0,0,canvas.width,canvas.height);

  if(game.state==='TITLE'){
    drawTitle();
  } 
  else if(game.state==='GAMEOVER'){
    drawMaze();
    drawHUD();
    drawGameOver();
  }
  else {
    drawMaze();
    drawParticles();
    drawPointBubbles(game.pointBubbles);
    game.cherry.draw(ctx, game.globalDot);
    game.ghosts.forEach(drawGhost);
    if(game.pac.alive) drawPac(game.pac);
    drawHUD();

    if(game.state==='EXIT_CONFIRM'){ drawExitConfirm(); }
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
      drawLevelUp();
      game.updateLevelUp();
    }
  }
  requestAnimationFrame(loop);
}

function drawPointBubbles(pointBubbles){
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
    if(AC.state==='suspended') AC.resume();
    game.handleDpadDirection(dir);
    prevMobileState = '';
    updateMobileButtons();
  }, { passive:false });
});

// Primary action button (PLAY / YES)
btnPrimary.addEventListener('touchstart', e => {
  e.preventDefault();
  if(AC.state==='suspended') AC.resume();
  game.handleKeyDown('Enter');
  prevMobileState = '';
  updateMobileButtons();
}, { passive:false });

btnSecondary.addEventListener('touchstart', e => {
  e.preventDefault();
  if(AC.state==='suspended') AC.resume();   
    game.handleKeyDown('KeyN');
    prevMobileState = '';
    updateMobileButtons();
}, { passive:false });

// Back button (device or browser) → exit confirm; second back → cancel
history.pushState({pacman:true}, '');
window.addEventListener('popstate', ()=>{
  if(AC.state==='suspended') AC.resume();
  if(game.handleBackButton()){
    history.pushState({pacman:true}, '');
  }
});

// Unlock AudioContext on first touch (required on iOS)
document.addEventListener('touchstart', ()=>{ if(AC.state==='suspended') AC.resume(); }, { once:true });
// Prevent scroll/bounce during gameplay
document.addEventListener('touchmove', e=>e.preventDefault(), { passive:false });

loop();