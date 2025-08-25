// v2: jugador avanzado + enemigo simple + HUD
export class Level1 {
  constructor(engine){
    this.engine=engine;
    // Mundo
    this.g = 1500;
    this.friction = 0.9;
    this.ground = () => this.h()-80;
    // Jugador
    this.p = {
      x: 120, y: 120, w: 26, h: 32,
      vx:0, vy:0, facing: 1,
      speed: 360, jumpV: -580,
      onGround: false,
      jumpsMax: 2, jumpsLeft: 2,
      // dash
      dashSpeed: 840, dashing:false, dashTime:0, dashDur:0.18, dashCD:0.6, dashCdLeft:0,
      inv:0, invTime:0.25,
      // combate
      attacking:false, atkTime:0, atkDur:0.18, atkDamage:25,
      // stats
      hp:100, hpMax:100, stamina:100, stmMax:100, xp:0, level:1,
    };
    // Enemigo simple
    this.enemy = { x: 520, y: 0, w: 28, h: 34, vx: 40, dir: -1, hp: 60, alive:true };
    // Input edge detection
    this.prevKeys = {};
  }

  w(){ return this.engine.canvas.width/this.engine.dpr; }
  h(){ return this.engine.canvas.height/this.engine.dpr; }

  start(){
    this.engine.ui.innerHTML = "<p style='color:#cfe7ff'>Nivel 1 — A/D moverse · Space saltar x2 · Shift dash · J ataque · M menú</p>";
    // colocar enemigo sobre el suelo
    this.enemy.y = this.ground() - this.enemy.h;
  }

  keyDown(code){ return !!this.engine.keys[code]; }
  keyPressed(code){ return this.keyDown(code) && !this.prevKeys[code]; }

  rectsOverlap(a,b){
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  update(dt){
    const k = this.engine.keys;
    const p = this.p;

    // --- entrada horizontal ---
    const left = this.keyDown('ArrowLeft') || this.keyDown('KeyA');
    const right = this.keyDown('ArrowRight') || this.keyDown('KeyD');
    if (!p.dashing) {
      if (left && !right) { p.vx = -p.speed; p.facing = -1; }
      else if (right && !left) { p.vx = p.speed; p.facing = 1; }
      else { p.vx *= this.friction; if (Math.abs(p.vx) < 2) p.vx = 0; }
    }

    // --- saltos (doble salto) ---
    if (p.onGround) p.jumpsLeft = p.jumpsMax;
    const jumpPressed = this.keyPressed('Space') || this.keyPressed('KeyW') || this.keyPressed('ArrowUp');
    if (jumpPressed && p.jumpsLeft > 0) {
      p.vy = p.jumpV;
      p.onGround = false;
      p.jumpsLeft--;
    }

    // --- dash ---
    p.dashCdLeft = Math.max(0, p.dashCdLeft - dt);
    if (!p.dashing && p.dashCdLeft === 0 && this.keyPressed('ShiftLeft')) {
      p.dashing = true; p.dashTime = p.dashDur; p.dashCdLeft = p.dashCD;
      p.inv = Math.max(p.inv, p.invTime);
      p.vx = p.facing * p.dashSpeed; p.vy = 0;
    }
    if (p.dashing) {
      p.dashTime -= dt;
      if (p.dashTime <= 0) { p.dashing = false; }
    }

    // --- física ---
    if (!p.dashing) p.vy += this.g * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    // --- colisiones con suelo ---
    const gy = this.ground();
    if (p.y + p.h > gy) { p.y = gy - p.h; p.vy = 0; p.onGround = true; } else { p.onGround = false; }
    // paredes
    if (p.x < 0) p.x = 0;
    if (p.x + p.w > this.w()) p.x = this.w() - p.w;

    // --- ataque melee ---
    if (!p.attacking && this.keyPressed('KeyJ')) {
      p.attacking = true; p.atkTime = p.atkDur;
    }
    if (p.attacking) {
      p.atkTime -= dt;
      if (p.atkTime <= 0) p.attacking = false;
    }

    // hitbox de ataque (frente al jugador)
    if (p.attacking && this.enemy.alive) {
      const hit = {
        x: p.facing>0 ? p.x + p.w : p.x - 22,
        y: p.y + 4,
        w: 22,
        h: p.h - 8
      };
      const ebox = { x:this.enemy.x, y:this.enemy.y, w:this.enemy.w, h:this.enemy.h };
      if (this.rectsOverlap(hit, ebox)) {
        this.enemy.hp -= p.atkDamage;
        // pequeño knockback
        this.enemy.x += p.facing>0 ? 10 : -10;
        if (this.enemy.hp <= 0) { this.enemy.alive = false; }
      }
    }

    // --- enemigo patrulla simple ---
    if (this.enemy.alive) {
      this.enemy.x += this.enemy.vx * this.enemy.dir * dt;
      // rebote en paredes
      if (this.enemy.x < 60) { this.enemy.x = 60; this.enemy.dir = 1; }
      if (this.enemy.x + this.enemy.w > this.w()-60) { this.enemy.x = this.w()-60 - this.enemy.w; this.enemy.dir = -1; }
      // daño por contacto si no está invencible
      if (this.rectsOverlap({x:p.x,y:p.y,w:p.w,h:p.h},{x:this.enemy.x,y:this.enemy.y,w:this.enemy.w,h:this.enemy.h})) {
        if (p.inv <= 0) {
          p.hp = Math.max(0, p.hp - 10);
          p.inv = p.invTime;
          // retroceso del jugador
          p.vx = -p.facing * 240;
          if (p.hp === 0) this.engine.start('menu');
        }
      }
    }

    // timers
    p.inv = Math.max(0, p.inv - dt);

    // volver al menú
    if (this.keyDown('KeyM')) this.engine.start('menu');

    // guardar estado de teclas para edge detection
    this.prevKeys = Object.assign({}, this.engine.keys);
  }

  draw(ctx){
    const cw=this.w(), ch=this.h();
    ctx.save();
    ctx.setTransform(this.engine.dpr,0,0,this.engine.dpr,0,0);

    // fondo
    ctx.fillStyle = "#070811"; ctx.fillRect(0,0,cw,ch);

    // suelo
    const gy = this.ground();
    ctx.fillStyle = "#1b1030"; ctx.fillRect(0, gy, cw, ch-gy);

    // enemigo
    if (this.enemy.alive) {
      ctx.fillStyle = "#ff5e7d";
      ctx.fillRect(this.enemy.x, this.enemy.y, this.enemy.w, this.enemy.h);
      // barra hp del enemigo
      ctx.fillStyle = "#2b1b2a";
      ctx.fillRect(this.enemy.x-2, this.enemy.y-8, this.enemy.w+4, 6);
      ctx.fillStyle = "#ff88a1";
      const ew = (this.enemy.w+4) * Math.max(0, this.enemy.hp/60);
      ctx.fillRect(this.enemy.x-2, this.enemy.y-8, ew, 6);
    }

    // jugador
    const p=this.p;
    ctx.fillStyle = p.inv>0 ? "#b2fff9" : "#7df9ff";
    ctx.fillRect(p.x, p.y, p.w, p.h);

    // hitbox ataque (debug visual)
    if (p.attacking) {
      const hx = p.facing>0 ? p.x + p.w : p.x - 22;
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = "#7dffc7";
      ctx.fillRect(hx, p.y+4, 22, p.h-8);
      ctx.globalAlpha = 1;
    }

    // --- HUD ---
    const pad = 12;
    // HP
    const barW = 160, barH = 10;
    ctx.fillStyle = "#2a334d"; ctx.fillRect(pad, pad, barW, barH);
    ctx.fillStyle = "#52ff9f"; ctx.fillRect(pad, pad, barW*(p.hp/p.hpMax), barH);
    ctx.fillStyle = "#cfe7ff"; ctx.fillText("HP", pad, pad-2);

    // Stamina (placeholder ligada al dash CD)
    const cd = p.dashCdLeft / p.dashCD;
    ctx.fillStyle = "#2a334d"; ctx.fillRect(pad, pad+14, barW, barH);
    ctx.fillStyle = "#9bb3ff"; ctx.fillRect(pad, pad+14, barW*(1-cd), barH);
    ctx.fillStyle = "#cfe7ff"; ctx.fillText("Dash", pad, pad+12);

    // Nivel / XP (placeholder visual)
    ctx.fillStyle = "#cfe7ff";
    ctx.fillText(`LV ${p.level}  XP ${p.xp}`, pad, pad+36);

    ctx.restore();
  }
}
