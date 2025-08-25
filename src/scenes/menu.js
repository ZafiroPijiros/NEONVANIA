export class MenuScene {
  constructor(engine){ this.engine=engine; }
  start(){
    const ui = this.engine.ui;
    ui.innerHTML = `
      <div style="text-align:center; padding:20px; color:#cfe7ff;">
        <h1>🌌 NEONVANIA v2</h1>
        <p>Jugador avanzado: doble salto, dash, ataque y HUD</p>
        <p>Controles: A/D moverse · Space saltar · Shift dash · J ataque · M menú</p>
        <button id="playBtn">▶ Jugar</button>
      </div>
    `;
    document.getElementById("playBtn").onclick = () => this.engine.start("level1");
  }
  update(dt){}
  draw(ctx){
    ctx.fillStyle="#0a0b14";
    ctx.fillRect(0,0,this.engine.canvas.width,this.engine.canvas.height);
  }
}
