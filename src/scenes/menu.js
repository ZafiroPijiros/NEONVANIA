export class MenuScene {
  constructor(engine){ this.engine=engine; }
  start(){
    const ui = this.engine.ui;
    const save = localStorage.getItem("neonvania_save");
    const hasSave = !!save;
    ui.innerHTML = `
      <div class="panel" style="text-align:center; color:#cfe7ff;">
        <h1>🌌 NEONVANIA v6</h1>
        <p>Checkpoints · Portales · Quests · Mapa del mundo · Opciones de audio · + todo lo anterior</p>
        <p>Controles: A/D mover · Space doble salto · Shift BT (tap = dash) · J melee · K disparo · L parry · 1/2 armas · E cofre · Q quest · O opciones · M menú</p>
        <div>
          <button id="newBtn">▶ Nueva partida</button>
          ${hasSave ? '<button id="loadBtn">⏎ Cargar</button>' : ''}
          ${hasSave ? '<button id="delBtn">🗑 Borrar guardado</button>' : ''}
        </div>
      </div>
    `;
    document.getElementById("newBtn").onclick = () => this.engine.start("level1", { load:false });
    if (hasSave) {
      document.getElementById("loadBtn").onclick = () => this.engine.start("level1", { load:true });
      document.getElementById("delBtn").onclick = () => { localStorage.removeItem("neonvania_save"); this.start(); };
    }
  }
  update(){}
  draw(ctx){
    ctx.fillStyle="#0a0b14";
    ctx.fillRect(0,0,this.engine.canvas.width,this.engine.canvas.height);
  }
}
