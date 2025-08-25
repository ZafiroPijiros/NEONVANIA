export class Level1 {
  constructor(engine){
    this.engine=engine;
    this.player = { x: 100, y: 100, size: 26, color: "#7df9ff", vx:0, vy:0 };
    this.g = 1400; this.speed=320; this.jumpV=-560; this.onGround=false;
  }
  start(){
    this.engine.ui.innerHTML="<p style='color:#cfe7ff'>Nivel 1 — Mover con A/D o ←/→, saltar con Space, volver al menú: M</p>";
  }
  update(dt){
    const k=this.engine.keys,p=this.player;
    const left=k['ArrowLeft']||k['KeyA'], right=k['ArrowRight']||k['KeyD'];
    if(left&&!right)p.vx=-this.speed; else if(right&&!left)p.vx=this.speed; else p.vx=0;
    const wantJump=k['Space']||k['KeyW']||k['ArrowUp'];
    if(wantJump&&this.onGround){p.vy=this.jumpV; this.onGround=false;}
    p.vy+=this.g*dt; p.x+=p.vx*dt; p.y+=p.vy*dt;
    const gy=this.engine.canvas.height/this.engine.dpr-80;
    if(p.y+p.size>gy){p.y=gy-p.size;p.vy=0;this.onGround=true;}
    if(k["KeyM"])this.engine.start("menu");
  }
  draw(ctx){
    const cw=this.engine.canvas.width/this.engine.dpr;
    const ch=this.engine.canvas.height/this.engine.dpr;
    ctx.save();ctx.setTransform(this.engine.dpr,0,0,this.engine.dpr,0,0);
    ctx.fillStyle="#070811";ctx.fillRect(0,0,cw,ch);
    const gy=ch-80;ctx.fillStyle="#1b1030";ctx.fillRect(0,gy,cw,ch-gy);
    ctx.fillStyle=this.player.color;ctx.fillRect(this.player.x,this.player.y,this.player.size,this.player.size);
    ctx.restore();
  }
}
