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
  const [codigo, setCodigo] = useState("223992647");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedCodigo = codigo.trim();
    if (!trimmedCodigo || submitting) return;

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
        <h2 className="login-form-title">Código de profesor</h2>
        <p className="login-form-subtitle" id="codigo-hint">Usa el código asignado a tu cuenta.</p>
      </div>
      <label className="login-form-field">
        <span>Código</span>
        <input
          type="text"
          name="codigo"
          value={codigo}
          onChange={(event) => setCodigo(event.target.value)}
          autoComplete="username"
          autoFocus
          required
          disabled={submitting}
          inputMode="numeric"
          aria-describedby={`codigo-hint${error ? " login-error" : ""}`}
          aria-invalid={error ? true : undefined}
        />
      </label>
      {error ? (
        <div className="feedback error" id="login-error" role="alert">
          {error}
        </div>
      ) : null}
      <button type="submit" disabled={submitting} className="login-form-submit">
        {submitting ? "Verificando..." : "Entrar"}
      </button>
    </form>
  );
}
