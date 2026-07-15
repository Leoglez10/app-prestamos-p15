// Public types for the admin auth and Préstamo Rápido accountability feature.
// Reused by AuthContext, loginStorage, useInventory and the page components.

export type AdminUser = {
  id: number;
  codigo: string;
  nombre: string;
  // esAdmin is inferred from successful login (only admins can authenticate), kept optional for compatibility.
  esAdmin?: boolean;
};

export type Session = {
  admin: AdminUser;
  // ISO-8601 strings; loginAt + 8h = expiresAt.
  loginAt: string;
  expiresAt: string;
};

export type AuthState =
  | { status: "unauthenticated" }
  | { status: "authenticating" }
  | { status: "authenticated"; session: Session };

export type AuthContextValue = {
  state: AuthState;
  // Dual-arg signature kept for backward compatibility with Admin.tsx, which
  // still uses codigo+PIN. The simplified /prestamo-rapido flow passes only
  // `codigo` (and an empty pin); the new auth path ignores any supplied pin.
  login: (codigo: string, pin: string) => Promise<void>;
  logout: () => void;
};

// Data-layer types for prestamos_rapidos_alumnos rows (consumed by useInventory and pages).
export type PrestamoRapidoAlumnoInput = {
  nombre_alumno: string;
  codigo_alumno: string;
  nombre_equipo: string;
  observaciones?: string;
};

export type PrestamoRapidoAlumnoCreate = PrestamoRapidoAlumnoInput & {
  admin: AdminUser;
};

export type PrestamoRapidoAlumnoRow = PrestamoRapidoAlumnoInput & {
  id: number;
  id_admin: number | null;
  autorizante_codigo: string | null;
  autorizante_nombre: string | null;
  persona_prestamo: string | null;
  fecha_salida: string;
  fecha_retorno: string | null;
  estado: string;
  observaciones: string | null;
};
