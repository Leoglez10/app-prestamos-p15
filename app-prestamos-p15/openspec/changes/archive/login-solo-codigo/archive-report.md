# Archive Report — login-solo-codigo

- **Change**: `login-solo-codigo`
- **Archived at**: 2026-07-14
- **Stack**: tauri-v2-react-19-sqlite
- **Artifact store**: openspec

## Review Gate

| Field | Value |
|-------|-------|
| Lineage ID | `review-c9a7d0e764bf3fbc` |
| Store revision | v2 |
| Terminal state | `approved` |
| Pre-commit gate | `allow` |
| Risk level | high |
| Lenses | review-risk, review-resilience, review-readability, review-reliability |

## Verify Gate

| Field | Value |
|-------|-------|
| Verdict | **PASS WITH WARNINGS** |
| Scenarios | 5 pass, 2 partial, 0 fail |
| Deviations | 3 documented (Y-001, Y-003, B-002) |

### Deviation Summary

| ID | Severity | Description |
|----|----------|-------------|
| Y-001 | WARNING | CSS duplication of `.login-form` — two rules for same selector in `App.css`. Works (last-wins), latent footgun. |
| Y-003 | SUGGESTION | Manual test Step 3 wording ("empty codigo input") does not match LoginForm pre-fill behavior (`223992647` after logout). |
| B-002 | WARNING | Vestigial dual-arg `login(codigo, pin)` / `onSubmit(codigo, pin)` signature with false "backward compat with Admin.tsx" comment. No backward-compat consumer exists. |

## Specs Synced

| Domain | Action | File |
|--------|--------|------|
| admin-auth | Updated (MODIFIED delta merged) | `openspec/specs/admin-auth/spec.md` |

Merge details: base spec's `## Requirements` and `## Scenarios` sections replaced with the delta's 7 MODIFIED requirements and 7 scenarios. `## Purpose` updated to reflect both rounds (codigo+PIN initial → codigo-only simplification). Source header updated with both change paths.

The `openspec/specs/prestamo-rapido/spec.md` from the previous change was left unchanged (no delta for that domain in this change).

## Files Moved

| Path | Destination |
|------|-------------|
| `openspec/changes/login-solo-codigo/` | `openspec/changes/archive/login-solo-codigo/` |

## Tasks State

11/11 tasks marked `[x]` — all implementation tasks complete.

| # | Task | Status |
|---|------|--------|
| 1 | Add `loginAdminByCode` in `useInventory.ts` | ✅ |
| 2 | Simplify `AuthContext.tsx` | ✅ |
| 3 | Drop PIN input in `LoginForm.tsx` | ✅ |
| 4 | Center the login layout | ✅ |
| 5 | Simplify `SessionBadge.tsx` | ✅ |
| 6 | Delete `useIdleLock.ts` and `IdleLockOverlay.tsx` | ✅ |
| 7 | Update `main.tsx` | ✅ |
| 8 | Simplify `PrestamoRapido.tsx` gate | ✅ |
| 9 | Type check + build | ✅ |
| 10 | Update manual test checklist | ✅ |
| 11 | Update follow-ups | ✅ |

## Follow-ups Persisted

6 items in `follow-ups.md` (F1–F6):

| ID | Status | Note |
|----|--------|------|
| F1 | Partially moot | PIN hashing is moot for `/prestamo-rapido` (no PIN); still pending for `/admin`. |
| F2 | Open | Kiosk `/kiosko` auth gate — out of scope. |
| F3 | Open | Remove `*-LeoLaptop.*` duplicates — out of scope. |
| F4 | Open | Shared `<Modal />` component — out of scope. |
| F5 | Open | End-of-day "cerrar turno" workflow — out of scope. |
| F6 | Open | vitest test suite — out of scope. |

## Orchestrator-Applied Restoration

`src/pages/Admin.tsx` was reverted to HEAD mid-cycle to preserve regression safety. The file is byte-identical to the previous archive and retains the full `loginAdmin(codigo, pin)` flow with `window.sessionStorage`. This change does NOT affect `/admin` auth — confirmed by static verification (`git diff --stat HEAD -- src/pages/Admin.tsx` = empty, grep for `AuthContext`/`useAuth` = zero matches in Admin.tsx).

## Archive Verification

- [x] Main specs updated correctly (`openspec/specs/admin-auth/spec.md`)
- [x] Change folder moved to archive (`openspec/changes/archive/login-solo-codigo/`)
- [x] Archive contains all artifacts: proposal.md, specs/, design.md, tasks.md, follow-ups.md, manual-test-checklist.md, verify-report.md
- [x] Archived `tasks.md` has no unchecked implementation tasks (11/11 `[x]`)
- [x] Active changes directory no longer has `login-solo-codigo`
- [x] `.metadata.json` status updated to `archived`

## Observations

1. The verify report identified 5 unnamed warnings from the 4R bounded review that could not be reproduced because the 4R transcript was not attached. The 3 identifiable warnings (Y-001, Y-003, B-002) are all non-blocking.
2. F6 (vitest) remains the main gap for automated runtime verification. All 7 spec scenarios were verified by static source inspection + SQL binding analysis + build/type-check only.
3. The manual-test-checklist (7 steps) covers the runtime evidence path and remains to be executed by a human.
4. No schema changes were made — `database.sql` was not touched. The three accountability columns from the previous change continue to be populated.
