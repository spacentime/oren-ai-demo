import {
  DIRS,
  CELL_DOT,
  CELL_WALL,
  CELL_POWER,
  CELL_CAGE_WALL,
  CELL_DOOR,
  CS,
  TOP,
  HALF,
} from './constants.js';

export default class GameRenderer {
  constructor(canvas, game, audio) {
    this.canvas = canvas;
    this.ctx = canvas.getContext2d();
    this.game = game;
    this.audio = audio;
    this.particles = [];
  }

  drawBackground() {
      this.ctx.fillStyle='#000';
      this.ctx.fillRect(0,0,this.canvas.width,this.canvas.height);
  }

  drawMaze(){
    this.game.maze.forEach((row,ry)=>{
      row.forEach((cell,cx)=>{
        const px=cx*CS, py=ry*CS+TOP;
        if(cell===CELL_WALL){
          this.ctx.fillStyle='#1a1aff';
          this.ctx.fillRect(px,py,CS,CS);
          this.ctx.fillStyle='#3333ff';
          this.ctx.fillRect(px+1,py+1,CS-2,CS-2);
          this.ctx.fillStyle='#1a1aff';
          this.ctx.fillRect(px+2,py+2,CS-4,CS-4);
        } else if(cell===CELL_DOT){
          this.ctx.fillStyle='#ffb8ae';
          this.ctx.beginPath();
          this.ctx.arc(px+HALF,py+HALF,2,0,Math.PI*2);
          this.ctx.fill();
        } else if(cell===CELL_POWER){
          if(Math.floor(this.game.globalDot/15)%2===0){
            this.ctx.fillStyle='#ffb8ae';
            this.ctx.shadowColor='#ffb8ae';
            this.ctx.shadowBlur=8;
            this.ctx.beginPath();
            this.ctx.arc(px+HALF,py+HALF,5,0,Math.PI*2);
            this.ctx.fill();
            this.ctx.shadowBlur=0;
          }
        } else if(cell===CELL_CAGE_WALL){
          this.ctx.fillStyle='#aaaaaa';
          this.ctx.fillRect(px,py,CS,CS);
          this.ctx.fillStyle='#ffffff';
          this.ctx.fillRect(px+1,py+1,CS-2,CS-2);
          this.ctx.fillStyle='#dddddd';
          this.ctx.fillRect(px+2,py+2,CS-4,CS-4);
        } else if(cell===CELL_DOOR){
          this.ctx.fillStyle='#FF44FF';
          this.ctx.fillRect(px, py+HALF-1, CS, 3);
        }
      });
    });
  }

  drawPac(pacCharacter){
    const px=pacCharacter.x*CS+HALF, py=pacCharacter.y*CS+HALF+TOP;
    const ma=pacCharacter.mouthAngle;

    this.ctx.shadowColor='#ffff00';
    this.ctx.shadowBlur=10;
    this.ctx.fillStyle='#FFE000';

    const angles=[[0],[Math.PI*1.5],[Math.PI],[Math.PI*0.5]];
    const rot = pacCharacter.isMoving() ? angles[pacCharacter.dir][0] : 0;

    this.ctx.save();
    this.ctx.translate(px,py);
    this.ctx.rotate(rot);
    this.ctx.beginPath();
    this.ctx.moveTo(0,0);
    this.ctx.arc(0,0,pacCharacter.radius,ma,Math.PI*2-ma);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.restore();
    this.ctx.shadowBlur=0;
  }

  drawGhost(g){
    const px=g.x*CS+HALF, py=g.y*CS+HALF+TOP;
    const radius = g.radius || HALF-1;
    const eyeRadiusX = radius / 3;
    const eyeRadiusY = radius / 2.25;
    const eyeOffsetX = radius / 2.5;
    const pupilRadius = eyeRadiusX * 2 / 3;
    const eyesXlist = [-eyeOffsetX, eyeOffsetX];

    const drawEyesEaten = (edx, edy) => {
      eyesXlist.forEach(ox=>{
        this.ctx.fillStyle='#ffffff';
        this.ctx.beginPath();
        this.ctx.ellipse(px+ox, py-3, eyeRadiusX, eyeRadiusY, 0, 0, Math.PI*2);
        this.ctx.fill();
        this.ctx.fillStyle='#000099';
        this.ctx.beginPath();
        this.ctx.arc(px+ox+edx*2, py-3+edy*2, pupilRadius, 0, Math.PI*2);
        this.ctx.fill();
      });
    };

    const drawEyesNormal = () => {
      eyesXlist.forEach(ox=>{
        this.ctx.fillStyle=eyeColor;
        this.ctx.beginPath();
        this.ctx.ellipse(px+ox,py-3,eyeRadiusX,eyeRadiusY,0,0,Math.PI*2);
        this.ctx.fill();
        this.ctx.fillStyle=pupilColor;
        this.ctx.beginPath();
        this.ctx.arc(px+ox+DIRS[g.dir][0]*2,py-3+DIRS[g.dir][1]*2,pupilRadius,0,Math.PI*2);
        this.ctx.fill();
      });
    };

    const drawFrightenedEyes = fc => {
      const eyeRadius = radius / 4.5;
      this.ctx.fillStyle = fc;
      eyesXlist.forEach(ox=>{
        this.ctx.beginPath();
        this.ctx.arc(px+ox, py-4, eyeRadius, 0, Math.PI*2);
        this.ctx.fill();
      });
    };

    if(g.eaten){
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

    const frightened = g.isFrightened(this.game.powerSession);
    const flashing = frightened && this.game.powerSession.isEnding && Math.floor(this.game.globalDot/10)%2===0;

    let bodyColor = frightened ? (flashing ? '#ffffff' : '#2121de') : g.color;
    let eyeColor = frightened ? '#ffb852' : '#ffffff';
    let pupilColor = frightened ? '#ffb852' : '#000099';

    this.ctx.shadowColor=bodyColor;
    this.ctx.shadowBlur=8;
    this.ctx.fillStyle=bodyColor;

    this.ctx.beginPath();
    this.ctx.arc(px,py-2,radius,Math.PI,0);
    const wb=py+radius-4;
    this.ctx.lineTo(px+radius,wb);
    const segs=3, sw=(radius*2)/segs;
    for(let i=segs;i>=0;i--){
      const bx=px-radius+i*sw;
      const by=i%2===0?wb:wb+4;
      this.ctx.lineTo(bx,by);
    }
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.shadowBlur=0;

    if(!frightened){
      drawEyesNormal();
    } else {
      const fc = flashing ? '#2121de' : '#ffffff';
      drawFrightenedEyes(fc);
      const mouthWidth = radius / 1.8;
      const mouthHeight = radius / 3;
      this.ctx.strokeStyle = fc;
      this.ctx.lineWidth = radius/6;
      this.ctx.lineJoin = 'round';
      this.ctx.beginPath();
      let my =py+radius/4;
      this.ctx.moveTo(px-mouthWidth, my+mouthHeight);
      this.ctx.lineTo(px-(mouthWidth/2), my);
      this.ctx.lineTo(px,    my+mouthHeight);
      this.ctx.lineTo(px+(mouthWidth/2),my);
      this.ctx.lineTo(px+mouthWidth,  my+mouthHeight);
      this.ctx.stroke();
    }
  }

  drawSpeaker(on) {
    const lx = this.canvas.width - 35;
    const ly = 0;

    this.ctx.fillStyle = '#ffffff';
    this.ctx.beginPath();
    this.ctx.moveTo(lx, ly + 6);
    this.ctx.lineTo(lx + 6, ly + 6);
    this.ctx.lineTo(lx + 16, ly);
    this.ctx.lineTo(lx + 16, ly + 22);
    this.ctx.lineTo(lx + 6, ly + 16);
    this.ctx.lineTo(lx, ly + 16);
    this.ctx.closePath();
    this.ctx.fill();

    if (on) {
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        const radius = 6 + i * 4;
        this.ctx.beginPath();
        this.ctx.arc(lx + 18, ly + 11, radius, -Math.PI / 4, Math.PI / 4);
        this.ctx.stroke();
      }
    } else {
      this.ctx.strokeStyle = '#ff5555';
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.moveTo(lx + 22, ly + 2);
      this.ctx.lineTo(lx + 32, ly + 20);
      this.ctx.moveTo(lx + 32, ly + 2);
      this.ctx.lineTo(lx + 22, ly + 20);
      this.ctx.stroke();
    }
  }

  drawHUD(){
    this.ctx.fillStyle='#000';
    this.ctx.fillRect(0,0,this.canvas.width,TOP);
    this.ctx.fillRect(0,this.canvas.height-20,this.canvas.width,20);

    this.ctx.textAlign='left';
    this.ctx.fillStyle='#ffffff';
    this.ctx.font='10px "Press Start 2P"';
    this.ctx.fillText('SCORE',8,16);
    this.ctx.fillStyle='#FFE000';
    this.ctx.fillText(String(this.game.score).padStart(6,'0'),8,30);

    this.ctx.fillStyle='#ffffff';
    this.ctx.fillText('LEVEL '+this.game.level,this.canvas.width/2-20,22);

    this.drawSpeaker(!this.audio.isMuted);

    for(let i=1;i<this.game.lives;i++){
      const lx=this.canvas.width-20-(this.game.lives-1-i)*18, ly=TOP-8;
      this.ctx.fillStyle='#FFE000';
      this.ctx.beginPath();
      this.ctx.moveTo(lx,ly);
      this.ctx.arc(lx,ly,7,0.3,Math.PI*2-0.3);
      this.ctx.closePath();
      this.ctx.fill();
    }

    for(let i=0;i<3;i++){
      const bx=this.canvas.width-10-(2-i)*16, by=this.canvas.height-10;
      const available=i<this.game.cherry.cherriesLeft;
      this.ctx.fillStyle=available?'#cc0000':'#333';
      this.ctx.beginPath(); this.ctx.arc(bx,by,5,0,Math.PI*2); this.ctx.fill();
      if(available){
        this.ctx.strokeStyle='#33cc33'; this.ctx.lineWidth=1;
        this.ctx.beginPath(); this.ctx.moveTo(bx,by-5); this.ctx.lineTo(bx+3,by-8); this.ctx.stroke();
      }
    }

    if(this.game.powerSession.powerTimer>0){
      this.ctx.fillStyle='#2121de';
      this.ctx.fillRect(0,TOP-3,this.canvas.width*(this.game.powerSession.powerTimer/400),3);
    }
  }

  drawTitle(){
    this.ctx.fillStyle='#000';
    this.ctx.fillRect(0,0,this.canvas.width,this.canvas.height);

    this.ctx.textAlign='center';
    this.game.titleGhosts.forEach(g => this.drawGhost(g));

    this.ctx.font='36px "Press Start 2P"';
    this.ctx.fillStyle='#FFE000'; this.ctx.shadowColor='#FFE000'; this.ctx.shadowBlur=20;
    this.ctx.fillText('PAC-MAN',this.canvas.width/2,160);
    this.ctx.shadowBlur=0;

    this.ctx.font='9px "Press Start 2P"';
    this.ctx.fillStyle='#ffb8ae';
    this.ctx.fillText("© 1980 NAMCO LTD.", this.canvas.width/2, 190);
    this.ctx.fillText("Remastered by Liran Barniv", this.canvas.width/2, 205);
    this.ctx.fillText("ALL RIGHTS RESERVED", this.canvas.width/2, 220);

    this.ctx.fillStyle='#00ff41';
    this.ctx.fillText('ARROWS / WASD = MOVE',this.canvas.width/2,270);
    this.ctx.fillText('EAT ALL DOTS TO WIN',this.canvas.width/2,290);
    this.ctx.fillText('POWER PELLETS = EAT GHOSTS',this.canvas.width/2,310);

    this.game.incrementTitleBlink();
    if(Math.floor(this.game.titleBlink/20)%2===0){
      this.ctx.fillStyle='#FFE000'; this.ctx.shadowColor='#FFE000'; this.ctx.shadowBlur=10;
      this.ctx.font='12px "Press Start 2P"';
      this.ctx.fillText(this.game.isMobile?'TAP PLAY TO START':'PRESS SPACE TO START',this.canvas.width/2,380);
      this.ctx.shadowBlur=0;
    }

    this.ctx.fillStyle='#333'; this.ctx.font='8px "Press Start 2P"';
    this.ctx.fillText("1 PLAYER",this.canvas.width/2,this.canvas.height-8);

    this.drawPac(this.game.titlePac);
    this.drawGhost(this.game.frightenedGhost);
    this.drawSpeaker(!this.audio.isMuted);
  }

  drawGameOver(){
    this.ctx.fillStyle='rgba(0,0,0,0.6)';
    this.ctx.fillRect(0,0,this.canvas.width,this.canvas.height);
    this.ctx.textAlign='center';
    this.ctx.font='24px "Press Start 2P"';
    this.ctx.fillStyle='#FF0000'; this.ctx.shadowColor='#FF0000'; this.ctx.shadowBlur=20;
    this.ctx.fillText('GAME OVER',this.canvas.width/2,this.canvas.height/2-20);
    this.ctx.shadowBlur=0;
    this.ctx.font='10px "Press Start 2P"';
    this.ctx.fillStyle='#FFE000';
    this.ctx.fillText('SCORE: '+this.game.score,this.canvas.width/2,this.canvas.height/2+20);
    this.game.incrementTitleBlink();
    if(Math.floor(this.game.titleBlink/20)%2===0){
      this.ctx.fillStyle='#fff';
      this.ctx.fillText('PRESS SPACE TO RESTART',this.canvas.width/2,this.canvas.height/2+50);
      this.ctx.fillText('OR ESCAPE TO RETURN TO TITLE',this.canvas.width/2,this.canvas.height/2+70);
    }
  }

  drawLevelUp(){
    this.ctx.fillStyle='rgba(0,0,0,0.5)';
    this.ctx.fillRect(0,0,this.canvas.width,this.canvas.height);
    this.ctx.textAlign='center';
    this.ctx.font='16px "Press Start 2P"';
    this.ctx.fillStyle='#00FFFF'; this.ctx.shadowColor='#00FFFF'; this.ctx.shadowBlur=15;
    this.ctx.fillText('LEVEL '+this.game.level+' CLEAR!',this.canvas.width/2,this.canvas.height/2);
    this.ctx.shadowBlur=0;
  }

  drawExitConfirm(){
    this.ctx.fillStyle='rgba(0,0,0,0.65)';
    this.ctx.fillRect(0,0,this.canvas.width,this.canvas.height);
    const bw=230, bh=110, bx=this.canvas.width/2-bw/2, by=this.canvas.height/2-bh/2;
    this.ctx.fillStyle='#111';
    this.ctx.strokeStyle='#FFE000';
    this.ctx.lineWidth=2;
    this.ctx.fillRect(bx,by,bw,bh);
    this.ctx.strokeRect(bx,by,bw,bh);
    this.ctx.textAlign='center';
    this.ctx.font='11px "Press Start 2P"';
    this.ctx.fillStyle='#fff';
    this.ctx.fillText('EXIT TO MENU?',this.canvas.width/2,by+36);
    this.ctx.font='9px "Press Start 2P"';
    this.ctx.fillStyle='#FFE000';
    if(this.game.isMobile){
      this.ctx.fillText('TAP YES TO EXIT',this.canvas.width/2,by+64);
      this.ctx.fillText('TAP NO TO STAY', this.canvas.width/2,by+82);
    } else {
      this.ctx.fillText('[Y] YES       [N] NO',this.canvas.width/2,by+76);
    }
  }

  drawPointBubbles(pointBubbles){
    this.ctx.font='9px "Press Start 2P"';
    this.ctx.textAlign='center';
    for(let i=pointBubbles.length-1;i>=0;i--){
      const b=pointBubbles[i];
      b.y+=b.dy;
      b.life-=0.018;
      if(b.life<=0){ pointBubbles.splice(i,1); continue; }
      this.ctx.globalAlpha=Math.min(1,b.life);
      this.ctx.fillStyle='#FFE000';
      this.ctx.shadowColor='#FF8800'; this.ctx.shadowBlur=6;
      this.ctx.fillText(b.pts,b.x,b.y);
      this.ctx.shadowBlur=0;
    }
    this.ctx.globalAlpha=1;
  }

  drawParticles(){
    for(let i=this.particles.length-1;i>=0;i--){
      const p=this.particles[i];
      p.x+=p.dx; p.y+=p.dy; p.life-=0.04;
      if(p.life<=0){this.particles.splice(i,1);continue;}
      this.ctx.globalAlpha=p.life;
      this.ctx.fillStyle=p.c;
      this.ctx.fillRect(p.x,p.y,p.s,p.s);
    }
    this.ctx.globalAlpha=1;
  }

  drawPause (){
    let ctx =this.ctx;
    let canvas = this.canvas;
    ctx.fillStyle='rgba(0,0,0,0.45)';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle='#FFE000';
    ctx.font='bold 28px monospace';
    ctx.textAlign='center';
    ctx.fillText('PAUSED',canvas.width/2,canvas.height/2);
    ctx.font='14px monospace';
    ctx.fillText('press space to resume',canvas.width/2,canvas.height/2+28);
  }

  drawDead(deadTimer,pacX, pacY) {
    let ctx =this.ctx;
    const t=1-(deadTimer/180);
    const px=pacX*CS+HALF, py=pacY*CS+HALF+TOP;
    ctx.fillStyle='#FFE000';
    ctx.beginPath();
    ctx.moveTo(px,py);
    ctx.arc(px,py,HALF-1, t*Math.PI, (2-t)*Math.PI);
    ctx.closePath(); ctx.fill();
  }

  drawCherry(cherry) {
    if (!cherry?.active?.isVisible) return;

    const px = cherry.active.x * CS + HALF;
    const py = cherry.active.y * CS + HALF + TOP;
    let ctx = this.ctx;

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
