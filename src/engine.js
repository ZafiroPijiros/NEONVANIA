export class Engine {
  constructor(canvas, ui) {
    this.canvas = canvas;
    this.ui = ui;
    this.ctx = canvas.getContext('2d');
    this.keys = {};
    this.scenes = new Map();
    this.current = null;

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
    };
    window.addEventListener('resize', resize);
    resize();

    // Input
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') e.preventDefault();
      this.keys[e.code] = true;
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    // Loop
    this.last = 0;
    const step = (ts) => {
      if (!this.last) this.last = ts;
      let dt = (ts - this.last) / 1000;
      if (dt > 0.05) dt = 0.05;
      this.last = ts;
      if (this.current?.update) this.current.update(dt);
      if (this.current?.draw) this.current.draw(this.ctx);
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  addScene(name, scene) { this.scenes.set(name, scene); }

  start(name) {
    const scene = this.scenes.get(name);
    if (!scene) return console.error("Escena no encontrada:", name);
    if (this.current?.stop) this.current.stop();
    this.current = scene;
    this.ui.innerHTML = "";
    if (scene.start) scene.start();
  }
}
