import test from "node:test";
import assert from "node:assert/strict";
import {
  capturaInicial,
  capturaLista,
  conTecla,
  conTeclaGlobal,
  esDisparo,
  MAX_MS_ENTRE_TECLAS,
  rafagaInicial,
  type Captura,
  type Rafaga,
} from "./pistola.ts";

/** Teclea un código completo a `ms` por carácter y devuelve la ráfaga final. */
const teclear = (texto: string, ms: number, desde: Rafaga = rafagaInicial): Rafaga => {
  let rafaga = desde;
  let reloj = rafaga.ultimaTecla;
  for (let i = 0; i < texto.length; i++) {
    reloj += ms;
    rafaga = conTecla(rafaga, reloj);
  }
  return rafaga;
};

test("la pistola escribe el código en ráfaga y dispara sola", () => {
  assert.equal(esDisparo(teclear("3382871", 8)), true);
});

test("teclear a mano espera el Enter", () => {
  // 150 ms por carácter es un tecleo humano rápido.
  assert.equal(esDisparo(teclear("3382871", 150)), false);
});

test("una pausa a media ráfaga la corta", () => {
  const empieza = teclear("338", 8);
  const duda = conTecla(empieza, empieza.ultimaTecla + 400);
  assert.equal(esDisparo(duda), false);
});

test("el límite de velocidad es inclusivo", () => {
  assert.equal(esDisparo(teclear("3382871", MAX_MS_ENTRE_TECLAS)), true);
  assert.equal(esDisparo(teclear("3382871", MAX_MS_ENTRE_TECLAS + 1)), false);
});

test("un código de dos dígitos no alcanza para creerle a la ráfaga", () => {
  // Menos de MIN_TECLAS_DE_RAFAGA: mejor esperar el Enter que disparar a medias.
  assert.equal(esDisparo(teclear("33", 8)), false);
});

test("el campo vacío reinicia la cuenta", () => {
  const disparo = teclear("3382871", 8);
  const limpio = conTecla(disparo, disparo.ultimaTecla + 5, true);
  assert.equal(esDisparo(limpio), false);
  assert.equal(esDisparo(teclear("22", 8, limpio)), false);
});

/** Teclea contra el teclado global (sin campo) y devuelve la captura final. */
const tecleaGlobal = (texto: string, ms: number): Captura => {
  let captura = capturaInicial;
  let reloj = 0;
  for (const tecla of texto) {
    reloj += ms;
    captura = conTeclaGlobal(captura, tecla, reloj);
  }
  return captura;
};

test("sin campo de texto, la ráfaga arma el código completo", () => {
  const captura = tecleaGlobal("3382871", 8);
  assert.equal(capturaLista(captura), true);
  assert.equal(captura.texto, "3382871");
});

test("sin campo de texto, teclear a mano no acumula nada", () => {
  const captura = tecleaGlobal("3382871", 150);
  assert.equal(capturaLista(captura), false);
  // Cada tecla lenta arranca de cero: nunca queda un código a medias esperando.
  assert.equal(captura.texto, "1");
});

test("una pausa a media ráfaga tira lo capturado y vuelve a empezar", () => {
  let captura = tecleaGlobal("338", 8);
  captura = conTeclaGlobal(captura, "2", captura.rafaga.ultimaTecla + 400);
  assert.equal(captura.texto, "2");
  assert.equal(capturaLista(captura), false);
});

test("un segundo disparo no se pega al primero", () => {
  // El caso del buscador: alguien escaneó `3005532`, no limpió el campo y
  // apuntó a la siguiente etiqueta. La pausa entre etiquetas es humana, así que
  // el código nuevo empieza de cero en vez de salir `3005532MXL3322DNZ`.
  let captura = tecleaGlobal("3005532", 8);
  assert.equal(captura.texto, "3005532");

  let reloj = captura.rafaga.ultimaTecla + 900;
  for (const tecla of "MXL3322DNZ") {
    captura = conTeclaGlobal(captura, tecla, reloj);
    reloj += 8;
  }
  assert.equal(captura.texto, "MXL3322DNZ");
  assert.equal(capturaLista(captura), true);
});
