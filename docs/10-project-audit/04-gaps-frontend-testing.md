# Gap Analysis 04 — Frontend State & Test Health

**Domain:** `frontend/`, backend test corpus and coverage enforcement.
**Method:** every frontend file read (there are eight); the four claims that touch earlier deliverables re-verified. `Verified` = read in code. `Inferred` = deduced.
**Date:** 2026-09-15 · **Branch:** `64-frontend-design-deliverables` after merging `develop` (`21eb15d`).

---

## Summary

1. **The frontend is a scaffold**: 8 source files, 302 lines, one route (`/`) out of the 33 specified, zero of the 88 Phase-7 design tokens, none of the specified `features/`, `lib/query`, `lib/auth`, `stores/` folders. Eight of fourteen runtime dependencies are unused.
2. **Its only real code is wrong in two ways the specification already documents**: the API client hard-redirects on any `401` with no refresh, and its base URL omits the `/api` prefix — so every request would `404` against the real backend. Both compose files repeat the missing prefix.
3. **Frontend tests are placeholders** (three arithmetic assertions; two Playwright smoke checks) — green, and meaningless.
4. **Backend coverage is claimed (">80 %") in four documents and measured nowhere**: no `coverageThreshold`, no `--coverage` on the unit script, a CI quality gate made of `echo` lines. The corpus itself is large — 227 test files, roughly 2,975 `it()` blocks — it is the *enforcement* that is missing.
5. The stack versions match the specification exactly (Next 16.0.4, React 19.2, Tailwind 4, Zod 4, TanStack 5, zustand 5, Vitest 4, Playwright 1.56) and the build config (`standalone`, image patterns) is correct. The foundation is sound; there is simply nothing on it yet.

---

## Findings

| # | Finding | Severity | Status | Evidence | Recommendation |
|---|---|---|---|---|---|
| F-01 | **`apiClient` clears the token and hard-redirects to `/auth/login` on any `401`** — no refresh, no single-flight, no `?next=`. `/auth/login` is not in the route tree (`/login` is). A token expiring mid-checkout destroys the order context | 🟠 High | Verified | `frontend/src/lib/api/client.ts:29-34`; spec at `docs/08-frontend/11-frontend-architecture.md` §2.2 | Replace with the specified refresh-and-replay interceptor |
| F-02 | **Base URL lacks `/api`** in the client default, `.env.example` and both compose files; the backend's global prefix is `api` → every request `404`s | 🟠 High | Verified | `client.ts:4`; `frontend/.env.example:2`; `docker-compose.dev.yml:126`; `docker-compose.prod.yml:50`; `backend/src/main.ts:14-17` | Default to `…/api`; fix both compose files; see [03 I-08](03-gaps-infrastructure-cicd.md) for the CD build-arg |
| F-03 | **No design-system token has landed.** `globals.css` is still the Next starter (`--background`, `--foreground`, `--font-geist-*`); `layout.tsx` loads Inter only | 🟡 Medium | Verified | `globals.css:1-26` (0 matches for `color-cobalt`, `color-canvas`, `font-display`); spec `08-design-system.md` §1 | Paste the Phase 7 `@theme` block; swap the font loader per [08 §3.2](08-global-design-direction.md#32-loading-budget) |
| F-04 | **`formatCurrency` uses 2 decimals**; TND has 3 (millimes), and the specified rule is "millimes only when non-zero" | 🟡 Medium | Verified | `frontend/src/lib/utils.ts:14-20`; spec `07-component-inventory.md` §3.1 | Replace with the specified `lib/format/money.ts` (`Intl`, minor-unit-aware) |
| F-05 | **`.env.example` still lists `NEXT_PUBLIC_CLICTOPAY_PUBLIC_KEY`** — a provider the platform does not use; devtools are gated on `APP_ENV` rather than the documented `NEXT_PUBLIC_ENABLE_DEVTOOLS` | 🟢 Low | Verified | `frontend/.env.example:23`; `providers.tsx:23` | Remove; wire the flag |
| F-06 | **Unused dependencies**: zustand, zod, react-hook-form, `@hookform/resolvers`, Headless UI, Heroicons, date-fns; `tailwind-merge` used only by `cn()` | 🟢 Low | Verified | `package.json:19-34` vs import grep | Expected for a scaffold — record it so nobody reads "installed" as "used" |
| F-07 | **Frontend tests are placeholders**: three arithmetic assertions and two Playwright smoke checks; `vitest run` → 1 file, 3 passed | 🟡 Medium | Verified | `src/test/example.test.ts:1-26`; `e2e/example.spec.ts:1-27` | Real coverage arrives with Phase 11 §8 (mandatory failure-path E2E) |
| F-08 | **Backend coverage is asserted but never collected or enforced.** `test:unit` = `jest --passWithNoTests` with no `--coverage`; no `coverageThreshold`; CI uploads an `lcov.info` that never exists; the "Quality Gates" job is five `echo` lines | 🟠 High | Verified | `backend/package.json` jest block; `ci.yml:116-121,183-188,373-378`; claims in `README.md:468,543`, `AGENTS.md:412`, `PROJECT_STATUS.md:678` | `--coverage` + `coverageThreshold`; make the gate real; stop stating a number nobody measures |
| F-09 | **Unit runner also executes DB-backed integration specs**: default `testRegex .*\.spec\.ts$` with `rootDir .` matches `test/integration/*.integration.spec.ts` | 🟡 Medium | Inferred | `backend/package.json` jest block; `test/integration/*` filenames | Scope the unit regex to `test/unit` and `src` |
| F-10 | **Two JWT config paths.** `JWT_ACCESS_EXPIRATION` (15m) / `JWT_REFRESH_EXPIRATION` (7d) are Joi-validated and fed to `JwtModule`, but tokens are signed with `JWT_EXPIRES_IN` (7d) / `JWT_REFRESH_EXPIRES_IN` (30d) via an explicit `expiresIn` override. The validated variables are dead | 🟡 Medium | Verified | `app.module.ts:63-64`; `config/jwt.config.ts:5-6`; `users.module.ts:124`; `jwt.service.ts:74-75,92-93` | Delete the dead pair; one name, one lifetime (also [01 S-11](01-gaps-security-auth.md)) |
| F-11 | `TransformInterceptor` (`{ success, data, timestamp }`) exists but is never registered — only Logging and Timeout are global. Any doc mentioning a success envelope is describing dead code | 🟢 Low | Verified | `transform.interceptor.ts:10-14`; `app.module.ts:111-116`; no other import | Delete it, or register it and update the contract |
| F-12 | No frontend `.prettierrc`, so the `AGENTS.md` rule "no semicolons (frontend)" is unenforced and three of four files violate it; the naming rule `api-client.ts` contradicts the specified `lib/api/client.ts` | 🟢 Low | Verified | `AGENTS.md:145,195`; semicolon counts `client.ts` 10, `utils.ts` 8, `layout.tsx` 8, `providers.tsx` 0 | Add the prettier config; align `AGENTS.md` with Phase 11 |
| F-13 | No `CLAUDE.md`; only `AGENTS.md`, which Claude Code does not read automatically | 🟢 Low | Verified | `find . -name CLAUDE.md` → empty | Add a one-line `CLAUDE.md` that includes `@AGENTS.md` |

---

## Backend test corpus (for the record)

| Bucket | Files | Note |
|---|---|---|
| Unit specs | 207 | users 46 · events 47 · tickets 20 · payments 28 · notifications 20 · analytics 17 · shared 29 |
| Integration | 5 | none touches a payments repository through a real DataSource ([03 I-04](03-gaps-infrastructure-cicd.md)) |
| E2E | 13 | real Postgres/Redis in CI |
| Architecture fitness | 1 file, 34 assertions | docs say "30" in one place and "34" in another |
| **Total** | **227 files · ~2,975 `it()`** | static count; `jest --listTests` could not run (no `node_modules`, root-owned npx cache) |

---

## What is solid

- **Every stack version matches the specification** — the deliverables were written against the real `package.json`.
- **Build configuration is right**: `output: 'standalone'` matches the Dockerfile; `images.remotePatterns` covers the backend's S3 URL shape for `eu-west-1`.
- **Test tooling is real** even though the tests are not: `vitest.config.ts` excludes `e2e/`; Playwright reuses the dev server; CI runs frontend `test:unit` with coverage.
- **The backend test corpus is large and organised by module**; the gap is enforcement and one missing class of integration test, not volume.
- **The 08-frontend deliverables' contract corrections all still hold** (`/api` prefix, flat pagination, envelope shape, 400/403 codes, 7d/30d JWT, `/config/public`, check-in-staff); only line numbers and two statements have aged — corrected in this pass ([07](07-gaps-documentation.md)).

---

## Fix order

1. **F-01 · F-02** — the day the first real screen is built, both would make it fail against the real API. Fix with the first PR.
2. **F-08** — decide whether coverage is a gate or not; stop publishing a number that is not measured.
3. **F-03 · F-04** — the first two files the frontend build should create, straight from the deliverables.
4. Everything else as the frontend takes shape.

---

**Prev:** [03 — Infrastructure & CI/CD](03-gaps-infrastructure-cicd.md) · **Next:** [05 — Global readiness](05-gaps-global-readiness.md) · **Index:** [README](README.md)
