export default class PowerSession {
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
