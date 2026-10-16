// Global authentication context. Owns the AuthState machine and persists the
// session to localStorage. The simplified /prestamo-rapido flow is a two-state
// machine: unauthenticated <-> authenticated. No idle lock, no TTL poll.

import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  type ReactNode,
} from "react";
import type { AdminUser, AuthContextValue, AuthState, Session } from "./types";
import { clearSession, loadSession, saveSession } from "./loginStorage";
import { loginAdminByCode, verifyAdminStoredSession } from "../hooks/useInventory";

type Action =
  | { type: "restore"; session: Session }
  | { type: "authenticate"; session: Session }
  | { type: "logout" };

const initialState: AuthState = { status: "unauthenticated" };

function authReducer(state: AuthState, action: Action): AuthState {
  switch (action.type) {
    case "restore":
    case "authenticate":
      return { status: "authenticated", session: action.session };
    case "logout":
      return { status: "unauthenticated" };
    default:
      return state;
  }
}

function toAdminUser(row: { id: number; codigo: string; nombre: string; es_admin: number | string }): AdminUser {
  return {
    id: row.id,
    codigo: row.codigo,
    nombre: row.nombre,
    esAdmin: Number(row.es_admin) === 1,
  };
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Restore session on mount. The stored blob is re-validated against the DB
  // (defense-in-depth) so a hand-crafted localStorage entry cannot grant access.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const session = loadSession();
      if (!session) return;
      const stillValid = await verifyAdminStoredSession(session.admin.id, session.admin.codigo);
      if (cancelled) return;
      if (stillValid) {
        dispatch({ type: "restore", session });
      } else {
        clearSession();
        dispatch({ type: "logout" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Dual-arg signature kept for backward compatibility with the /admin route
  // (which still uses codigo+PIN). The simplified /prestamo-rapido flow
  // passes only `codigo`; the new auth path ignores any supplied pin and
  // looks up the admin by code only.
  const login = async (codigo: string, _pin: string): Promise<void> => {
    const adminRow = await loginAdminByCode(codigo);
    if (!adminRow) {
      throw new Error("Código no encontrado o no es administrador");
    }
    const admin = toAdminUser(adminRow);
    const session = saveSession(admin);
    dispatch({ type: "authenticate", session });
  };

  const logout = (): void => {
    clearSession();
    dispatch({ type: "logout" });
  };

  const value: AuthContextValue = {
    state,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used within an <AuthProvider>");
  }
  return value;
}
