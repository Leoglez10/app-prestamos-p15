/**
 * Distingue a la pistola de código de barras de una persona tecleando.
 *
 * No todos los modelos vienen configurados para mandar el `Enter` al final del
 * disparo: sin ese sufijo el código aterriza en el campo y ahí se queda hasta
 * que alguien lo teclea a mano, que es justo lo que el recorrido con pistola
 * quiere evitar. La velocidad las separa: la pistola escribe el código entero
 * en milisegundos, una persona no. Solo la ráfaga dispara sola; lo tecleado a
 * mano sigue esperando el `Enter`.
 *
 * Se mide en la aplicación y no en el hardware porque el mismo lector se usa en
 * varias escuelas y nadie garantiza que llegue configurado.
 */

/** Más lento que esto entre dos teclas ya no es una pistola, es una persona. */
export const MAX_MS_ENTRE_TECLAS = 35;

/** Teclas rápidas seguidas antes de creerle a la ráfaga. */
export const MIN_TECLAS_DE_RAFAGA = 3;

/** Silencio tras la última tecla que se toma como fin del código. */
export const MS_DE_SILENCIO = 140;

export type Rafaga = {
  /** Marca de tiempo de la última tecla, en milisegundos. */
  ultimaTecla: number;
  /** Teclas rápidas encadenadas hasta ahora. */
  seguidas: number;
};

export const rafagaInicial: Rafaga = { ultimaTecla: 0, seguidas: 0 };

/**
 * Avanza la ráfaga con una tecla nueva. `vacio` es el campo quedando en blanco
 * (tras disparar o al limpiarlo): ahí la cuenta vuelve a cero para que el
 * código siguiente se juzgue solo.
 */
export function conTecla(rafaga: Rafaga, ahora: number, vacio = false): Rafaga {
  if (vacio) return { ultimaTecla: ahora, seguidas: 0 };
  const rapida = ahora - rafaga.ultimaTecla <= MAX_MS_ENTRE_TECLAS;
  return { ultimaTecla: ahora, seguidas: rapida ? rafaga.seguidas + 1 : 0 };
}

/** ¿Lo que se acaba de escribir vino de la pistola? */
export function esDisparo(rafaga: Rafaga): boolean {
  return rafaga.seguidas >= MIN_TECLAS_DE_RAFAGA;
}

/**
 * Lo mismo, pero sin campo de texto: la pistola disparando contra la pantalla.
 *
 * En la pestaña de Inventario no hay un input esperando el código — quien
 * recorre solo quiere apuntarle a una etiqueta y ver la ficha. El teclado se
 * escucha entero y se arma el código acá; `texto` se descarta en cuanto una
 * tecla llega lenta, así que lo tecleado a mano nunca se acumula.
 */
export type Captura = {
  rafaga: Rafaga;
  texto: string;
};

export const capturaInicial: Captura = { rafaga: rafagaInicial, texto: "" };

export function conTeclaGlobal(captura: Captura, tecla: string, ahora: number): Captura {
  const rafaga = conTecla(captura.rafaga, ahora);
  // `seguidas === 0` es "esta tecla no viene encadenada a la anterior": el
  // código empieza aquí y lo anterior era ruido.
  return { rafaga, texto: rafaga.seguidas === 0 ? tecla : captura.texto + tecla };
}

/** ¿Hay un código completo de la pistola listo para usarse? */
export function capturaLista(captura: Captura): boolean {
  return esDisparo(captura.rafaga);
}
