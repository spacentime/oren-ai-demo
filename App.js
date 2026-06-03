import Logger from "./Logger.js";

let loopContext = null;

export default class App {
    game;
    mobileSupport;
    renderer;
    canvas;
    settings = {};
    logger;
    
    
    constructor(logger, settings, game, mobileSupport, renderer, canvas) {
        if (!(logger instanceof Logger)) throw new Error('logger is missing');
        this.logger = logger;
        this.settings = settings;
        this.game = game;
        this.mobileSupport = mobileSupport;
        this.renderer = renderer;
        this.canvas = canvas;
        loopContext = this;
    }

    addInput() {
        // ── INPUT ────────────────────────────────────────────────
        document.addEventListener('keydown',e=>{
            this.game.handleKeyDown(e.code);
            e.preventDefault();
        });
    }

    run() {
       this.addInput();
       this.mobileSupport.run();
       loop();
    }
}

 // ── MAIN LOOP ─────────────────────────────────────────────
    function loop(){ 
        let ctx = loopContext.canvas.getContext2d();
        let mobileSupport = loopContext.mobileSupport;
        let game = loopContext.game;
        let renderer = loopContext.renderer;

        mobileSupport.updateMobileButtons();
        game.incrementGlobalDot();
        renderer.drawBackground();

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
            
            game.ghosts.forEach(g => renderer.drawGhost(g));
            if(game.pac.alive) renderer.drawPac(game.pac);
            renderer.drawHUD();

            if(game.state==='EXIT_CONFIRM'){ renderer.drawExitConfirm(); }
            if(game.state==='PAUSED'){
                renderer.drawPause();
            }
            if(game.state==='PLAYING'){
                game.updateGameplay();
                game.updateCherryCollection(game.globalDot);
                renderer.drawCherry(game.cherry);
            }
            else if(game.state==='DEAD'){
                renderer.drawDead(game.deadTimer, game.pac.x, game.pac.y);
                game.updateDeadState();
            }
            else if(game.state==='LEVELUP'){
                renderer.drawLevelUp();
                game.updateLevelUp();
            }
        }
        requestAnimationFrame(loop);
    }