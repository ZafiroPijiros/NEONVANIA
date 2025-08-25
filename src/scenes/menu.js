export class MenuScene {
  constructor(engine){ this.engine=engine; }
  start(){
    const ui = this.engine.ui;
    ui.innerHTML = `
      <div style="text-align:center; padding:20px; color:#cfe7ff;">
        <h1>🌌 NEONVANIA v4</h1>
        <p>Bullet time · Parry · Armas (energía y munición) · Loot · Mini-jefe</p>
        <p>Controles: A/D moverse · Space doble salto · Shift bullet time (tap = dash) · J ataque · K disparo · L parry · 1/2 armas · M menú</p>
        <button id="playBtn">▶ Jugar</button>
      </div>
    `;
    document.getElementById("playBtn").onclick = () => this.engine.start("level1");
  }
  update(){}
  draw(ctx){
    ctx.fillStyle="#0a0b14";
    ctx.fillRect(0,0,this.engine.canvas.width,this.engine.canvas.height);
  }
}
