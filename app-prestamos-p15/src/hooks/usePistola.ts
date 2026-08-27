/**
 * Dispara solo cuando el código lo escribió la pistola, no una persona.
 *
 * Existe porque hay lectores que no mandan el `Enter` al final del disparo: el
 * código queda escrito en el campo y el recorrido se detiene hasta que alguien
 * teclea. El criterio para separar pistola de persona vive en
 * `src/utils/pistola.ts`; aquí solo se espera el silencio que marca el final
 * del código antes de llamar a `disparar`.
 *
 * El `Enter` sigue funcionando igual: esto es una red, no un reemplazo.
 */
import { useEffect, useRef } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import {
  capturaInicial,
  capturaLista,
  conTecla,
  conTeclaGlobal,
  esDisparo,
  MS_DE_SILENCIO,
  rafagaInicial,
} from "../utils/pistola";

export function usePistola(valor: string, disparar: () => void) {
  const rafaga = useRef(rafagaInicial);
  const dispararRef = useRef(disparar);

  // El callback se rearma en cada render; guardarlo aparte evita que el
  // temporizador se reinicie con cada uno y nunca llegue a vencer.
  useEffect(() => {
    dispararRef.current = disparar;
  });

  useEffect(() => {
    rafaga.current = conTecla(rafaga.current, performance.now(), valor === "");
    if (!esDisparo(rafaga.current)) return;
    const id = setTimeout(() => dispararRef.current(), MS_DE_SILENCIO);
    return () => clearTimeout(id);
  }, [valor]);
}

/**
 * La pistola disparando contra un campo que ya tenía texto.
 *
 * El buscador del inventario no se limpia solo: si alguien escaneó una etiqueta
 * y después apunta a la siguiente, el código nuevo se pega al viejo y el
 * resultado no existe (`3005532` + `MXL3322DNZ`). Escribir a mano no tiene ese
 * problema porque uno ve el campo; con la pistola el gesto es apuntar y listo.
 *
 * Se escucha el `keydown` del propio campo y se arma el código aparte, igual
 * que en `useEscaneoGlobal`. Cuando la ráfaga termina, el campo se reemplaza
 * por el código solo: lo que hubiera antes era de otro escaneo.
 */
export function useEntradaPistola(onCodigo: (codigo: string) => void) {
  const onCodigoRef = useRef(onCodigo);
  const captura = useRef(capturaInicial);
  const temporizador = useRef(0);

  useEffect(() => {
    onCodigoRef.current = onCodigo;
  });

  useEffect(() => () => window.clearTimeout(temporizador.current), []);

  const soltar = () => {
    const codigo = captura.current.texto;
    captura.current = capturaInicial;
    if (codigo) onCodigoRef.current(codigo);
  };

  return (evento: ReactKeyboardEvent<HTMLInputElement>) => {
    if (evento.key === "Enter") {
      window.clearTimeout(temporizador.current);
      captura.current = capturaInicial;
      return;
    }
    if (evento.key.length !== 1 || evento.ctrlKey || evento.metaKey || evento.altKey) return;

    captura.current = conTeclaGlobal(captura.current, evento.key, performance.now());
    window.clearTimeout(temporizador.current);
    if (!capturaLista(captura.current)) return;
    temporizador.current = window.setTimeout(soltar, MS_DE_SILENCIO);
  };
}
