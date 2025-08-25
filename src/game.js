import { Engine } from "./engine.js";
import { MenuScene } from "./scenes/menu.js";
import { Level1 } from "./scenes/level1.js";

export function boot() {
  const canvas = document.getElementById("game");
  const ui = document.getElementById("ui");
  const engine = new Engine(canvas, ui);

  // Cargar opciones (SFX/volumen)
  try{
    const opt = JSON.parse(localStorage.getItem("neonvania_opts")||"{}");
    if (typeof opt.enabled === 'boolean') engine.audio.enabled = opt.enabled;
    if (typeof opt.master === 'number') engine.audio.master = opt.master;
  }catch{}

  engine.addScene("menu", new MenuScene(engine));
  engine.addScene("level1", new Level1(engine));
  engine.start("menu");
  window.engine = engine;
}
boot();
