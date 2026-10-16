/**
 * Replacements for window.confirm() and window.alert().
 *
 * Tauri's macOS webview (wry 0.55) installs a WKUIDelegate that implements the
 * file-upload, media-permission and new-window callbacks only. WKWebView drops
 * JavaScript dialogs when its delegate has no
 * `runJavaScriptConfirmPanelWithMessage:`, so `confirm()` returned false right
 * away without showing anything: every `if (!confirm(...)) return;` bailed out
 * and the destructive action silently did nothing. `alert()` was swallowed the
 * same way. Windows (WebView2) is unaffected, which is why this only ever broke
 * on macOS.
 *
 * `<dialog>.showModal()` is plain DOM, needs no delegate, and behaves the same
 * on both platforms.
 */

type DialogOptions = {
  confirmLabel?: string;
  cancelLabel?: string;
};

function showDialog(
  message: string,
  options: DialogOptions & { withCancel: boolean },
): Promise<boolean> {
  const { confirmLabel = "Aceptar", cancelLabel = "Cancelar", withCancel } = options;

  return new Promise((resolve) => {
    const dialog = document.createElement("dialog");
    dialog.className = "app-confirm";

    const text = document.createElement("p");
    text.className = "app-confirm-message";
    text.textContent = message;

    const actions = document.createElement("div");
    actions.className = "app-confirm-actions";

    const accept = document.createElement("button");
    accept.type = "button";
    accept.textContent = confirmLabel;

    let answer = false;
    accept.addEventListener("click", () => {
      answer = true;
      dialog.close();
    });

    let cancel: HTMLButtonElement | null = null;
    if (withCancel) {
      cancel = document.createElement("button");
      cancel.type = "button";
      cancel.className = "ghost";
      cancel.textContent = cancelLabel;
      cancel.addEventListener("click", () => dialog.close());
      actions.append(cancel);
    }
    actions.append(accept);

    // Esc closes the dialog without going through a button, so settle on
    // `close` rather than on the clicks; the promise then always resolves, and
    // resolves exactly once.
    dialog.addEventListener("close", () => {
      dialog.remove();
      resolve(answer);
    });

    dialog.append(text, actions);
    document.body.append(dialog);
    dialog.showModal();
    // Every confirm here guards a consequential action, so a stray Enter must
    // never be the one that goes through with it.
    (cancel ?? accept).focus();
  });
}

export const confirmDialog = (message: string, options: DialogOptions = {}): Promise<boolean> =>
  showDialog(message, { ...options, withCancel: true });

export const alertDialog = async (message: string, options: DialogOptions = {}): Promise<void> => {
  await showDialog(message, { ...options, withCancel: false });
};

/**
 * Lo que seria `window.prompt`, que el mismo WKUIDelegate se traga igual que
 * `confirm`. Devuelve `null` si se cancela, para que quien lo llama distinga
 * "no quiso" de "escribio vacio".
 */
export const promptDialog = (
  message: string,
  options: DialogOptions & { placeholder?: string; initialValue?: string } = {},
): Promise<string | null> => {
  const {
    confirmLabel = "Agregar",
    cancelLabel = "Cancelar",
    placeholder = "",
    initialValue = "",
  } = options;

  return new Promise((resolve) => {
    const dialog = document.createElement("dialog");
    dialog.className = "app-confirm";

    const form = document.createElement("form");
    form.method = "dialog";

    const text = document.createElement("p");
    text.className = "app-confirm-message";
    text.textContent = message;

    const input = document.createElement("input");
    input.type = "text";
    input.value = initialValue;
    input.placeholder = placeholder;
    input.autocomplete = "off";

    const actions = document.createElement("div");
    actions.className = "app-confirm-actions";

    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "ghost";
    cancel.textContent = cancelLabel;
    cancel.addEventListener("click", () => dialog.close());

    const accept = document.createElement("button");
    accept.type = "submit";
    accept.textContent = confirmLabel;

    let answer: string | null = null;
    // El submit del form es el mismo camino para el boton y para Enter: sin
    // esto, escribir y apretar Enter cerraba el dialogo sin devolver nada.
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const escrito = input.value.trim();
      if (!escrito) {
        input.focus();
        return;
      }
      answer = escrito;
      dialog.close();
    });

    dialog.addEventListener("close", () => {
      dialog.remove();
      resolve(answer);
    });

    actions.append(cancel, accept);
    form.append(text, input, actions);
    dialog.append(form);
    document.body.append(dialog);
    dialog.showModal();
    input.focus();
  });
};
