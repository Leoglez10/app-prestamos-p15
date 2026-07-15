# Tasks: login-solo-codigo

## 1. [x] Add `loginAdminByCode` in `useInventory.ts`
- **Files**: `src/hooks/useInventory.ts`
- **Type**: mechanical
- **Acceptance**:
  - New exported function `loginAdminByCode(codigo: string): Promise<Profesor | null>`.
  - Returns the matching admin row if `codigo` exists and `COALESCE(es_admin, 0) = 1`.
  - Does NOT include the backdoor clause from `loginAdmin` nor the `NULLIF(admin_pin, '')` fallback.
  - Existing `loginAdmin(codigo, pin)` is UNCHANGED.
- **Estimate**: S, ~15 LOC

## 2. [x] Simplify `AuthContext.tsx`
- **Files**: `src/auth/AuthContext.tsx`
- **Type**: analysis
- **Acceptance**:
  - `AuthState` drops the `locked` variant.
  - `login(codigo: string)` replaces `login(codigo, pin)`. Internally calls `loginAdminByCode`.
  - `unlock` and `resetIdleTimer` are removed from the public context value.
  - `useIdleLock` import and wiring are removed.
  - The 60s `setInterval` for TTL is removed.
  - `verifyAdminStoredSession` is kept on restore (defense-in-depth, still cheap).
  - Mount-restore: if a valid localStorage blob exists, dispatch `restore` and skip the login.
- **Estimate**: M, ~40 LOC delta (net negative)

## 3. [x] Drop PIN input in `LoginForm.tsx`
- **Files**: `src/auth/LoginForm.tsx`
- **Type**: mechanical
- **Acceptance**:
  - Only the `codigo` input remains.
  - PIN input is removed (no `type="password"`, no `useState` for it).
  - Codigo input is pre-filled with `223992647` (the default admin code).
  - `onSubmit(codigo: string)` replaces the dual-arg signature.
  - The form layout uses the new `.login-form` centering class.
- **Estimate**: S, ~20 LOC delta

## 4. [x] Center the login layout
- **Files**: `src/auth/LoginForm.tsx`, `src/App.css`
- **Type**: mechanical
- **Acceptance**:
  - `App.css` adds a `.login-form` rule: flex column, `min-height: 100vh`, `align-items: center`, `justify-content: center`, `gap: 0.75rem`, `padding: 2rem`.
  - On a 1280x840 viewport the form is visually centered.
  - On resize between 1024x680 and 1280x840, no drift.
- **Estimate**: S, ~15 LOC

## 5. [x] Simplify `SessionBadge.tsx`
- **Files**: `src/auth/SessionBadge.tsx`
- **Type**: mechanical
- **Acceptance**:
  - Renders "Sesión: <nombre> (<código>)" + a "Cerrar sesión" button.
  - No login timestamp.
- **Estimate**: S, ~10 LOC delta

## 6. [x] Delete `useIdleLock.ts` and `IdleLockOverlay.tsx`
- **Files**: `src/auth/useIdleLock.ts`, `src/auth/IdleLockOverlay.tsx`
- **Type**: mechanical
- **Acceptance**:
  - Both files deleted from disk.
  - No other source file imports either of them after this task.
- **Estimate**: S, 0 LOC net

## 7. [x] Update `main.tsx`
- **Files**: `src/main.tsx`
- **Type**: mechanical
- **Acceptance**:
  - The `IdleLockOverlay` render is removed from inside the provider.
  - The `useIdleLock` and `IdleLockOverlay` imports are removed.
- **Estimate**: S, ~3 LOC delta

## 8. [x] Simplify `PrestamoRapido.tsx` gate
- **Files**: `src/pages/PrestamoRapido.tsx`
- **Type**: mechanical
- **Acceptance**:
  - The gate is `if (state.status !== "authenticated")` → render `<LoginForm />`.
  - No `locked` branch.
  - Submit still reads `state.session.admin` and passes it to `createPrestamoRapidoAlumno`.
  - History list still shows "Autorizado por: <autorizante_nombre || persona_prestamo || '—'>".
- **Estimate**: S, ~10 LOC delta

## 9. [x] Type check + build
- **Type**: mechanical
- **Acceptance**:
  - `cd <repo> && npx tsc --noEmit` exits 0.
  - `cd <repo> && npm run build` succeeds.
  - `git status --short` shows only the expected modifications + deletions.
- **Estimate**: S, 0 LOC

## 10. [x] Update manual test checklist
- **Files**: `openspec/changes/login-solo-codigo/manual-test-checklist.md`
- **Type**: mechanical
- **Acceptance**:
  - 6 new steps covering: login with valid code, invalid code, logout, centered layout, /admin unchanged, accountability chain preserved.
  - Each step marked `[ ]` for the human to run.
- **Estimate**: S, ~30 LOC

## 11. [x] Update follow-ups
- **Files**: `openspec/changes/login-solo-codigo/follow-ups.md`
- **Type**: mechanical
- **Acceptance**:
  - Confirm F1 (PIN hashing) is moot for the simplified flow on /prestamo-rapido and still pending for /admin.
  - F2-F6 unchanged.
- **Estimate**: S, ~10 LOC

## Definition of Done
- 0 TypeScript errors
- `npm run build` succeeds
- `src/auth/useIdleLock.ts` and `src/auth/IdleLockOverlay.tsx` are deleted
- No source file imports either of them
- `Admin.tsx` is byte-identical to the previous archive (regression safety)
- The login form is visually centered on a 1280x840 window
- All 6 manual test steps are documented
- `openspec/changes/login-solo-codigo/tasks.md` shows all 11 tasks marked `[x]`
- `openspec/changes/login-solo-codigo/.metadata.json` shows `status: applied`
- Total changed lines ≤ 200 (well under 800 budget)

## Risk callouts for the apply phase
- Do NOT touch `Admin.tsx`. The previous gate stays in place.
- Do NOT touch `src-tauri/`. No Rust changes needed.
- Do NOT touch `database.sql`. No schema change.
- Do NOT touch `*-LeoLaptop.*` files.
- The 600+ lines of inline `<style>` in `PrestamoRapido.tsx` should NOT be refactored.
- The pre-fill of `223992647` is a UX convenience for the personal-kiosk use case; it is NOT a security claim.
