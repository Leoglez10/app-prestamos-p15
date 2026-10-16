/**
 * Escucha la pistola en toda la pantalla, sin campo de escaneo.
 *
 * La toma física tiene un input dedicado porque ahí el trabajo ES escanear. En
 * el inventario no: quien está ahí mira una tabla, y lo único que quiere cuando
 * levanta un aparato es apuntarle y ver su ficha. Obligarlo a hacer clic en un
 * campo antes de cada disparo convierte un gesto en tres.
 *
 * El criterio para separar pistola de persona es el mismo de `utils/pistola.ts`:
 * solo la ráfaga cuenta. Escribir a mano nunca dispara esto — ni siquiera con
 * Enter — porque aquí no hay forma de saber a qué campo iba dirigido.
 */
import { useEffect, useRef } from "react";
import { capturaInicial, capturaLista, conTeclaGlobal, MS_DE_SILENCIO } from "../utils/pistola";

/** ¿El teclado le pertenece ya a alguien más? */
const escribiendoEnUnCampo = (): boolean => {
  const foco = document.activeElement;
  if (!(foco instanceof HTMLElement)) return false;
  return foco.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(foco.tagName);
};

export function useEscaneoGlobal(activo: boolean, onCodigo: (codigo: string) => void) {
  const onCodigoRef = useRef(onCodigo);

  useEffect(() => {
    onCodigoRef.current = onCodigo;
  });

  useEffect(() => {
    if (!activo) return;

    let captura = capturaInicial;
    let temporizador = 0;

    const soltar = () => {
      const codigo = captura.texto;
      captura = capturaInicial;
      if (codigo) onCodigoRef.current(codigo);
    };

    const alTeclear = (evento: KeyboardEvent) => {
      // El buscador y los formularios ganan siempre: si hay un campo enfocado,
      // el código va ahí y esto no existe.
      if (escribiendoEnUnCampo()) return;

      if (evento.key === "Enter") {
        window.clearTimeout(temporizador);
        if (capturaLista(captura)) soltar();
        else captura = capturaInicial;
        return;
      }

      if (evento.key.length !== 1 || evento.ctrlKey || evento.metaKey || evento.altKey) return;

      captura = conTeclaGlobal(captura, evento.key, performance.now());
      window.clearTimeout(temporizador);
      if (!capturaLista(captura)) return;

      // Los lectores que no mandan Enter terminan el código con silencio.
      temporizador = window.setTimeout(soltar, MS_DE_SILENCIO);
    };

    window.addEventListener("keydown", alTeclear);
    return () => {
      window.clearTimeout(temporizador);
      window.removeEventListener("keydown", alTeclear);
    };
  }, [activo]);
}
