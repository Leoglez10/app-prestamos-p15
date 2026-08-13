// Single-input admin code login for /prestamo-rapido. The form owns its error
// state and submit lifecycle; the parent only supplies the submit callback.

import { useState, type FormEvent } from "react";

export type LoginFormProps = {
  // Dual-arg signature kept for backward compatibility with Admin.tsx, which
  // still uses codigo+PIN. The simplified /prestamo-rapido flow passes only
  // `codigo` (and an empty pin); the PIN field is not rendered.
  onSubmit: (codigo: string, pin: string) => Promise<void>;
  // Optional external error for backward compatibility with Admin.tsx, which
  // renders its own error above the form. The simplified form ignores this
  // prop and owns its error display internally.
  error?: string | null;
};

export function LoginForm({ onSubmit }: LoginFormProps) {
  const [codigo, setCodigo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedCodigo = codigo.trim();
    if (submitting) return;
    if (!trimmedCodigo) {
      setError("Ingresa tu código administrativo.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      // The `pin` arg is accepted for backward compatibility with the legacy
      // /admin flow; the simplified form has no PIN and passes an empty string.
      await onSubmit(trimmedCodigo, "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="login-form" onSubmit={handleSubmit} noValidate aria-busy={submitting}>
      <div className="login-form-header">
        <h2 className="login-form-title">Código administrativo</h2>
        <p className="login-form-subtitle" id="codigo-hint">
          Ingresa el código asignado a tu cuenta de administrador.
        </p>
      </div>
      <div className="login-form-field">
        <label htmlFor="admin-code">Código de acceso</label>
        <input
          id="admin-code"
          type="text"
          name="codigo"
          value={codigo}
          onChange={(event) => {
            setCodigo(event.target.value);
            if (error) setError(null);
          }}
          autoComplete="username"
          autoCapitalize="none"
          autoFocus
          required
          disabled={submitting}
          inputMode="numeric"
          placeholder="Ingresa tu código administrativo"
          spellCheck={false}
          aria-describedby={`codigo-hint${error ? " login-error" : ""}`}
          aria-invalid={error ? true : undefined}
        />
      </div>
      {error ? (
        <div className="feedback error" id="login-error" role="alert">
          {error}
        </div>
      ) : null}
      <button type="submit" disabled={submitting} className="login-form-submit">
        {submitting ? "Verificando acceso..." : "Acceder a préstamos"}
      </button>
    </form>
  );
}
