let AC= undefined; 

export default class Audio {
  _mute = false;

  constructor(audioContext) {
    AC = audioContext;
  }

  get isMuted () {
    return this._mute; 
  }

  beep(f,d,t='square',v=0.25) {
    try{
      const o=AC.createOscillator(), g=AC.createGain();
      o.connect(g); g.connect(AC.destination);
      o.type=t; o.frequency.value=f;
      g.gain.setValueAtTime(v,AC.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001,AC.currentTime+d);
      o.start(); o.stop(AC.currentTime+d);
    }catch(e){}
  }

  playEat(){ this.beep(440+Math.random()*80,0.04,'square',0.15); }
  playDeath(){
    [523,415,330,262,208,165,131].forEach((f,i)=>setTimeout(()=>this.beep(f,0.12,'sawtooth'),i*120));
  }
  playPowerUp(){ this.beep(660,0.08); setTimeout(()=>this.beep(880,0.12),80); }

  // Strongly-named wrapper for external usage
  playTone(frequency, duration, type='square', volume=0.25){
    return this.beep(frequency, duration, type, volume);
  }

  // Play the cherry-collected jingle
  playCherryEaten(){
    try{
      // sequence of tones for cherry
      this.playTone(1047, 0.06);
      setTimeout(()=>this.playTone(1319, 0.08), 60);
      setTimeout(()=>this.playTone(1568, 0.1), 120);
      console.log('Audio: playCherryEaten');
    }catch(e){}
  }

  // Play ghost-eaten jingle
  playGhostEaten(){
    try{
      this.playTone(880, 0.05);
      setTimeout(()=>this.playTone(1100, 0.08), 30);
      console.log('Audio: playGhostEaten');
    }catch(e){}
  }

  // Play level-up jingle
  playLevelUp(){
    try{
      this.playTone(523, 0.1);
      setTimeout(()=>this.playTone(659, 0.1), 80);
      setTimeout(()=>this.playTone(784, 0.15), 160);
      console.log('Audio: playLevelUp');
    }catch(e){}
  }

  toggleSound(on){
    if(on){
      this._mute = false;
      AC.resume();
    } else {
      this._mute = true;
      AC.suspend();
    }
  }

  toggleMute(){
    this._mute = !this._mute;
    this._mute ? AC.suspend() : AC.resume();
  }

}