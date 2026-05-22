import {
  ROWS,
  COLS,
  CS,
  TOP,
} from './constants.js';

export default class GameCanvas {
    #canvas = {}

    constructor() {
        var canvas = document.getElementById('c');
        canvas.width = COLS * CS;
        canvas.height = ROWS * CS + TOP + 20;
        this.#canvas = canvas;
    }

    getContext2d() {
        return this.#canvas.getContext("2d");
    }

    get element() {
        return this.#canvas;
    }
     
    setDimensions(width, height) {
        this.width(width);
        this.height(height);
        return this;
    }
    
    setToScale(controlsH) {
        const scaleX = window.innerWidth / this.width;
        const scaleY = (window.innerHeight - controlsH) / this.height;
        const scale  = Math.min(scaleX, scaleY, 1);
        this.setStyleDimensions(
             Math.floor(this.width  * scale) + 'px',
             Math.floor(this.height * scale) + 'px');

    }
    setStyleDimensions(width, height) {
        this.element.style.width = width;
        this.element.style.height= height;
        return this;
    }

    get width() { return this.#canvas.width; }

    set width(value) {
        this.#canvas.width = value;
    }

    get height() { return this.#canvas.height; }

    set height(value) {
        this.#canvas.height = value;
    }

}