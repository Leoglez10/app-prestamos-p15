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
