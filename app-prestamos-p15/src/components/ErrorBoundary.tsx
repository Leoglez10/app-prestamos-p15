/**
 * Muestra el error en pantalla en vez de dejar la app en blanco.
 *
 * Sin esto, cualquier excepcion durante el render deja la ventana en blanco y
 * sin mensaje: en un build de escritorio no hay consola abierta, asi que el
 * unico sintoma que llega es "no abrio". Paso de verdad con el Kiosko en las
 * versiones 0.5.0 a 0.7.1 (hooks despues de un return temprano) y nadie pudo
 * decir que fallaba.
 *
 * Tiene que ser una clase: React no expone `componentDidCatch` como hook.
 */
import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Error de render:", error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <main className="error-boundary">
        <h1>La pantalla no se pudo abrir</h1>
        <p>
          Toma una foto de este mensaje y avisale a soporte. Los prestamos que ya
          estaban registrados no se perdieron.
        </p>
        <pre>{error.message}</pre>
        <button type="button" onClick={() => window.location.assign("/")}>
          Volver al inicio
        </button>
      </main>
    );
  }
}
