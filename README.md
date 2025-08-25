# NEONVANIA — Vertical Slice (Starter)

Este es un **prototipo jugable** de un metroidvania con mecánicas de lucha y un toque RPG + *tiempo bala*. Está diseñado como **punto de partida** para evolucionar a un juego completo (Steam-ready).

## Controles
- Mover: **A/D** o **←/→**
- Saltar (doble salto y salto en pared): **Space / W / ↑ / Tap**
- Dash: **Shift**
- Atacar (melee / combo): **J**
- Disparo (rango): **K**
- Pausa: **P**
- Bullet time: **mantener Shift** o mantener toque

## Características incluidas
- Movimiento avanzado (doble salto, *wall slide*, *dash* aéreo, *air control*)
- Combate cuerpo a cuerpo con *combo window*
- Proyectiles básicos
- Enemigos “grunt” con patrulla/acecho simple
- XP, nivel y puntos de habilidad (persistencia local)
- *Bullet time* con barra de energía
- Mapa por tiles + colisiones
- Cámara con seguimiento
- HUD básico
- Arquitectura de **escenas** y pequeño “engine” listo para crecer

## Estructura
```
index.html
styles.css
src/
  engine.js     # bucle, input, audio, helpers, física básica
  game.js       # registro y arranque de escenas
  scenes/
    menu.js
    level1.js   # vertical slice jugable
assets/
  (espacio para sprites/sonidos más adelante)
```

## Siguientes pasos sugeridos
1. **Arte & audio**: sustituir rectángulos por sprites animados (idle, run, jump, attack, hit, death).
2. **Combate profundo**: *launchers*, antiaéreos, *air dashes*, cancelaciones, *parry* y *perfect dodge* con cámara *hit stop*.
3. **RPG real**: árbol de habilidades (dash mejorado, triple salto, hook), armas con estadísticas, *loot tables*, *crafting* ligero.
4. **IA variada**: *patroller*, *shooter*, *bomber*, *shield*, mini-jefes con patrones.
5. **Mundo**: gestor de salas/zonas, backtracking con habilidades, *save points* y *fast travel*.
6. **Herramientas**: loader de *tilemaps* (Tiled), editor de datos en JSON, sistema de *triggers* y *cutscenes*.
7. **Efectos**: partículas, *hit sparks*, *screen shake*, *chromatic aberration*, shaders (WebGL o Canvas comp).
8. **Steam**: empaquetado con Electron/Tauri, *input remapping*, *fullscreen*, *achievements* via Steamworks.

---

> Este proyecto es libre para que lo modifiques. Si quieres, puedo continuar y convertir este vertical slice en un **proyecto completo**, con *tilemaps* reales, *tooling* y export a escritorio.
