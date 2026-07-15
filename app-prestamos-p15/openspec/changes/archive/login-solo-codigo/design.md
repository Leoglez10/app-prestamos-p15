# Design: login-solo-codigo

## Context
This is a simplification of the auth gate added in `admin-auth-prestamo-rapido`. The PIN, idle lockout, 8h TTL, and lock overlay machinery is removed. The state machine shrinks to two states. The data-layer accountability chain (the three new columns on `prestamos_rapidos_alumnos`) is preserved — the simplification only affects who logs in and how, not what gets recorded.

## File changes

| File | Action | Purpose | Mechanical / Analysis |
|------|--------|---------|-----------------------|
| `src/hooks/useInventory.ts` | M | Add `loginAdminByCode(codigo)` next to the existing `loginAdmin(codigo, pin)`. The old `loginAdmin` stays untouched for `Admin.tsx`. | Mechanical, ~15 LOC |
| `src/auth/AuthContext.tsx` | M | Drop `locked` state, `unlock()`, `resetIdleTimer`, `useIdleLock` wiring, and the 60s TTL poll. `login(codigo)` replaces `login(codigo, pin)`. | Analysis, ~40 LOC delta (net negative) |
| `src/auth/LoginForm.tsx` | M | Remove the PIN input. Pre-fill the codigo with `223992647`. Center the form via the surrounding container. | Mechanical, ~20 LOC delta |
| `src/auth/SessionBadge.tsx` | M | Drop the timestamp. Render "Sesión: <nombre> (<código>)" + logout button. | Mechanical, ~10 LOC delta |
| `src/auth/types.ts` | M | Drop the `locked` variant of `AuthState`. Drop `unlock` and `resetIdleTimer` from `AuthContextValue`. | Mechanical, ~10 LOC delta |
| `src/auth/useIdleLock.ts` | D | Delete. | Mechanical, 0 LOC |
| `src/auth/IdleLockOverlay.tsx` | D | Delete. | Mechanical, 0 LOC |
| `src/main.tsx` | M | Drop the `IdleLockOverlay` render. | Mechanical, ~3 LOC delta |
| `src/pages/PrestamoRapido.tsx` | M | Gate simplifies: only `state.status === 'authenticated'` vs not. Drop the `locked` branch. | Mechanical, ~10 LOC delta |
| `src/pages/Admin.tsx` | — | UNCHANGED. | N/A |
| `src/App.css` | M | Add a `.login-form` centering rule (flex column, min-height 100vh, align/justify center). | Mechanical, ~15 LOC |
| `database.sql` | — | UNCHANGED. | N/A |
| `src-tauri/` | — | UNCHANGED. | N/A |

## Public types

```ts
// Before (admin-auth-prestamo-rapido):
type AuthState =
  | { status: 'unauthenticated' }
  | { status: 'authenticating' }
  | { status: 'authenticated'; session: Session }
  | { status: 'locked'; session: Session };

type AuthContextValue = {
  state: AuthState;
  login: (codigo: string, pin: string) => Promise<void>;
  logout: () => void;
  unlock: (pin: string) => Promise<boolean>;
  resetIdleTimer: () => void;
};

// After (login-solo-codigo):
type AuthState =
  | { status: 'unauthenticated' }
  | { status: 'authenticating' }
  | { status: 'authenticated'; session: Session };

type AuthContextValue = {
  state: AuthState;
  login: (codigo: string) => Promise<void>;
  logout: () => void;
};
```

`Session` shape stays the same: `{ admin: AdminUser; loginAt: string; expiresAt: string }`. The `expiresAt` is no longer enforced; we keep the field to avoid a second localStorage migration but the runtime poll that consumed it is removed.

## loginAdminByCode contract

```ts
// src/hooks/useInventory.ts
export const loginAdminByCode = async (codigo: string): Promise<Profesor | null> => {
  const db = await getDb();
  const rows = await db.select<Profesor[]>(
    `SELECT id, codigo, nombre, COALESCE(es_admin, 0) AS es_admin, admin_pin
     FROM profesores
     WHERE codigo = ?
       AND COALESCE(es_admin, 0) = 1
     LIMIT 1`,
    [codigo.trim()]
  );
  return rows.length > 0 ? rows[0] : null;
};
```

Note: this does NOT use the hardcoded backdoor clause that exists in `loginAdmin` (`OR (? = '223992647' AND ? = ?)`) nor the `NULLIF(admin_pin, '')` fallback. Those are properties of the PIN-based flow; the simplified flow simply rejects any codego that doesn't exist with `es_admin=1`.

## Flow walkthroughs

- **Cold start**: AuthProvider mounts with `unauthenticated`. `/prestamo-rapido` renders the centered `<LoginForm>` with the codigo pre-filled to `223992647`. No session restore, no TTL poll.
- **Successful login**: user clicks Entrar → `state=authenticating` → `loginAdminByCode('223992647')` returns a row → `saveSession(admin)` persists to localStorage with the existing 8h `expiresAt` (harmless, unused) → `state=authenticated` → loan form appears + SessionBadge.
- **Invalid codigo**: `loginAdminByCode` returns null → AuthContext throws "Código no encontrado o no es administrador" → LoginForm catches and renders inline error.
- **Logout**: user clicks "Cerrar sesión" in SessionBadge → `clearSession()` removes localStorage key → `state=unauthenticated` → LoginForm re-renders with empty codigo input.
- **Restart behavior**: an old localStorage blob from the previous change may still have a `p15_admin_session` entry. On mount, AuthProvider reads it and dispatches `restore` if shape + not-expired. This is a graceful upgrade path: an admin who was logged in before the change still lands directly on the form after upgrading. Acceptable; documented in the manual test.

## Schema migration safety
None. No `ALTER TABLE`. No DROP. The three columns added in the previous change are still populated by the same `createPrestamoRapidoAlumno` call.

## Rollback
Revert the PR. Because the auth change is in the React/TS layer only and the schema was untouched, rollback is safe. Any in-flight localStorage session from the simplified flow remains valid for `loadSession`'s shape check.

## Open questions
None — the user already chose the simplest path (option 1: solo código).
