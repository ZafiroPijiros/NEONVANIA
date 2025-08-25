// Level v6: adds checkpoints, portals, quests, map, options
function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
function rand(){ return Math.random(); }
function chance(p){ return Math.random() < p; }

const RARITY = {
  common:{ name:"Común", color:"#cfe7ff", mod:1.0 },
  rare:{ name:"Rara", color:"#7df9ff", mod:1.15 },
  epic:{ name:"Épica", color:"#52ff9f", mod:1.35 },
  legendary:{ name:"Legendaria", color:"#ffd166", mod:1.6 },
};

function rollRarity(){
  const r = Math.random();
  if (r < 0.55) return "common";
  if (r < 0.8) return "rare";
  if (r < 0.95) return "epic";
  return "legendary";
}

function applyRarity(base, rarityKey){
  const mod = RARITY[rarityKey].mod;
  return { ...base, name: base.name + " ("+RARITY[rarityKey].name+")", dmg: Math.round(base.dmg*mod) };
}

export class Level1 {
  constructor(engine){
    this.engine=engine;
    // Mundo
    this.g = 1500;
    this.friction = 0.88;
    this.tile = 32;

    // Rooms (30x17 aprox) con decoración (5 = decor)
    this.rooms = [
      { // 1
        gen:(w,h)=>{
          const cols = Math.floor(w/32), rows = Math.floor(h/32);
          const m = Array.from({length:rows}, _=>Array(cols).fill(0));
          for (let x=0;x<cols;x++){ m[rows-3][x]=1; m[rows-2][x]=1; if (x%3===0) m[rows-4][x]=5; } // decor
          for (let x=5;x<10;x++){ m[rows-8][x]=1; if (x%2===0) m[rows-9][x]=5; }
          m[rows-6][cols-1]=2; // puerta a 2
          m[rows-7][9]=3; // cofre
          // portal a 3
          m[rows-6][Math.floor(cols/2)]=6;
          return m;
        },
        bg:"#0b0f22"
      },
      { // 2 (tienda)
        gen:(w,h)=>{
          const cols = Math.floor(w/32), rows = Math.floor(h/32);
          const m = Array.from({length:rows}, _=>Array(cols).fill(0));
          for (let x=0;x<cols;x++){ m[rows-3][x]=1; m[rows-2][x]=1; if (x%4===0) m[rows-4][x]=5; }
          for (let x=2;x<6;x++) m[rows-9][x]=1;
          for (let x=cols-10;x<cols-3;x++) m[rows-7][x]=1;
          m[rows-6][0]=2; // izq a 1
          m[rows-6][cols-1]=2; // der a 3
          m[rows-5][Math.floor(cols/2)] = 4; // tienda
          return m;
        },
        bg:"#0a1426"
      },
      { // 3 (vertical + portal a boss)
        gen:(w,h)=>{
          const cols = Math.floor(w/32), rows = Math.floor(h/32);
          const m = Array.from({length:rows}, _=>Array(cols).fill(0));
          for (let x=0;x<cols;x++){ m[rows-3][x]=1; m[rows-2][x]=1; if (x%5===0) m[rows-4][x]=5; }
          for (let x=cols-14;x<cols-8;x++) m[rows-10][x]=1;
          for (let x=6;x<12;x++) m[rows-13][x]=1;
          m[rows-6][0]=2; // izq a 2
          m[rows-6][cols-1]=2; // der a 4
          m[rows-8][Math.floor(cols/2)] = 6; // portal a 4
          return m;
        },
        bg:"#0a1020"
      },
      { // 4 Boss
        gen:(w,h)=>{
          const cols = Math.floor(w/32), rows = Math.floor(h/32);
          const m = Array.from({length:rows}, _=>Array(cols).fill(0));
          for (let x=0;x<cols;x++){ m[rows-3][x]=1; m[rows-2][x]=1; if (x%3===1) m[rows-4][x]=5; }
          m[rows-6][0]=2; // izq a 3
          // checkpoint
          m[rows-6][cols-3]=7;
          return m;
        },
        bg:"#120c22"
      },
    ];
    this.tilemaps = [];

    // Player
    this.p = {
      x: 120, y: 120, w: 26, h: 32,
      vx:0, vy:0, facing: 1,
      speed: 360, jumpV: -580,
      onGround: false,
      jumpsMax: 2, jumpsLeft: 2,
      dashSpeed: 880, dashing:false, dashTime:0, dashDur:0.16, dashCD:0.50, dashCdLeft:0,
      inv:0, invTime:0.24,
      attacking:false, atkTime:0, atkDur:0.14, atkDamage:26,
      parry:false, parryTime:0, parryWindow:0.18, parryCD:0.6, parryCdLeft:0,
      hp:100, hpMax:100, xp:0, level:1, coins: 0,
      bt:100, btMax:100, btDrain:28, btRegen:18, btScale:0.25,
      en:100, enMax:100, enRegen:16,
      ammo:{ bullet: 24 },
      weapons:[
        { key:"pistol", name:"Pistola EN", type:"energy", dmg:18, speed:540, cd:0.25, cost:10 },
        { key:"bolter", name:"Bolter", type:"bullet", dmg:30, speed:620, cd:0.34, cost:1, ammoKey:"bullet" }
      ],
      wIndex:0, shotCd:0
    };

    // Entities
    this.enemies = [
      { x: 520, y: 0, w: 28, h: 34, vx: 50, dir: -1, hp: 60, alive:true, room:0, touch:10 },
      { x: 380, y: 0, w: 28, h: 34, vx: 60, dir: 1, hp: 60, alive:true, room:1, touch:10 },
      { x: 620, y: 0, w: 28, h: 34, vx: 70, dir: -1, hp: 80, alive:true, room:2, touch:12 },
    ];

    this.boss = { room:3, x: 440, y:0, w: 64, h: 80, hp: 420, hpMax: 420, alive:true, phase:1, timer:0, vx:0, vy:0, dir:-1 };
    this.bossShots = [];
    this.shots = [];
    this.loot = [];
    this.chests = [];
    this.shop = null;

    // New v6
    this.currentRoom = 0;
    this.visited = new Set([0]);
    this.checkpoint = { room:0, x:140, y:120 }; // último activado
    this.portals = []; // construidos desde tiles tipo 6
    this.quest = { title: "Energizar el Portal",
                   goals: [{id:"cores", label:"Recolecta 3 Núcleos", need:3, have:0}],
                   done:false };
    this.optionsVisible = false;
    this.prevKeys = {};
  }

  vw(){ return this.engine.cam.w; }
  vh(){ return this.engine.cam.h; }

  buildRoomData(){
    const w=this.vw(), h=this.vh();
    this.tilemaps = this.rooms.map(r=>r.gen(w,h));
    this.platforms = this.tilemaps.map(map=>{
      const rects=[];
      for (let y=0;y<map.length;y++){
        for (let x=0;x<map[0].length;x++){
          if (map[y][x]===1){ rects.push({x:x*32,y:y*32,w:32,h:32}); }
        }
      }
      return rects;
    });

    // Doors
    this.doors = this.tilemaps.map(map=>{
      const rects=[];
      for (let y=0;y<map.length;y++) for (let x=0;x<map[0].length;x++) if (map[y][x]===2) rects.push({x:x*32,y:y*32,w:32,h:64,to:null});
      return rects;
    });
    if (this.doors[0][0]) this.doors[0][0].to = 1;
    if (this.doors[1][0]) this.doors[1][0].to = 0;
    if (this.doors[1][1]) this.doors[1][1].to = 2;
    if (this.doors[2][0]) this.doors[2][0].to = 1;
    if (this.doors[2][1]) this.doors[2][1].to = 3;
    if (this.doors[3][0]) this.doors[3][0].to = 2;

    // Cofres
    this.chests = [];
    for (let y=0;y<this.tilemaps[0].length;y++)
      for (let x=0;x<this.tilemaps[0][0].length;x++)
        if (this.tilemaps[0][y][x]===3) this.chests.push({room:0, x:x*32, y:y*32-16, w:24, h:18, opened:false, content:null});

    // Tienda
    this.shop = null;
    for (let y=0;y<this.tilemaps[1].length;y++)
      for (let x=0;x<this.tilemaps[1][0].length;x++)
        if (this.tilemaps[1][y][x]===4) this.shop = {room:1, x:x*32, y:y*32-16, w:28, h:28, items:this.buildShopItems()};

    // Portales (tipo 6), crean id por roomIndex-pos
    this.portals = [];
    for (let r=0;r<this.tilemaps.length;r++){
      const map=this.tilemaps[r];
      for (let y=0;y<map.length;y++)
        for (let x=0;x<map[0].length;x++)
          if (map[y][x]===6) this.portals.push({room:r, x:x*32, y:y*32, w:32, h:64});
    }

    // Checkpoints (tipo 7)
    this.checkpointsTiles = [];
    for (let r=0;r<this.tilemaps.length;r++){
      const map=this.tilemaps[r];
      for (let y=0;y<map.length;y++)
        for (let x=0;x<map[0].length;x++)
          if (map[y][x]===7) this.checkpointsTiles.push({room:r, x:x*32, y:y*32, w:28,h:36});
    }
  }

  buildShopItems(){
    const baseWeapons = [
      { key:"pistol", name:"Pistola EN", type:"energy", dmg:18, speed:540, cd:0.25, cost:10 },
      { key:"bolter", name:"Bolter", type:"bullet", dmg:30, speed:620, cd:0.34, cost:1, ammoKey:"bullet" }
    ];
    const randomBase = baseWeapons[Math.floor(Math.random()*baseWeapons.length)];
    const rarity = rollRarity();
    const weapon = applyRarity(randomBase, rarity);
    return [
      { key:"ammo_bullet", name:"Munición Bolter +20", price: 20, buy:(p)=>{ p.ammo.bullet = (p.ammo.bullet||0) + 20; } },
      { key:"en_potion", name:"Batería de Energía +60", price: 25, buy:(p)=>{ p.en = Math.min(p.enMax, p.en+60); } },
      { key:"weapon", name:`Arma ${weapon.name}`, price: 50 + Math.round(20*RARITY[rarity].mod), weapon, buy:(p)=>{
          if (!p.weapons.some(w=>w.key===weapon.key && w.name===weapon.name)) {
            p.weapons.push(weapon); p.wIndex = p.weapons.length-1;
          }
        } },
    ];
  }

  // SAVE / LOAD
  save(){
    const p=this.p;
    const data = {
      room: this.currentRoom,
      player:{
        hp:p.hp, hpMax:p.hpMax, coins:p.coins,
        bt:p.bt, en:p.en, ammo:p.ammo,
        weapons:p.weapons, wIndex:p.wIndex,
        checkpoint:this.checkpoint
      },
      chests: this.chests.map(c=>({room:c.room,x:c.x,y:c.y,opened:c.opened,content:c.content})),
      boss:{ alive:this.boss.alive, hp:this.boss.hp },
      quest:this.quest,
      visited:[...this.visited]
    };
    localStorage.setItem("neonvania_save", JSON.stringify(data));
    this.engine.toast("💾 Progreso guardado");
  }

  load(){
    const raw = localStorage.getItem("neonvania_save");
    if (!raw) return;
    const d = JSON.parse(raw);
    this.currentRoom = d.room||0;
    const p=this.p, s=d.player||{};
    p.hp = s.hp??p.hp; p.hpMax = s.hpMax??p.hpMax; p.coins = s.coins??0;
    p.bt = s.bt??p.bt; p.en = s.en??p.en;
    p.ammo = s.ammo||p.ammo;
    p.weapons = s.weapons||p.weapons; p.wIndex = s.wIndex||0;
    if (Array.isArray(d.chests)) {
      this.chests.forEach(c=>{
        const found = d.chests.find(cc=>cc.room===c.room && cc.x===c.x && cc.y===c.y);
        if (found){ c.opened = found.opened; c.content = found.content; }
      });
    }
    if (d.boss){ this.boss.alive = d.boss.alive; this.boss.hp = d.boss.hp; }
    if (d.quest) this.quest = d.quest;
    if (Array.isArray(d.visited)) this.visited = new Set(d.visited);
    if (s.checkpoint) this.checkpoint = s.checkpoint;
    this.engine.toast("✅ Progreso cargado");
  }

  start(data){
    this.buildRoomData();

    const gy = this.vh()-64;
    for (const e of this.enemies) e.y = gy - e.h;
    this.boss.y = gy - this.boss.h;

    if (data?.load) this.load();

    // UI buttons top-right
    const ui = document.createElement('div');
    ui.className='panel';
    ui.style.position='fixed'; ui.style.right='8px'; ui.style.top='8px'; ui.style.padding='6px 10px';
    ui.innerHTML = `<button id="saveBtn">💾 Guardar</button> <button id="optBtn">⚙️ Opciones</button> <button id="menuBtn">🏠 Menú</button>`;
    this.engine.ui.appendChild(ui);
    document.getElementById('saveBtn').onclick = ()=>this.save();
    document.getElementById('menuBtn').onclick = ()=>this.engine.start('menu');
    document.getElementById('optBtn').onclick = ()=>this.toggleOptions();

    // Quest panel hint
    const hint = document.createElement('div');
    hint.className='panel';
    hint.style.position='fixed'; hint.style.left='8px'; hint.style.bottom='8px';
    hint.innerHTML = `<div><b>Quest:</b> ${this.quest.title}</div><div>Q para abrir registro</div>`;
    this.engine.ui.appendChild(hint);

    // Options panel initial state (hidden)
    this.renderOptions(false);
    // Shop UI initial
    this.renderShopUI(false);
  }

  toggleOptions(){ this.optionsVisible = !this.optionsVisible; this.renderOptions(this.optionsVisible); }
  renderOptions(visible){
    const old = document.getElementById('optPanel');
    if (old) old.remove();
    if (!visible) return;
    const opt = document.createElement('div');
    opt.id='optPanel';
    opt.className='panel';
    opt.style.position='fixed'; opt.style.left='50%'; opt.style.top='50%'; opt.style.transform='translate(-50%,-50%)';
    const enabled = this.engine.audio.enabled;
    const master = this.engine.audio.master;
    opt.innerHTML = `
      <h3>⚙️ Opciones</h3>
      <div class="row"><label><input type="checkbox" id="sfxChk" ${enabled?'checked':''}/> Sonidos</label></div>
      <div class="row">Volumen <input id="volRange" type="range" min="0" max="1" step="0.01" value="${master}" class="slider"></div>
      <div class="row"><button id="closeOpt">Cerrar</button></div>
    `;
    this.engine.ui.appendChild(opt);
    const saveOpts = ()=>{
      const opts = { enabled: document.getElementById('sfxChk').checked, master: parseFloat(document.getElementById('volRange').value) };
      this.engine.audio.enabled = opts.enabled;
      this.engine.audio.master = opts.master;
      localStorage.setItem("neonvania_opts", JSON.stringify(opts));
      this.engine.audio.click();
    };
    document.getElementById('sfxChk').onchange = saveOpts;
    document.getElementById('volRange').oninput = saveOpts;
    document.getElementById('closeOpt').onclick = ()=>this.toggleOptions();
  }

  keyDown(code){ return !!this.engine.keys[code]; }
  keyPressed(code){ return this.keyDown(code) && !this.prevKeys[code]; }

  rectsOverlap(a,b){
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  getPlatforms(){ return this.platforms[this.currentRoom]; }
  getDoors(){ return this.doors[this.currentRoom]; }

  collideRect(p, rects, dt){
    p.y += p.vy * dt;
    for (const r of rects){
      if (this.rectsOverlap({x:p.x,y:p.y,w:p.w,h:p.h}, r)){
        if (p.vy > 0) { p.y = r.y - p.h; p.vy = 0; p.onGround = true; }
        else if (p.vy < 0) { p.y = r.y + r.h; p.vy = 0; }
      }
    }
    p.x += p.vx * dt;
    for (const r of rects){
      if (this.rectsOverlap({x:p.x,y:p.y,w:p.w,h:p.h}, r)){
        if (p.vx > 0) p.x = r.x - p.w;
        else if (p.vx < 0) p.x = r.x + r.w;
        p.vx = 0;
      }
    }
  }

  updateCamera(){
    const p=this.p, cam=this.engine.cam;
    const targetX = 0, targetY = 0; // rooms=viewport tamaño igual por ahora
    cam.x += (targetX - cam.x) * 0.15;
    cam.y += (targetY - cam.y) * 0.15;
  }

  switchWeapon(idx){
    const p=this.p;
    if (idx>=0 && idx<p.weapons.length){ p.wIndex = idx; this.engine.audio.swap(); }
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

    const proj = {
      x: p.facing>0 ? p.x + p.w : p.x - 8,
      y: p.y + p.h/2 - 2,
      w:8, h:4,
      vx: p.facing>0 ? w.speed : -w.speed,
      dmg: w.dmg,
      life: 1.2,
      room: this.currentRoom
    };
    this.shots.push(proj);
    this.engine.audio.shoot();
  }

  // Cofres y tienda
  tryOpenChest(){
    for (const c of this.chests) if (c.room===this.currentRoom && !c.opened){
      const near = Math.hypot((this.p.x+this.p.w/2)-(c.x+c.w/2), (this.p.y+this.p.h/2)-(c.y+c.h/2)) < 42;
      if (near){
        c.opened = true;
        const coins = 10 + Math.floor(Math.random()*15);
        this.p.coins += coins;
        if (!c.content){
          const kind = Math.random();
          if (kind < 0.3) c.content = { type:"ammo", key:"bullet", val:20 };
          else if (kind < 0.6) c.content = { type:"en", val:60 };
          else {
            const base = this.p.weapons[Math.floor(Math.random()*this.p.weapons.length)];
            const rar = rollRarity();
            c.content = { type:"weapon", weapon: applyRarity(base, rar), rarity: rar };
          }
        }
        const L = c.content;
        if (L.type==="ammo") this.loot.push({type:"ammo", key:L.key, val:L.val, x:c.x+6,y:c.y-12,w:10,h:10,room:c.room});
        if (L.type==="en") this.loot.push({type:"en", val:L.val, x:c.x+6,y:c.y-12,w:10,h:10,room:c.room});
        if (L.type==="weapon") this.loot.push({type:"weapon", weapon:L.weapon, x:c.x+6,y:c.y-12,w:12,h:12,room:c.room});
        this.engine.toast(`🧰 Cofre: +${coins} monedas`);
        this.engine.audio.loot();
      }
    }
  }

  renderShopUI(visible){
    const old = document.getElementById('shopPanel');
    if (old) old.remove();
    if (!visible || !this.shop) return;
    const panel = document.createElement('div');
    panel.id='shopPanel';
    panel.className='panel';
    panel.style.position='fixed'; panel.style.left='50%'; panel.style.bottom='12px'; panel.style.transform='translateX(-50%)';
    panel.innerHTML = `<div><b>🛒 Tienda</b> <span class="badge">Monedas: ${this.p.coins}</span></div>`;
    for (const it of this.shop.items){
      const btn = document.createElement('button');
      btn.textContent = `${it.name} — ${it.price}💰`;
      btn.onclick = () => {
        if (this.p.coins < it.price){ this.engine.toast("No tienes suficientes monedas"); return; }
        this.p.coins -= it.price; it.buy(this.p); this.renderShopUI(true); this.engine.audio.click();
      };
      panel.appendChild(btn);
    }
    this.engine.ui.appendChild(panel);
  }

  pickLoot(item){
    const p=this.p;
    if (item.type==="hp") p.hp = clamp(p.hp + (item.val||20), 0, p.hpMax);
    if (item.type==="bt") p.bt = clamp(p.bt + (item.val||25), 0, p.btMax);
    if (item.type==="en") p.en = clamp(p.en + (item.val||25), 0, p.enMax);
    if (item.type==="ammo") p.ammo[item.key] = (p.ammo[item.key]||0) + (item.val||8);
    if (item.type==="weapon") {
      if (!p.weapons.some(w=>w.key===item.weapon.key && w.name===item.weapon.name)){
        p.weapons.push(item.weapon);
        p.wIndex = p.weapons.length-1;
      }
    }
  }

  bossAI(dt, rawDt){
    const b=this.boss, p=this.p;
    if (!b.alive || this.currentRoom !== b.room) return;
    b.timer -= rawDt;
    if (b.timer <= 0){
      if (b.phase === 1){
        b.vx = (p.x < b.x ? -1 : 1) * 230;
        b.timer = 1.1; b.phase = 2;
      } else if (b.phase === 2){
        const dir = p.x < b.x ? -1 : 1;
        for (let i=-1;i<=1;i++){
          this.bossShots.push({ x:b.x + b.w/2, y:b.y + b.h/2, w:8, h:6, vx: (360 + Math.abs(i)*50) * dir, vy: i*110, dmg: 15, life: 1.6, room:b.room });
        }
        b.vx = 0; b.timer = 1.3; b.phase = 3;
      } else {
        b.vy = -440; b.timer = 1.0; b.phase = 1;
      }
    }
    b.vy += this.g * dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    const gy = this.vh()-64;
    if (b.y + b.h > gy){ b.y = gy - b.h; b.vy = 0; }
    if (b.x < 60){ b.x = 60; b.vx *= -0.5; }
    if (b.x + b.w > this.vw()-60){ b.x = this.vw()-60 - b.w; b.vx *= -0.5; }
  }

  update(dt, rawDt){
    const p = this.p;

    // BULLET TIME
    const holdingShift = this.keyDown('ShiftLeft') || this.keyDown('ShiftRight');
    const canBT = p.bt > 0.5;
    p.btActive = holdingShift && canBT;
    this.engine.timeScale = p.btActive ? p.btScale : 1;
    if (p.btActive) { p.bt = Math.max(0, p.bt - p.btDrain * rawDt); } else { p.bt = Math.min(p.btMax, p.bt + p.btRegen * rawDt); }

    // INPUT
    const left = this.keyDown('ArrowLeft') || this.keyDown('KeyA');
    const right = this.keyDown('ArrowRight') || this.keyDown('KeyD');
    if (!p.dashing) {
      if (left && !right) { p.vx = -p.speed; p.facing = -1; }
      else if (right && !left) { p.vx = p.speed; p.facing = 1; }
      else { p.vx *= this.friction; if (Math.abs(p.vx) < 2) p.vx = 0; }
    }

    // Saltos
    if (p.onGround) p.jumpsLeft = p.jumpsMax;
    const jumpPressed = this.keyPressed('Space') || this.keyPressed('KeyW') || this.keyPressed('ArrowUp');
    if (jumpPressed && p.jumpsLeft > 0) { p.vy = p.jumpV; p.onGround = false; p.jumpsLeft--; }

    // Dash (tap Shift)
    p.dashCdLeft = Math.max(0, p.dashCdLeft - rawDt);
    if (!p.dashing && p.dashCdLeft === 0 && (this.keyPressed('ShiftLeft') || this.keyPressed('ShiftRight'))) {
      p.dashing = true; p.dashTime = p.dashDur; p.dashCdLeft = p.dashCD;
      p.inv = Math.max(p.inv, p.invTime);
      p.vx = p.facing * p.dashSpeed; p.vy = 0;
    }
    if (p.dashing) { p.dashTime -= rawDt; if (p.dashTime <= 0) { p.dashing = false; } }

    // Parry (L)
    p.parry = false;
    p.parryCdLeft = Math.max(0, (p.parryCdLeft||0) - rawDt);
    if ((this.keyPressed('KeyL')) && p.parryCdLeft===0){
      p.parry = true; p.parryTime = p.parryWindow; p.parryCdLeft = p.parryCD; this.engine.audio.parry();
    }
    if (p.parryTime > 0){ p.parry = true; p.parryTime -= rawDt; } else { p.parry = false; }

    // Disparo (K)
    p.shotCd = Math.max(0, p.shotCd - rawDt);
    if (this.keyPressed('KeyK')) this.fireWeapon();

    // Cambio de arma
    if (this.keyPressed('Digit1')) this.switchWeapon(0);
    if (this.keyPressed('Digit2')) this.switchWeapon(1);

    // Física
    if (!p.dashing) p.vy += this.g * dt;
    p.onGround = false;
    this.collideRect(p, this.getPlatforms(), dt);
    if (p.x < 0) p.x = 0;
    if (p.x + p.w > this.vw()) p.x = this.vw()-p.w;

    // Shots update & collisions
    for (const s of this.shots){ if (s.room===this.currentRoom){ s.x += s.vx * dt; s.life -= rawDt; } }
    for (const s of this.shots){
      if (s.room !== this.currentRoom) continue;
      for (const e of this.enemies){
        if (e.alive && e.room===this.currentRoom && this.rectsOverlap({x:s.x,y:s.y,w:s.w,h:s.h},{x:e.x,y:e.y,w:e.w,h:e.h})){
          e.hp -= s.dmg; s.life = 0;
          if (e.hp<=0){ e.alive=false; this.loot.push({type:"coin", val:8+Math.floor(Math.random()*10), x:e.x,y:e.y,w:10,h:10,room:e.room}); }
        }
      }
      const b=this.boss;
      if (b.alive && this.currentRoom===b.room && this.rectsOverlap({x:s.x,y:s.y,w:s.w,h:s.h},{x:b.x,y:b.y,w:b.w,h:b.h})) {
        b.hp -= s.dmg; s.life=0;
        if (b.hp<=0){ b.alive=false; this.loot.push({type:"coin", val:50, x:b.x,y:b.y,w:12,h:12,room:b.room});
          // Quest progress: drop 1 core
          this.loot.push({type:"core", x:b.x+12,y:b.y,w:12,h:12,room:b.room});
        }
      }
    }
    this.shots = this.shots.filter(s=>s.life>0 && s.x>-40 && s.x<this.vw()+40);

    // Enemigos
    for (const e of this.enemies) if (e.alive && e.room===this.currentRoom){
      e.x += e.vx * e.dir * dt;
      const leftBound = 40, rightBound = this.vw()-40-e.w;
      if (e.x < leftBound) { e.x = leftBound; e.dir = 1; }
      if (e.x > rightBound) { e.x = rightBound; e.dir = -1; }
      if (this.rectsOverlap({x:p.x,y:p.y,w:p.w,h:p.h},{x:e.x,y:e.y,w:e.w,h:e.h})) {
        if (p.parry){ e.hp -= 40; if (e.hp<=0){ e.alive=false; this.loot.push({type:"coin", val:12, x:e.x,y:e.y,w:10,h:10,room:e.room}); } }
        else if (p.inv<=0) { p.hp = Math.max(0, p.hp - e.touch); p.inv = p.invTime; this.engine.audio.hurt(); if (p.hp===0) this.respawn(); }
      }
    }

    // Boss
    this.bossAI(dt, rawDt);
    for (const bs of this.bossShots){
      if (this.currentRoom !== this.boss.room) continue;
      bs.x += bs.vx * dt; bs.y += bs.vy * dt; bs.life -= rawDt;
      if (this.rectsOverlap({x:p.x,y:p.y,w:p.w,h:p.h},{x:bs.x,y:bs.y,w:bs.w,h:bs.h})) {
        if (p.parry && this.boss.alive){
          bs.vx = (this.boss.x < p.x ? -1 : 1) * Math.abs(bs.vx);
          bs.vy *= -0.3;
          this.engine.audio.parry();
        } else if (p.inv<=0){
          p.hp = Math.max(0, p.hp - bs.dmg); p.inv = p.invTime; bs.life = 0; this.engine.audio.hurt();
          if (p.hp===0) this.respawn();
        }
      }
    }
    this.bossShots = this.bossShots.filter(s=>s.life>0 && s.x>-60 && s.x<this.vw()+60 && s.y>-80 && s.y<this.vh()+80);

    // Loot
    for (const it of this.loot){
      if (it.room !== this.currentRoom) continue;
      it.vy = (it.vy||0) + this.g * dt * 0.5;
      it.y += it.vy * dt;
      const gy = this.vh()-64;
      if (it.y + it.h > gy){ it.y = gy - it.h; it.vy=0; }
      if (this.rectsOverlap({x:p.x,y:p.y,w:p.w,h:p.h},{x:it.x,y:it.y,w:it.w,h:it.h})) {
        if (it.type==="coin") this.p.coins += it.val||5;
        else if (it.type==="core"){ const g=this.quest.goals[0]; g.have = Math.min(g.need, (g.have||0)+1); if (g.have>=g.need) this.quest.done=true; this.engine.toast("⚡ Núcleo obtenido"); }
        else this.pickLoot(it);
        it.collected = true; this.engine.audio.loot();
      }
    }
    this.loot = this.loot.filter(i=>!i.collected);

    // Puertas
    for (const d of this.getDoors()){
      if (this.rectsOverlap({x:p.x,y:p.y,w:p.w,h:p.h}, d)) {
        const to = d.to;
        if (to!=null){
          this.changeRoom(to, d.x<32 ? "fromRight" : "fromLeft");
        }
        break;
      }
    }

    // Portales (tipo 6): teletransportan si quest completada o si portal inicial (sala1)
    for (const portal of this.portals){
      if (portal.room!==this.currentRoom) continue;
      if (this.rectsOverlap({x:p.x,y:p.y,w:p.w,h:p.h}, portal)){
        if (this.currentRoom===0){ this.changeRoom(2, "center"); this.engine.toast("🌀 Teleport a Sala 3"); }
        else if (this.currentRoom===2 && (this.quest.done || (this.quest.goals[0].have||0)>=1)){ this.changeRoom(3, "center"); this.engine.toast("🌀 Teleport a Sala 4"); }
      }
    }

    // Checkpoints: activar al tocar (tipo 7)
    for (const cp of this.checkpointsTiles){
      if (cp.room===this.currentRoom && this.rectsOverlap({x:p.x,y:p.y,w:p.w,h:p.h}, cp)){
        this.checkpoint = { room: this.currentRoom, x: cp.x+10, y: cp.y-4 };
      }
    }

    // Cofres (E)
    if (this.keyPressed('KeyE')) this.tryOpenChest();

    // Tienda UI near
    let nearShop = false;
    if (this.shop && this.shop.room===this.currentRoom){
      const s=this.shop;
      if (Math.hypot((p.x+p.w/2)-(s.x+s.w/2), (p.y+p.h/2)-(s.y+s.h/2)) < 64) nearShop=true;
    }
    this.renderShopUI(nearShop);

    // Quest panel (Q)
    if (this.keyPressed('KeyQ')) this.toggleQuest();

    // Opciones (O)
    if (this.keyPressed('KeyO')) this.toggleOptions();

    // Recursos
    p.inv = Math.max(0, p.inv - rawDt);
    p.en = clamp(p.en + p.enRegen * rawDt * (p.btActive?0.5:1), 0, p.enMax);

    // Menú
    if (this.keyDown('KeyM')) this.engine.start('menu');

    // Cámara
    this.updateCamera();

    this.prevKeys = Object.assign({}, this.engine.keys);
  }

  changeRoom(to, from){
    this.currentRoom = to;
    this.visited.add(to);
    const p=this.p;
    if (from==="fromRight") { p.x = this.vw()-60; p.y = 120; }
    else if (from==="fromLeft") { p.x = 30; p.y = 120; }
    else { p.x = this.vw()/2 - p.w/2; p.y = 120; }
    p.vx = 0; p.vy = 0;
    this.renderShopUI(false);
  }

  respawn(){
    const cp = this.checkpoint;
    this.p.hp = this.p.hpMax;
    this.p.x = cp.x || 120;
    this.p.y = cp.y || 120;
    this.currentRoom = cp.room || 0;
    this.engine.toast("↺ Respawn en el checkpoint");
  }

  toggleQuest(){
    const panel = document.getElementById('questPanel');
    if (panel){ panel.remove(); return; }
    const p = document.createElement('div');
    p.id='questPanel';
    p.className='panel';
    p.style.position='fixed'; p.style.left='12px'; p.style.top='12px';
    const g=this.quest.goals[0];
    p.innerHTML = `<div><b>Quest:</b> ${this.quest.title} ${this.quest.done?'<span class="badge">Completada</span>':''}</div>
      <div>- ${g.label}: ${g.have||0}/${g.need}</div>
      <div>Tips: derrota al mini-jefe (sala 4) para conseguir Núcleos; usa portales cuando estén activos.</div>`;
    this.engine.ui.appendChild(p);
  }

  drawMinimap(ctx){
    const cam=this.engine.cam;
    const x = cam.w - 160, y = cam.h - 100, cell=24;
    ctx.fillStyle="#0c1330"; ctx.fillRect(x-10,y-10, cell*3+20, cell*2+20);
    for (let i=0;i<4;i++){
      const cx = x + (i%3)*cell;
      const cy = y + (i>1?cell:0);
      const visited = this.visited.has(i);
      ctx.fillStyle = visited ? "#3254ff" : "#1a254d";
      ctx.fillRect(cx, cy, cell-4, cell-4);
      if (i===this.currentRoom){ ctx.fillStyle="#ffd166"; ctx.fillRect(cx+6, cy+6, cell-16, cell-16); }
    }
    ctx.fillStyle="#cfe7ff"; ctx.fillText("Mapa", x-6, y-18);
  }

  draw(ctx){
    const cam=this.engine.cam;
    ctx.save();
    ctx.fillStyle="#000"; ctx.fillRect(0,0,this.engine.canvas.width,this.engine.canvas.height);
    ctx.translate(this.engine.viewX, this.engine.viewY);
    ctx.scale(this.engine.viewScale, this.engine.viewScale);

    // Fondo
    ctx.fillStyle = this.rooms[this.currentRoom].bg;
    ctx.fillRect(0,0,cam.w,cam.h);

    // Tiles
    const map = this.tilemaps[this.currentRoom];
    for (let y=0;y<map.length;y++){
      for (let x=0;x<map[0].length;x++){
        const t = map[y][x];
        if (t===1){ ctx.fillStyle="#1b1030"; ctx.fillRect(x*32,y*32,32,32); }
        else if (t===2){ ctx.globalAlpha=0.35; ctx.fillStyle="#52ff9f"; ctx.fillRect(x*32,y*32,32,64); ctx.globalAlpha=1; }
        else if (t===3){ ctx.fillStyle="#ffd166"; ctx.fillRect(x*32+4,y*32+10,24,14); }
        else if (t===4){ ctx.fillStyle="#a784ff"; ctx.fillRect(x*32+2,y*32+6,28,20); }
        else if (t===5){ ctx.globalAlpha=0.15; ctx.fillStyle="#9bb3ff"; ctx.fillRect(x*32,y*32,32,8); ctx.globalAlpha=1; }
        else if (t===6){ ctx.globalAlpha=0.25; ctx.fillStyle="#00f0ff"; ctx.fillRect(x*32+4,y*32,24,64); ctx.globalAlpha=1; }
        else if (t===7){ ctx.fillStyle="#52ff9f"; ctx.fillRect(x*32+6,y*32+4,20,26); }
      }
    }

    // Enemigos
    for (const e of this.enemies) if (e.alive && e.room === this.currentRoom) {
      ctx.fillStyle = "#ff5e7d";
      ctx.fillRect(e.x, e.y, e.w, e.h);
      ctx.fillStyle = "#2b1b2a"; ctx.fillRect(e.x-2, e.y-8, e.w+4, 6);
      ctx.fillStyle = "#ff88a1"; const ew = (e.w+4) * Math.max(0, e.hp/60);
      ctx.fillRect(e.x-2, e.y-8, ew, 6);
    }

    // Boss
    if (this.boss.alive && this.currentRoom===this.boss.room){
      const b=this.boss;
      ctx.fillStyle = "#7b34ff";
      ctx.fillRect(b.x, b.y, b.w, b.h);
      const pad = 12, barW = cam.w - pad*2, barH = 12;
      ctx.fillStyle="#2a1a44"; ctx.fillRect(pad, cam.h - pad - barH, barW, barH);
      ctx.fillStyle="#a784ff"; ctx.fillRect(pad, cam.h - pad - barH, barW*(b.hp/b.hpMax), barH);
      ctx.fillStyle="#cfe7ff"; ctx.fillText("BOSS", pad, cam.h - pad - barH - 2);
    }

    // Proyectiles
    ctx.fillStyle = "#9bb3ff";
    for (const s of this.shots) if (s.room===this.currentRoom) ctx.fillRect(s.x, s.y, s.w, s.h);
    // Boss shots
    ctx.fillStyle = "#ffc78a";
    for (const s of this.bossShots) if (s.room===this.currentRoom) ctx.fillRect(s.x, s.y, s.w, s.h);

    // Loot
    for (const it of this.loot) if (it.room===this.currentRoom){
      if (it.type==="hp") ctx.fillStyle="#52ff9f";
      else if (it.type==="bt") ctx.fillStyle="#9bb3ff";
      else if (it.type==="en") ctx.fillStyle="#7df9ff";
      else if (it.type==="ammo") ctx.fillStyle="#ffd166";
      else if (it.type==="coin") ctx.fillStyle="#e0e722";
      else if (it.type==="core") ctx.fillStyle="#00f0ff";
      else ctx.fillStyle="#ffffff";
      ctx.fillRect(it.x, it.y, it.w, it.h);
    }

    // Jugador
    const p=this.p;
    ctx.fillStyle = p.inv>0 ? "#b2fff9" : "#7df9ff";
    ctx.fillRect(p.x, p.y, p.w, p.h);
    if (p.attacking) {
      const hx = p.facing>0 ? p.x + p.w : p.x - 22;
      ctx.globalAlpha = 0.35; ctx.fillStyle = "#7dffc7"; ctx.fillRect(hx, p.y+4, 22, p.h-8); ctx.globalAlpha = 1;
    }
    if (p.parry) { ctx.globalAlpha = 0.35; ctx.fillStyle = "#c1ff7d"; ctx.fillRect(p.x-4, p.y-4, p.w+8, p.h+8); ctx.globalAlpha = 1; }

    // HUD
    const pad = 12, barW = 180, barH = 10;
    ctx.fillStyle="#2a334d"; ctx.fillRect(pad,pad,barW,barH);
    ctx.fillStyle="#52ff9f"; ctx.fillRect(pad,pad,barW*(p.hp/p.hpMax),barH);
    ctx.fillStyle="#cfe7ff"; ctx.fillText("HP", pad, pad-2);

    ctx.fillStyle="#2a334d"; ctx.fillRect(pad,pad+14,barW,barH);
    ctx.fillStyle="#9bb3ff"; ctx.fillRect(pad,pad+14,barW*(p.bt/p.btMax),barH);
    ctx.fillStyle="#cfe7ff"; ctx.fillText("BT", pad, pad+12);

    ctx.fillStyle="#2a334d"; ctx.fillRect(pad,pad+28,barW,barH);
    ctx.fillStyle="#7df9ff"; ctx.fillRect(pad,pad+28,barW*(p.en/p.enMax),barH);
    ctx.fillStyle="#cfe7ff"; ctx.fillText("EN", pad, pad+26);

    const w = p.weapons[p.wIndex];
    let ammoTxt = w.type==="energy" ? "∞" : (p.ammo[w.ammoKey||"bullet"]||0);
    ctx.fillStyle= RARITY.common.color;
    ctx.fillText(`${w.name}  DMG ${w.dmg}  AMMO ${ammoTxt}`, pad, pad+46);

    ctx.fillStyle="#cfe7ff"; ctx.fillText(`Sala ${this.currentRoom+1}/4  💰 ${p.coins}`, cam.w - 200, pad+10);
    ctx.fillStyle="#cfe7ff"; ctx.fillText(`E: cofre · Q: quest · O: opciones`, cam.w - 240, pad+26);

    // Minimap
    this.drawMinimap(ctx);

    ctx.restore();
  }
}
