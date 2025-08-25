// Engine v6: adds simple Audio, toasts, and input helpers
export class AudioBus {
  constructor() {
    this.enabled = true;
    this.master = 0.8;
    this.ctx = null;
  }
  _ctx() {
    if (!this.ctx) {
      const A = window.AudioContext || window.webkitAudioContext;
      if (A) this.ctx = new A();
    }
    return this.ctx;
  }
  tone(freq=440, duration=0.1, type='sine', gain=0.15) {
    if (!this.enabled) return;
    const ctx = this._ctx(); if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = gain * this.master;
    o.connect(g); g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + duration);
  }
  click(){ this.tone(880,0.05,'square',0.12); }
  loot(){ this.tone(620,0.08,'triangle',0.18); this.tone(820,0.08,'triangle',0.12); }
  hurt(){ this.tone(220,0.12,'sawtooth',0.18); }
  parry(){ this.tone(1000,0.06,'square',0.18); this.tone(1400,0.08,'square',0.14); }
  shoot(){ this.tone(520,0.05,'square',0.12); }
  swap(){ this.tone(300,0.06,'sine',0.12); }
}

export class Engine {
  constructor(canvas, ui) {
    this.canvas = canvas;
    this.ui = ui;
    this.ctx = canvas.getContext('2d');
    this.keys = {};
    this.scenes = new Map();
    this.current = null;
    this.timeScale = 1;
    this.audio = new AudioBus();

    // Camera
    this.cam = { x:0, y:0, w: 960, h: 540 };

    // Resize
    this.dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.canvas.style.width = w + "px";
      this.canvas.style.height = h + "px";
      this.canvas.width = Math.floor(w * this.dpr);
      this.canvas.height = Math.floor(h * this.dpr);
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      const scale = Math.min(w/this.cam.w, h/this.cam.h);
      this.viewScale = scale;
      this.viewX = (w - this.cam.w*scale)/2;
      this.viewY = (h - this.cam.h*scale)/2;
    };
    window.addEventListener('resize', resize);
    resize();

    // Input
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' || e.code === 'Tab') e.preventDefault();
      this.keys[e.code] = true;
    });
    window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });

    // Loop
    this.last = 0;
    const step = (ts) => {
      if (!this.last) this.last = ts;
      let rawDt = (ts - this.last) / 1000;
      if (rawDt > 0.05) rawDt = 0.05;
      this.last = ts;

      const scaledDt = rawDt * this.timeScale;
      if (this.current?.update) this.current.update(scaledDt, rawDt);
      if (this.current?.draw) this.current.draw(this.ctx);
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  addScene(name, scene) { this.scenes.set(name, scene); }
  start(name, data) {
    const scene = this.scenes.get(name);
    if (!scene) return console.error("Escena no encontrada:", name);
    if (this.current?.stop) this.current.stop();
    this.current = scene;
    this.ui.innerHTML = "";
    if (scene.start) scene.start(data);
  }

  toast(text, ms=1400) {
    const div = document.createElement('div');
    div.textContent = text;
    div.className = 'panel';
    div.style.position = 'fixed';
    div.style.left = '50%';
    div.style.top = '12px';
    div.style.transform = 'translateX(-50%)';
    div.style.zIndex = 10;
    this.ui.appendChild(div);
    setTimeout(()=>div.remove(), ms);
  }
}
