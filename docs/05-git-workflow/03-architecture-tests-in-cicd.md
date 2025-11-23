# 🏛️ Architecture Tests in CI/CD

**Updated:** 23 November 2025  
**Status:** ✅ Integrated

---

## 🎯 CI/CD Pipeline Flow

The architecture tests are now integrated as **Job 2** in the CI pipeline, running right after linting and before all other tests:

```
┌─────────────────────────────────────────────────────────────┐
│                     CI PIPELINE FLOW                         │
└─────────────────────────────────────────────────────────────┘

Job 1: 📝 Lint & Format
  ├── ESLint (backend + frontend)
  ├── Prettier check
  └── TypeScript type check
  
    ↓ (if success)

Job 2: 🏛️ Architecture Tests ← NEW!
  └── Backend only
      └── npm run test:arch (30 tests)
      
    ↓ (if success)

Job 3: 🧪 Unit Tests
  ├── Backend unit tests + coverage
  └── Frontend unit tests + coverage
  
Job 4: 🔗 Integration Tests
  ├── PostgreSQL + Redis services
  ├── Database migrations
  └── Backend integration tests + coverage
  
    ↓ (parallel with Jobs 3-4)

Job 6: 🏗️ Build
  ├── Backend build
  └── Frontend build
  
Job 8: 🔒 Security Scan
  ├── npm audit
  └── Snyk scan
  
    ↓ (wait for all above)

Job 5: 🎭 E2E Tests
  ├── Docker Compose services
  ├── Playwright tests
  └── Artifacts upload
  
Job 7: 🐳 Docker Build
  ├── Backend image
  └── Frontend image
  
    ↓ (wait for all)

Job 9: ✅ Quality Gates
  └── Final verification
  
Job 10: ✅ CI Success
  └── Pipeline completed!
```

---

## 🏛️ Architecture Tests Details

### What It Tests (30 automated tests)

```yaml
1. 📦 Isolation des Modules (2 tests)
   - Hexagonal structure exists
   - No cross-module imports

2. 🎯 Domain Layer Purity (4 tests)
   - No framework dependencies
   - Entities in correct location
   - Value Objects in correct location
   - Events in correct location

3. ⚙️ Application Layer (4 tests)
   - No TypeORM/Express/AWS SDK
   - Commands structure
   - Queries structure
   - Ports are interfaces

4. 🔌 Infrastructure Layer (4 tests)
   - Repositories implement Ports
   - Controllers have decorators
   - Adapters in correct location
   - Module configuration

5. 🗄️ Database Isolation (2 tests)
   - Schema per module
   - No cross-schema FK

6. 📢 Event-Driven (2 tests)
   - Events extend base class
   - No direct module calls

7. 📝 Naming Conventions (2 tests)
   - File naming patterns
   - Class naming patterns

8. ✅ Code Quality (3 tests)
   - No console.log
   - Exceptions placement
   - DTO validation

9. 🧪 Test Structure (2 tests)
   - Unit tests exist
   - Domain tests are pure

10. 📋 Documentation (2 tests)
    - Swagger tags
    - API operations
```

### When It Runs

**Trigger:**
- Every pull request to `develop` or `main`
- Every push to `feature/*` or `bugfix/*` branches

**Execution Time:** ~5-10 seconds (very fast!)

**Position in Pipeline:** Job 2 (right after linting)

**Blocks Merge:** ✅ Yes - PR cannot be merged if architecture tests fail

---

## 📊 Example CI Run

### ✅ Success Scenario

```bash
🏛️ Architecture Tests
  📥 Checkout code ✅
  🟢 Setup Node.js ✅
  📦 Install dependencies ✅ (cached)
  🏛️ Run architecture fitness functions ✅
  
  PASS test/architecture/architecture.spec.ts
    🏛️ Architecture Hexagonale - Fitness Functions
      📦 1. Isolation des Modules
        ✓ Chaque module doit avoir sa structure hexagonale (12ms)
        ✓ Les modules ne doivent pas importer d'autres modules (15ms)
      🎯 2. Domain Layer - Pureté
        ✓ Domain ne doit avoir AUCUNE dépendance externe (8ms)
        ✓ Entités Domain doivent être dans domain/entities/ (3ms)
        ... (26 more tests)
      
  Test Suites: 1 passed, 1 total
  Tests:       30 passed, 30 total
  Time:        2.134s
  
  ✅ Job completed in 45s
```

### ❌ Failure Scenario

```bash
🏛️ Architecture Tests
  📥 Checkout code ✅
  🟢 Setup Node.js ✅
  📦 Install dependencies ✅
  🏛️ Run architecture fitness functions ❌
  
  FAIL test/architecture/architecture.spec.ts
    🏛️ Architecture Hexagonale - Fitness Functions
      🎯 2. Domain Layer - Pureté
        ✕ Domain ne doit avoir AUCUNE dépendance externe (18ms)
        
  ● Domain Layer - Pureté › Domain ne doit avoir AUCUNE dépendance externe
  
    ❌ Domain file src/modules/events/domain/entities/event.entity.ts 
       imports forbidden dependency: typeorm
       → Domain must be PURE TypeScript (no @nestjs, typeorm, express, etc)
  
  Test Suites: 1 failed, 1 total
  Tests:       1 failed, 29 passed, 30 total
  
  📊 Report architecture violations
  ❌ Architecture tests failed!
  Review the logs above to see which hexagonal architecture rules were violated.
  Refer to backend/test/architecture/README.md for guidance.
  
  ❌ Job failed
  
  🚫 Pipeline stopped - fix architecture violations before merge
```

---

## 🔧 How It Works

### 1. Job Definition

```yaml
test-architecture:
  name: 🏛️ Architecture Tests
  runs-on: ubuntu-latest
  needs: lint  # Runs after linting passes
  
  steps:
    - name: 📥 Checkout code
      uses: actions/checkout@v4

    - name: 🟢 Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20.x'
        cache: 'npm'
        cache-dependency-path: backend/package-lock.json

    - name: 📦 Install dependencies
      working-directory: ./backend
      run: npm ci

    - name: 🏛️ Run architecture fitness functions
      working-directory: ./backend
      run: npm run test:arch  # Runs: jest --config ./test/jest-architecture.json

    - name: 📊 Report architecture violations
      if: failure()
      run: |
        echo "❌ Architecture tests failed!"
        echo "Refer to backend/test/architecture/README.md for guidance."
```

### 2. Dependencies Graph

```
lint ─┐
      ├─→ test-architecture ─┬─→ test-unit ────┬─→ test-e2e ─┬
      ├─→ build ─────────────┤                  │             │
      └─→ security ───────────┤                  │             ├─→ quality-gate ─→ ci-success
                              └─→ test-integration ┘           │
                                                                │
                                  docker-build ←────────────────┘
```

**Key Points:**
- Architecture tests block unit tests, integration tests, and builds
- If architecture fails, the entire pipeline stops early
- Saves CI minutes by failing fast
- Forces developers to fix architecture violations immediately

---

## ✅ Benefits

### 1. Early Detection
```
Before: Architecture violation → Unit tests pass → Integration tests pass → 
        Code review → Deployed to staging → Bug discovered → Refactor nightmare

After:  Architecture violation → Architecture test fails → PR blocked → 
        Fix before review → Clean architecture maintained
```

### 2. Fast Feedback
- **Run time:** ~5-10 seconds
- **Position:** Job 2 (early in pipeline)
- **Result:** Developers know immediately if architecture is violated

### 3. Automated Enforcement
- No manual code review needed for architecture
- Rules are clear and executable
- Consistent enforcement across all PRs

### 4. Documentation as Code
- Architecture rules are codified
- Always up-to-date
- Self-documenting

---

## 🎯 Local Testing

Before pushing to GitHub, run locally:

```bash
cd backend

# Run architecture tests
npm run test:arch

# If failures, see detailed output
npm run test:arch -- --verbose

# Fix violations, then verify
npm run test:arch

# Once passing, commit and push
git add .
git commit -m "feat: implement users module"
git push
```

---

## 📋 Checklist Before Pushing

```yaml
✅ Local Verification:
  - [ ] npm run lint:check (backend)
  - [ ] npm run test:arch (backend) ← IMPORTANT!
  - [ ] npm run test (backend unit tests)
  - [ ] npm run build (backend)

✅ CI Will Check:
  - [ ] Linting (Job 1)
  - [ ] Architecture (Job 2) ← Will block if fails!
  - [ ] Unit tests (Job 3)
  - [ ] Integration tests (Job 4)
  - [ ] E2E tests (Job 5)
  - [ ] Build (Job 6)
  - [ ] Docker build (Job 7)
  - [ ] Security scan (Job 8)
  - [ ] Quality gates (Job 9)
```

---

## 🚨 Common Failures & Fixes

### Failure: "Domain imports @nestjs"

**Error:**
```
❌ Domain file src/modules/events/domain/entities/event.entity.ts 
   imports forbidden dependency: @nestjs/common
```

**Fix:**
```typescript
// ❌ Bad - Domain importing framework
import { Injectable } from '@nestjs/common';

@Injectable()
export class Event { ... }

// ✅ Good - Pure TypeScript
export class Event {
  constructor(
    public readonly id: string,
    public name: string,
  ) {}
}
```

### Failure: "Module imports another module"

**Error:**
```
❌ src/modules/tickets/application/handlers/generate.handler.ts
   imports cross-module: modules/events
```

**Fix:**
```typescript
// ❌ Bad - Direct import
import { EventService } from '../../../events/application/event.service';

// ✅ Good - Use events
this.eventBus.publish(new PaymentCompletedEvent(orderId));
```

### Failure: "Repository doesn't implement Port"

**Error:**
```
❌ Repository src/modules/events/infrastructure/repositories/event.repository.ts
   should implement a Port interface
```

**Fix:**
```typescript
// ❌ Bad - No interface
@Injectable()
export class EventRepository {
  async save(event: Event): Promise<Event> { ... }
}

// ✅ Good - Implements Port
@Injectable()
export class EventRepository implements EventRepositoryPort {
  async save(event: Event): Promise<Event> { ... }
}
```

---

## 📚 Resources

- **Architecture Tests Code:** `backend/test/architecture/architecture.spec.ts`
- **Test Guide:** `backend/test/architecture/README.md`
- **Architecture Docs:** `docs/03-architecture/01-principes-hexagonaux.md`
- **Fitness Functions:** `docs/03-architecture/05-fitness-functions.md`
- **CI Configuration:** `.github/workflows/ci.yml`

---

## ✅ Summary

**Status:** ✅ Architecture tests fully integrated in CI/CD

**Position:** Job 2 (after linting, before all other tests)

**Impact:** 
- Enforces hexagonal architecture automatically
- Blocks PRs with architecture violations
- Fast feedback (~5-10 seconds)
- Saves time by failing early

**Next:** Start coding modules - architecture tests will protect you! 🚀

---

**Updated:** 23 November 2025  
**Pipeline:** `.github/workflows/ci.yml`  
**Tests:** `backend/test/architecture/architecture.spec.ts`
