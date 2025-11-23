# 🏛️ Architecture Tests - Quick Reference

## ✅ Status: INTEGRATED IN CI/CD

Your hexagonal architecture is now **automatically enforced** in every PR!

---

## 🚀 Quick Commands

```bash
# Check architecture locally (BEFORE pushing)
cd backend && npm run test:arch

# Run all checks (recommended before PR)
npm run lint:check && npm run test:arch && npm run test:unit && npm run build

# Test specific module
npm run test:arch -- --testNamePattern="users"
```

---

## 📊 What Gets Tested (30 Tests)

| Category | Tests | What It Checks |
|----------|-------|----------------|
| 📦 Module Isolation | 2 | Hexagonal structure exists, no cross-module imports |
| 🎯 Domain Purity | 4 | No framework dependencies, pure TypeScript |
| ⚙️ Application Layer | 4 | Uses Ports (interfaces), no direct infrastructure |
| 🔌 Infrastructure | 4 | Repositories implement Ports, controllers have decorators |
| 🗄️ Database Isolation | 2 | Schema per module, no cross-schema FK |
| 📢 Event-Driven | 2 | Events extend base, no direct calls |
| 📝 Naming Conventions | 2 | File and class naming patterns |
| ✅ Code Quality | 3 | No console.log, proper exceptions, DTO validation |
| 🧪 Test Structure | 2 | Unit tests exist, domain tests pure |
| 📋 Documentation | 2 | Swagger tags, API operations |

---

## 🎯 CI/CD Flow

```
Pull Request Created
  ↓
Job 1: Lint ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 30s
  ↓
Job 2: Architecture Tests ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 10s ← BLOCKS IF FAIL
  ↓
Job 3: Unit Tests ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 60s
Job 4: Integration Tests ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 90s
  ↓
Job 5: E2E Tests ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 120s
Job 6: Build ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 45s
Job 7: Docker Build ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 180s
Job 8: Security ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 30s
  ↓
Job 9: Quality Gate ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 5s
  ↓
✅ Ready to Merge
```

**If architecture fails:** Pipeline stops at Job 2 (~40s), saves 6+ minutes!

---

## ❌ Common Violations & Fixes

### 1. Domain Imports Framework

```typescript
// ❌ BAD
import { Injectable } from '@nestjs/common';

// ✅ GOOD - Domain is pure TypeScript
export class User {
  constructor(public readonly id: string) {}
}
```

### 2. Cross-Module Import

```typescript
// ❌ BAD
import { EventService } from '../../events/application/event.service';

// ✅ GOOD - Use events
this.eventBus.publish(new TicketGeneratedEvent(ticketId));
```

### 3. Repository Missing Port

```typescript
// ❌ BAD
export class UserRepository { ... }

// ✅ GOOD
export class UserRepository implements UserRepositoryPort { ... }
```

### 4. Application Imports TypeORM

```typescript
// ❌ BAD - Application layer
import { Repository } from 'typeorm';

// ✅ GOOD - Application layer
import { UserRepositoryPort } from './ports/user-repository.port';
```

---

## 📚 Full Documentation

- **How to Fix Violations:** `backend/test/architecture/README.md`
- **CI/CD Integration:** `docs/05-git-workflow/03-architecture-tests-in-cicd.md`
- **Verification Report:** `ARCHITECTURE-TESTS-VERIFICATION.md`
- **Architecture Principles:** `docs/03-architecture/01-principes-hexagonaux.md`
- **Fitness Functions:** `docs/03-architecture/05-fitness-functions.md`

---

## 🎯 Developer Workflow

```bash
# 1. Create branch
git checkout -b feature/my-feature

# 2. Code your feature (follow hexagonal architecture)

# 3. Test LOCALLY before pushing
npm run lint:check      # ← Fast
npm run test:arch       # ← 5 seconds - CRITICAL!
npm run test:unit       # ← Your unit tests
npm run build           # ← TypeScript check

# 4. Commit & push
git add .
git commit -m "feat: my feature"
git push

# 5. Create PR → CI runs automatically → Reviews violations

# 6. If architecture fails:
#    - Check CI logs for specific violation
#    - Read backend/test/architecture/README.md for fix
#    - Fix locally
#    - Push again → CI re-runs
```

---

## ✅ Benefits

| Benefit | Impact |
|---------|--------|
| **Fail Fast** | Violations caught in ~40s instead of code review |
| **Consistent Architecture** | 100% of code follows hexagonal principles |
| **Self-Documenting** | Tests describe architecture rules |
| **Saves Time** | No manual architecture reviews needed |
| **Prevents Tech Debt** | Architecture violations impossible to merge |
| **Developer Confidence** | Clear feedback on what to fix |

---

## 🎓 Learning Resources

**New to Hexagonal Architecture?**
1. Read: `docs/03-architecture/01-principes-hexagonaux.md`
2. Study: `backend/src/shared/domain/` (base classes)
3. Check: `backend/test/architecture/architecture.spec.ts` (30 examples)
4. Practice: Create Users module following structure

**When a Test Fails:**
1. Read CI error message (shows exact violation)
2. Check `backend/test/architecture/README.md` (has fix examples)
3. Fix the code
4. Run `npm run test:arch` locally to verify
5. Push again

---

## 🚀 Next Steps

### For Testing (First PR):
```bash
git checkout -b test/verify-architecture-ci
echo "Testing CI pipeline" >> README.md
git add README.md
git commit -m "test: verify architecture tests in CI"
git push origin test/verify-architecture-ci
# Create PR → Watch CI run → Verify Job 2 executes
```

### For Development (First Module):
```bash
git checkout -b feature/users-module

# Create module structure
mkdir -p backend/src/modules/users/{domain,application,infrastructure}

# Follow hexagonal architecture (see docs)
# Run tests: npm run test:arch
# Push → CI validates
```

---

## 📞 Help

**Architecture test failing?**
→ `backend/test/architecture/README.md`

**CI pipeline failing?**
→ `docs/05-git-workflow/03-architecture-tests-in-cicd.md`

**Hexagonal architecture questions?**
→ `docs/03-architecture/01-principes-hexagonaux.md`

**Full verification details?**
→ `ARCHITECTURE-TESTS-VERIFICATION.md`

---

**Status:** ✅ Ready to enforce architecture in every PR!  
**Last Updated:** 23 November 2025  
**Pipeline:** `.github/workflows/ci.yml` (Job 2)
