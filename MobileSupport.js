// ── MOBILE SUPPORT ───────────────────────────────────────

let mobileControls = null;
let btnPrimary   = null;
let btnSecondary = null;
let actionBtns   = null;
let game = {};
let gameCanvas = {};
let audio = {};
let prevMobileState = '';

 // Button shown only on menu-like states; gameplay uses D-pad only
const PRIMARY_CFG = {
    TITLE:        ['▶','PLAY', true],
    GAMEOVER:     ['▶','PLAY', true],
    EXIT_CONFIRM: ['✓','YES',  true],
};

const SECONDARY_CFG = {
    EXIT_CONFIRM: ['❌','No',  true],
};

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

export default class MobileSupport
{
    constructor(pGame, pGameCanvas, pAudio) {
        game = pGame;
        gameCanvas = pGameCanvas;
        audio = pAudio;
    }

    updateMobileButtons(){
        if(game.state === prevMobileState) return;
            prevMobileState = game.state;

            // menu-mode: wide horizontal button, no D-pad
            const isMenu = game.state==='TITLE' || game.state==='GAMEOVER' || game.state==='EXIT_CONFIRM';
            mobileControls.classList.toggle('menu-mode',  isMenu);
            mobileControls.classList.toggle('game-mode', !isMenu);
            this.resizeCanvas(); // always resize on state change so canvas fits before next paint

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
    
    resizeCanvas(){

        const isMobileDevice = () => getDeviceType() === 'mobile';

        const isMobile = isMobileDevice();
        game.updateMobileState(isMobile);
        mobileControls.style.display = isMobile ? 'flex' : 'none';
        // menu mode: 64px button + 14px margin; game mode: 204px dpad + 14px margin
        const isMenuMode = mobileControls.classList.contains('menu-mode');
        const controlsH  = isMobile ? (isMenuMode ? 80 : 218) : 0;
        gameCanvas.setToScale(controlsH);
    }

    run() {
        mobileControls = document.getElementById('mobile-controls');
        btnPrimary     = document.getElementById('btn-primary');
        btnSecondary   = document.getElementById('btn-secondary');
        actionBtns     = document.getElementById('action-btns');

        mobileControls.classList.add('menu-mode'); // game starts on TITLE screen
        window.addEventListener('resize', this.resizeCanvas());
        this.resizeCanvas();

        let prevMobileState = '';
        
        // D-pad: set direction (also handles TITLE/GAMEOVER taps to start)
        document.querySelectorAll('#dpad [data-dir]').forEach(btn => {
            const dir = +btn.dataset.dir;
            btn.addEventListener('touchstart', e => {
                e.preventDefault();
                audio.toggleSound(true);
                game.handleDpadDirection(dir);
                prevMobileState = '';
                this.updateMobileButtons();
            }, { passive:false });
        });

        // Primary action button (PLAY / YES)
        btnPrimary.addEventListener('touchstart', e => {
            e.preventDefault();
            audio.toggleSound(true);
            game.handleKeyDown('Enter');
            prevMobileState = '';
            this.updateMobileButtons();
            }, { passive:false });

            btnSecondary.addEventListener('touchstart', e => {
            e.preventDefault();
            audio.toggleSound(true);
                game.handleKeyDown('KeyN');
                prevMobileState = '';
                this.updateMobileButtons();
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
    }
}