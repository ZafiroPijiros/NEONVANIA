// v4: Bullet time + Parry + Sistema de armas (energía/munición) + Loot + Mini-jefe
function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
function rand(){ return Math.random(); }
function chance(p){ return rand() < p; }

export class Level1 {
  constructor(engine){
    this.engine=engine;
    // Mundo
    this.g = 1500;
    this.friction = 0.88;
    // Jugador
    this.p = {
      x: 120, y: 120, w: 26, h: 32,
      vx:0, vy:0, facing: 1,
      speed: 360, jumpV: -580,
      onGround: false,
      jumpsMax: 2, jumpsLeft: 2,
      // dash / i-frames
      dashSpeed: 880, dashing:false, dashTime:0, dashDur:0.16, dashCD:0.50, dashCdLeft:0,
      inv:0, invTime:0.24,
      // melee
      attacking:false, atkTime:0, atkDur:0.14, atkDamage:26,
      // parry
      parry:false, parryTime:0, parryWindow:0.18, parryCD:0.6, parryCdLeft:0,
      // stats
      hp:100, hpMax:100, xp:0, level:1,
      // recursos
      bt:100, btMax:100, btActive:false, btDrain:28, btRegen:18, btScale:0.25,
      en:100, enMax:100, enRegen:16,
      ammo:{ bullet: 24 },
      // armas
      weapons:[
        { key:"pistol", name:"Pistola EN", type:"energy", dmg:18, speed:540, cd:0.25, cost:10 },
        { key:"bolter", name:"Bolter", type:"bullet", dmg:30, speed:620, cd:0.34, cost:1, ammoKey:"bullet" }
      ],
      wIndex:0, shotCd:0
    };

    // Enemigos por sala (basicos)
    this.enemies = [
      { x: 520, y: 0, w: 28, h: 34, vx: 50, dir: -1, hp: 60, alive:true, room:0, touch:10 },
      { x: 380, y: 0, w: 28, h: 34, vx: 60, dir: 1, hp: 60, alive:true, room:1, touch:10 },
      { x: 620, y: 0, w: 28, h: 34, vx: 70, dir: -1, hp: 80, alive:true, room:2, touch:12 },
    ];

    // Mini-jefe (sala 4)
    this.boss = { room:3, x: 440, y:0, w: 64, h: 80, hp: 400, hpMax: 400, alive:true, phase:1, timer:0, vx:0, vy:0, dir:-1 };
    this.bossShots = [];

    // Proyectiles del jugador
    this.shots = [];
    // Loot
    this.loot = [];

    // Layout de salas (4)
    this.rooms = [
      {
        platforms: (w,h)=>[
          {x:0,y:h-80,w:w,h:80},
          {x:120,y:h-200,w:160,h:16},
        ],
        doors: (w,h)=>[ {x:w-24,y:h-120,w:24,h:80,to:1,spawn:{x:30,y:h-120}} ],
        bg:"#0b0f22"
      },
      {
        platforms: (w,h)=>[
          {x:0,y:h-80,w:w,h:80},
          {x:60,y:h-240,w:140,h:16},
          {x:w-260,y:h-180,w:200,h:16},
        ],
        doors: (w,h)=>[
          {x:0,y:h-120,w:24,h:80,to:0,spawn:{x:w-60,y:h-120}},
          {x:w-24,y:h-120,w:24,h:80,to:2,spawn:{x:30,y:h-120}},
        ],
        bg:"#0a1426"
      },
      {
        platforms: (w,h)=>[
          {x:0,y:h-80,w:w,h:80},
          {x:220,y:h-260,w:180,h:16},
          {x:480,y:h-200,w:160,h:16},
        ],
        doors: (w,h)=>[
          {x:0,y:h-120,w:24,h:80,to:1,spawn:{x:w-60,y:h-120}},
          {x:w-24,y:h-120,w:24,h:80,to:3,spawn:{x:30,y:h-120}},
        ],
        bg:"#0a1020"
      },
      {
        platforms: (w,h)=>[
          {x:0,y:h-80,w:w,h:80},
          {x:200,y:h-240,w:w-400,h:16},
        ],
        doors: (w,h)=>[ {x:0,y:h-120,w:24,h:80,to:2,spawn:{x:w-60,y:h-120}} ],
        bg:"#120c22"
      }
    ];
    this.currentRoom = 0;

    // Input edge detection
    this.prevKeys = {};
  }

  w(){ return this.engine.canvas.width/this.engine.dpr; }
  h(){ return this.engine.canvas.height/this.engine.dpr; }

  start(){
    this.engine.ui.innerHTML = "<p style='color:#cfe7ff'>v4 — A/D moverse · Space doble salto · Shift BT (tap = dash) · J ataque · K disparo · L parry · 1/2 armas · M menú</p>";
    // posicionar elementos en suelo
    for (const e of this.enemies) e.y = this.h()-80 - e.h;
    this.boss.y = this.h()-80 - this.boss.h;
  }

  keyDown(code){ return !!this.engine.keys[code]; }
  keyPressed(code){ return this.keyDown(code) && !this.prevKeys[code]; }

  rectsOverlap(a,b){
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  getPlatforms(){ return this.rooms[this.currentRoom].platforms(this.w(), this.h()); }
  getDoors(){ return this.rooms[this.currentRoom].doors(this.w(), this.h()); }

  collideRect(p, rects){
    // vertical
    p.y += p.vy * this.dt; // p.vy es unidades/seg
    for (const r of rects){
      if (this.rectsOverlap({x:p.x,y:p.y,w:p.w,h:p.h}, r)){
        if (p.vy > 0) { p.y = r.y - p.h; p.vy = 0; p.onGround = true; }
        else if (p.vy < 0) { p.y = r.y + r.h; p.vy = 0; }
      }
    }
    // horizontal
    p.x += p.vx * this.dt;
    for (const r of rects){
      if (this.rectsOverlap({x:p.x,y:p.y,w:p.w,h:p.h}, r)){
        if (p.vx > 0) p.x = r.x - p.w;
        else if (p.vx < 0) p.x = r.x + r.w;
        p.vx = 0;
      }
    }
  }

  switchWeapon(idx){
    const p=this.p;
    if (idx>=0 && idx<p.weapons.length){ p.wIndex = idx; }
  }

  fireWeapon(){
    const p=this.p, w=p.weapons[p.wIndex];
    if (p.shotCd > 0) return;
    if (w.type === "energy") {
      if (p.en < w.cost) return;
      p.en -= w.cost;
    } else if (w.type === "bullet") {
      const key = w.ammoKey || "bullet";
      if ((p.ammo[key]||0) <= 0) return;
      p.ammo[key] = (p.ammo[key]||0) - w.cost;
    }
    p.shotCd = w.cd;

    const speed = w.speed;
    const proj = {
      x: p.facing>0 ? p.x + p.w : p.x - 8,
      y: p.y + p.h/2 - 2,
      w:8, h:4,
      vx: p.facing>0 ? speed : -speed,
      dmg: w.dmg,
      life: 1.2,
      room: this.currentRoom
    };
    this.shots.push(proj);
  }

  spawnLoot(x,y, room){
    // Posibles drops
    if (chance(0.5)) this.loot.push({type:"hp", val:20, x, y, w:10, h:10, room});
    if (chance(0.5)) this.loot.push({type:"bt", val:25, x:x+14, y, w:10, h:10, room});
    if (chance(0.4)) this.loot.push({type:"en", val:25, x:x+28, y, w:10, h:10, room});
    if (chance(0.35)) this.loot.push({type:"ammo", key:"bullet", val:8, x:x+42, y, w:10, h:10, room});
    // Drop raro: arma nueva (bolter) si el jugador no la tiene
    const hasBolter = this.p.weapons.some(w=>w.key==="bolter");
    if (!hasBolter && chance(0.15)) this.loot.push({type:"weapon", weapon:{ key:"bolter", name:"Bolter", type:"bullet", dmg:30, speed:620, cd:0.34, cost:1, ammoKey:"bullet"}, x:x+56, y, w:12, h:12, room});
  }

  pickLoot(item){
    const p=this.p;
    if (item.type==="hp") p.hp = clamp(p.hp + item.val, 0, p.hpMax);
    if (item.type==="bt") p.bt = clamp(p.bt + item.val, 0, p.btMax);
    if (item.type==="en") p.en = clamp(p.en + item.val, 0, p.enMax);
    if (item.type==="ammo") p.ammo[item.key] = (p.ammo[item.key]||0) + item.val;
    if (item.type==="weapon") {
      if (!p.weapons.some(w=>w.key===item.weapon.key)){
        p.weapons.push(item.weapon);
        this.switchWeapon(p.weapons.length-1);
      }
    }
  }

  bossAI(dt, rawDt){
    const b=this.boss, p=this.p;
    if (!b.alive || this.currentRoom !== b.room) return;

    b.timer -= rawDt;
    if (b.timer <= 0){
      // elegir patrón simple
      if (b.phase === 1){
        // Dash corto
        b.vx = (p.x < b.x ? -1 : 1) * 220;
        b.timer = 1.2;
        b.phase = 2;
      } else if (b.phase === 2){
        // Disparo abanico
        const dir = p.x < b.x ? -1 : 1;
        for (let i=-1;i<=1;i++){
          this.bossShots.push({ x:b.x + b.w/2, y:b.y + b.h/2, w:8, h:6, vx: (360 + Math.abs(i)*40) * dir, vy: i*90, dmg: 15, life: 1.6, room:b.room });
        }
        b.vx = 0;
        b.timer = 1.4;
        b.phase = 3;
      } else {
        // Salto corto
        b.vy = -420;
        b.timer = 1.0;
        b.phase = 1;
      }
    }

    // física boss
    b.vy += this.g * dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;

    // suelo y paredes
    const gy = this.h()-80;
    if (b.y + b.h > gy){ b.y = gy - b.h; b.vy = 0; }
    if (b.x < 60){ b.x = 60; b.vx *= -0.5; }
    if (b.x + b.w > this.w()-60){ b.x = this.w()-60 - b.w; b.vx *= -0.5; }
  }

  update(dt, rawDt){
    this.dt = dt; // guardar dt escalado para colisiones
    const p = this.p;

    // -------- BULLET TIME --------
    const holdingShift = this.keyDown('ShiftLeft') || this.keyDown('ShiftRight');
    const canBT = p.bt > 0.5;
    p.btActive = holdingShift && canBT;
    this.engine.timeScale = p.btActive ? p.btScale : 1;
    if (p.btActive) { p.bt = Math.max(0, p.bt - p.btDrain * rawDt); } else { p.bt = Math.min(p.btMax, p.bt + p.btRegen * rawDt); }

    // -------- INPUT --------
    const left = this.keyDown('ArrowLeft') || this.keyDown('KeyA');
    const right = this.keyDown('ArrowRight') || this.keyDown('KeyD');
    if (!p.dashing) {
      if (left && !right) { p.vx = -p.speed; p.facing = -1; }
      else if (right && !left) { p.vx = p.speed; p.facing = 1; }
      else { p.vx *= this.friction; if (Math.abs(p.vx) < 2) p.vx = 0; }
    }

    // Saltos (doble salto)
    if (p.onGround) p.jumpsLeft = p.jumpsMax;
    const jumpPressed = this.keyPressed('Space') || this.keyPressed('KeyW') || this.keyPressed('ArrowUp');
    if (jumpPressed && p.jumpsLeft > 0) { p.vy = p.jumpV; p.onGround = false; p.jumpsLeft--; }

    // Dash (tap de Shift)
    p.dashCdLeft = Math.max(0, p.dashCdLeft - rawDt);
    if (!p.dashing && p.dashCdLeft === 0 && (this.keyPressed('ShiftLeft') || this.keyPressed('ShiftRight'))) {
      p.dashing = true; p.dashTime = p.dashDur; p.dashCdLeft = p.dashCD;
      p.inv = Math.max(p.inv, p.invTime);
      p.vx = p.facing * p.dashSpeed; p.vy = 0;
    }
    if (p.dashing) { p.dashTime -= rawDt; if (p.dashTime <= 0) { p.dashing = false; } }

    // Parry (L) con ventana corta; si hay colisión durante la ventana, contraataque
    p.parry = false;
    p.parryCdLeft = Math.max(0, (p.parryCdLeft||0) - rawDt);
    if ((this.keyPressed('KeyL')) && p.parryCdLeft===0){
      p.parry = true; p.parryTime = p.parryWindow; p.parryCdLeft = p.parryCD;
    }
    if (p.parryTime > 0){ p.parry = true; p.parryTime -= rawDt; } else { p.parry = false; }

    // Disparo (K)
    p.shotCd = Math.max(0, p.shotCd - rawDt);
    if (this.keyPressed('KeyK')) this.fireWeapon();

    // Cambio de arma (1/2)
    if (this.keyPressed('Digit1')) this.switchWeapon(0);
    if (this.keyPressed('Digit2')) this.switchWeapon(1);

    // Física jugador
    if (!p.dashing) p.vy += this.g * dt;
    p.onGround = false;
    const plats = this.getPlatforms();
    this.collideRect(p, plats);
    if (p.x < 0) p.x = 0;
    if (p.x + p.w > this.w()) p.x = this.w()-p.w;

    // Tick proyectiles jugador
    for (const s of this.shots){
      if (s.room !== this.currentRoom) continue;
      s.x += s.vx * dt;
      s.life -= rawDt;
    }
    // Colisión proyectiles con enemigos/boss
    for (const s of this.shots){
      if (s.room !== this.currentRoom) continue;
      for (const e of this.enemies){
        if (e.alive && e.room===this.currentRoom && this.rectsOverlap({x:s.x,y:s.y,w:s.w,h:s.h},{x:e.x,y:e.y,w:e.w,h:e.h})){
          e.hp -= s.dmg; s.life = 0;
          if (e.hp<=0){ e.alive=false; this.spawnLoot(e.x, e.y, e.room); }
        }
      }
      const b=this.boss;
      if (b.alive && this.currentRoom===b.room && this.rectsOverlap({x:s.x,y:s.y,w:s.w,h:s.h},{x:b.x,y:b.y,w:b.w,h:b.h})) {
        b.hp -= s.dmg; s.life=0;
        if (b.hp<=0){ b.alive=false; this.spawnLoot(b.x, b.y, b.room); /*fin sala*/ }
      }
    }
    // limpiar shots
    this.shots = this.shots.filter(s=>s.life>0 && s.x>-40 && s.x<this.w()+40);

    // Enemigos
    for (const e of this.enemies) if (e.alive && e.room===this.currentRoom){
      e.x += e.vx * e.dir * dt;
      const leftBound = 40, rightBound = this.w()-40-e.w;
      if (e.x < leftBound) { e.x = leftBound; e.dir = 1; }
      if (e.x > rightBound) { e.x = rightBound; e.dir = -1; }
      // daño por contacto (parry bloquea y contraataca)
      if (this.rectsOverlap({x:p.x,y:p.y,w:p.w,h:p.h},{x:e.x,y:e.y,w:e.w,h:e.h})) {
        if (p.parry){ e.hp -= 40; if (e.hp<=0){ e.alive=false; this.spawnLoot(e.x, e.y, e.room); } }
        else if (p.inv<=0) { p.hp = Math.max(0, p.hp - e.touch); p.inv = p.invTime; if (p.hp===0) this.engine.start('menu'); }
      }
    }

    // Boss AI + proyectiles del boss
    this.bossAI(dt, rawDt);
    for (const bs of this.bossShots){
      if (this.currentRoom !== this.boss.room) continue;
      bs.x += bs.vx * dt; bs.y += bs.vy * dt; bs.life -= rawDt;
      // Parry: reflejar disparo
      if (this.rectsOverlap({x:p.x,y:p.y,w:p.w,h:p.h},{x:bs.x,y:bs.y,w:bs.w,h:bs.h})) {
        if (p.parry && this.boss.alive){
          // reflejar hacia el boss
          bs.vx = (this.boss.x < p.x ? -1 : 1) * Math.abs(bs.vx);
          bs.vy *= -0.3;
        } else if (p.inv<=0){
          p.hp = Math.max(0, p.hp - bs.dmg); p.inv = p.invTime; bs.life = 0;
          if (p.hp===0) this.engine.start('menu');
        }
      }
      // Si golpea al boss tras reflejo
      if (this.boss.alive && this.currentRoom===this.boss.room && this.rectsOverlap({x:bs.x,y:bs.y,w:bs.w,h:bs.h}, {x:this.boss.x,y:this.boss.y,w:this.boss.w,h:this.boss.h})) {
        if (bs.vx * (this.boss.x - p.x) > 0){ // venía desde el jugador hacia el boss
          this.boss.hp -= 25; bs.life = 0;
          if (this.boss.hp<=0){ this.boss.alive=false; this.spawnLoot(this.boss.x, this.boss.y, this.boss.room); }
        }
      }
    }
    this.bossShots = this.bossShots.filter(s=>s.life>0 && s.x>-60 && s.x<this.w()+60 && s.y>-80 && s.y<this.h()+80);

    // Loot physics & pickup
    for (const it of this.loot){
      if (it.room !== this.currentRoom) continue;
      // caer al suelo
      it.vy = (it.vy||0) + this.g * dt;
      it.y += it.vy * dt;
      const gy = this.h()-80;
      if (it.y + it.h > gy){ it.y = gy - it.h; it.vy=0; }
      // recoger
      if (this.rectsOverlap({x:p.x,y:p.y,w:p.w,h:p.h},{x:it.x,y:it.y,w:it.w,h:it.h})) {
        this.pickLoot(it);
        it.collected = true;
      }
    }
    this.loot = this.loot.filter(i=>!i.collected);

    // Timers
    p.inv = Math.max(0, p.inv - rawDt);

    // Ataque melee (J) con hitbox frontal
    if (!p.attacking && this.keyPressed('KeyJ')) { p.attacking=true; p.atkTime=p.atkDur; }
    if (p.attacking){ p.atkTime -= rawDt; if (p.atkTime<=0) p.attacking=false; }
    if (p.attacking){
      const hit = { x: p.facing>0 ? p.x + p.w : p.x - 22, y: p.y+4, w: 22, h: p.h-8 };
      for (const e of this.enemies) if (e.alive && e.room===this.currentRoom){
        if (this.rectsOverlap(hit, {x:e.x,y:e.y,w:e.w,h:e.h})) { e.hp -= p.atkDamage; if (e.hp<=0){ e.alive=false; this.spawnLoot(e.x, e.y, e.room);} }
      }
      if (this.boss.alive && this.currentRoom===this.boss.room){
        if (this.rectsOverlap(hit, {x:this.boss.x,y:this.boss.y,w:this.boss.w,h:this.boss.h})) { this.boss.hp -= p.atkDamage*0.6; if (this.boss.hp<=0){ this.boss.alive=false; this.spawnLoot(this.boss.x, this.boss.y, this.boss.room);} }
      }
    }

    // Puertas
    for (const d of this.getDoors()){
      if (this.rectsOverlap({x:p.x,y:p.y,w:p.w,h:p.h}, d)) {
        this.currentRoom = d.to;
        if (d.spawn) { p.x = d.spawn.x; p.y = d.spawn.y - p.h; p.vx = 0; p.vy = 0; }
        break;
      }
    }

    // Recursos
    p.en = clamp(p.en + p.enRegen * rawDt * (p.btActive?0.5:1), 0, p.enMax);

    // Menú
    if (this.keyDown('KeyM')) this.engine.start('menu');

    // Guardar teclas previas
    this.prevKeys = Object.assign({}, this.engine.keys);
  }

  draw(ctx){
    const cw=this.w(), ch=this.h();
    ctx.save();
    ctx.setTransform(this.engine.dpr,0,0,this.engine.dpr,0,0);

    // fondo por sala
    ctx.fillStyle = this.rooms[this.currentRoom].bg;
    ctx.fillRect(0,0,cw,ch);

    // plataformas
    const plats = this.getPlatforms();
    ctx.fillStyle = "#1b1030";
    for (const r of plats) ctx.fillRect(r.x, r.y, r.w, r.h);

    // puertas
    const doors = this.getDoors();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = "#52ff9f";
    for (const d of doors) ctx.fillRect(d.x, d.y, d.w, d.h);
    ctx.globalAlpha = 1;

    // enemigos activos
    for (const e of this.enemies) if (e.alive && e.room === this.currentRoom) {
      ctx.fillStyle = "#ff5e7d";
      ctx.fillRect(e.x, e.y, e.w, e.h);
      // barra hp
      ctx.fillStyle = "#2b1b2a";
      ctx.fillRect(e.x-2, e.y-8, e.w+4, 6);
      ctx.fillStyle = "#ff88a1";
      const ew = (e.w+4) * Math.max(0, e.hp/60);
      ctx.fillRect(e.x-2, e.y-8, ew, 6);
    }

    // boss
    if (this.boss.alive && this.currentRoom===this.boss.room){
      const b=this.boss;
      ctx.fillStyle = "#7b34ff";
      ctx.fillRect(b.x, b.y, b.w, b.h);
      // barra de boss
      const pad = 12, barW = cw - pad*2, barH = 12;
      ctx.fillStyle="#2a1a44"; ctx.fillRect(pad, ch - pad - barH, barW, barH);
      ctx.fillStyle="#a784ff"; ctx.fillRect(pad, ch - pad - barH, barW*(b.hp/b.hpMax), barH);
      ctx.fillStyle="#cfe7ff"; ctx.fillText("BOSS", pad, ch - pad - barH - 2);
    }

    // proyectiles
    ctx.fillStyle = "#9bb3ff";
    for (const s of this.shots) if (s.room===this.currentRoom) ctx.fillRect(s.x, s.y, s.w, s.h);
    // boss shots
    ctx.fillStyle = "#ffc78a";
    for (const s of this.bossShots) if (s.room===this.currentRoom) ctx.fillRect(s.x, s.y, s.w, s.h);

    // loot
    for (const it of this.loot) if (it.room===this.currentRoom){
      if (it.type==="hp") ctx.fillStyle="#52ff9f";
      else if (it.type==="bt") ctx.fillStyle="#9bb3ff";
      else if (it.type==="en") ctx.fillStyle="#7df9ff";
      else if (it.type==="ammo") ctx.fillStyle="#ffd166";
      else ctx.fillStyle="#ffffff";
      ctx.fillRect(it.x, it.y, it.w, it.h);
    }

    // jugador
    const p=this.p;
    ctx.fillStyle = p.inv>0 ? "#b2fff9" : "#7df9ff";
    ctx.fillRect(p.x, p.y, p.w, p.h);
    // ataque melee hitbox (debug)
    if (p.attacking) {
      const hx = p.facing>0 ? p.x + p.w : p.x - 22;
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = "#7dffc7";
      ctx.fillRect(hx, p.y+4, 22, p.h-8);
      ctx.globalAlpha = 1;
    }
    // parry glow (debug)
    if (p.parry) {
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = "#c1ff7d";
      ctx.fillRect(p.x-4, p.y-4, p.w+8, p.h+8);
      ctx.globalAlpha = 1;
    }

    // HUD
    const pad = 12, barW = 180, barH = 10;
    // HP
    ctx.fillStyle="#2a334d"; ctx.fillRect(pad,pad,barW,barH);
    ctx.fillStyle="#52ff9f"; ctx.fillRect(pad,pad,barW*(p.hp/p.hpMax),barH);
    ctx.fillStyle="#cfe7ff"; ctx.fillText("HP", pad, pad-2);

    // Bullet Time
    ctx.fillStyle="#2a334d"; ctx.fillRect(pad,pad+14,barW,barH);
    ctx.fillStyle="#9bb3ff"; ctx.fillRect(pad,pad+14,barW*(p.bt/p.btMax),barH);
    ctx.fillStyle="#cfe7ff"; ctx.fillText("BT", pad, pad+12);

    // Energía
    ctx.fillStyle="#2a334d"; ctx.fillRect(pad,pad+28,barW,barH);
    ctx.fillStyle="#7df9ff"; ctx.fillRect(pad,pad+28,barW*(p.en/p.enMax),barH);
    ctx.fillStyle="#cfe7ff"; ctx.fillText("EN", pad, pad+26);

    // Arma + munición
    const w = p.weapons[p.wIndex];
    let ammoTxt = w.type==="energy" ? "∞" : (p.ammo[w.ammoKey||"bullet"]||0);
    ctx.fillStyle="#cfe7ff"; ctx.fillText(`${w.name}  DMG ${w.dmg}  AMMO ${ammoTxt}`, pad, pad+46);

    // Sala
    ctx.fillStyle="#cfe7ff"; ctx.fillText(`Sala ${this.currentRoom+1}/4`, cw - 110, pad+10);

    ctx.restore();
  }
}
