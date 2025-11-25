# 🎯 Copilot Agents Quick Reference Card

## 🤖 Three Specialized Agents

```
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND AGENT                             │
│  NestJS + Hexagonal Architecture Expert                     │
├─────────────────────────────────────────────────────────────┤
│ Expertise:                                                   │
│  ✅ Hexagonal Architecture (Ports & Adapters)               │
│  ✅ Domain-Driven Design (DDD)                              │
│  ✅ CQRS Pattern (Commands/Queries)                         │
│  ✅ Event-Driven Architecture                               │
│  ✅ TypeORM + PostgreSQL                                    │
│  ✅ Architecture Fitness Functions                          │
│  ✅ Jest Testing (Unit/Integration/E2E)                     │
│                                                              │
│ Use for:                                                     │
│  → Creating new modules                                     │
│  → Domain entities & value objects                          │
│  → CQRS handlers                                            │
│  → Repository implementations                               │
│  → Architecture compliance checks                           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   FRONTEND AGENT                             │
│  Next.js 16 + React 19 Expert                               │
├─────────────────────────────────────────────────────────────┤
│ Expertise:                                                   │
│  ✅ Next.js 16 App Router                                   │
│  ✅ React 19 (Server + Client Components)                   │
│  ✅ TailwindCSS 4.0 Styling                                 │
│  ✅ TanStack Query (React Query)                            │
│  ✅ React Hook Form + Zod                                   │
│  ✅ Vitest + Playwright Testing                             │
│  ✅ Performance & Accessibility                             │
│                                                              │
│ Use for:                                                     │
│  → Creating pages & layouts                                 │
│  → Building components                                      │
│  → Form handling & validation                               │
│  → API integration                                          │
│  → Testing (unit + E2E)                                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  TECH LEAD AGENT (NEW!)                      │
│  Technical Lead & Architecture Reviewer                     │
├─────────────────────────────────────────────────────────────┤
│ Expertise:                                                   │
│  ✅ Comprehensive Code Reviews                              │
│  ✅ Architecture Governance                                 │
│  ✅ Documentation Alignment                                 │
│  ✅ CI/CD Pipeline Validation                               │
│  ✅ Security & Performance Auditing                         │
│  ✅ Cross-Module Integration Review                         │
│  ✅ Team Mentoring & Best Practices                         │
│                                                              │
│ Use for:                                                     │
│  → Final code reviews before merge                          │
│  → Architecture compliance checks                           │
│  → Documentation verification                               │
│  → Security & performance audits                            │
│  → Ensuring consistency                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 How to Use

### Method 1: Automatic ✨ (EASIEST)
```bash
cd backend/     # Backend agent auto-activated
cd frontend/    # Frontend agent auto-activated
```
**Just start coding - agent is already helping!**

### Method 2: Chat Commands
```
# Backend development
@workspace /context .github/copilot-instructions-backend.md
Create a Payment module following hexagonal architecture

# Frontend development
@workspace /context .github/copilot-instructions-frontend.md
Build an event listing page with filters

# Code review (Tech Lead)
@workspace /context .github/copilot-instructions-techlead.md
Review this PR for architecture compliance and CI/CD readiness
```

### Method 3: Direct Questions
```
# During development
How do I create a CQRS command handler?
Build an event listing page with filters

# For reviews
Review this code against architecture rules
Check if this will pass CI/CD pipeline
Is the documentation up-to-date with these changes?
```

---

## 💡 Quick Examples

### Backend: Create Module
```
You: "Create a Tickets module with check-in logic"

Agent:
✅ domain/entities/ticket.entity.ts (pure TypeScript)
✅ application/commands/checkin-ticket/
✅ application/ports/ticket-repository.port.ts
✅ infrastructure/repositories/ticket.repository.ts
✅ Tests included
```

### Backend: Fix Violation
```
You: "Architecture test failing: domain imports @nestjs"

Agent:
✅ Identifies the import
✅ Explains why it's wrong
✅ Provides pure TypeScript solution
✅ Shows proper DI pattern
```

### Frontend: Create Page
```
You: "Create event details page with ticket purchase"

Agent:
✅ Server Component for data fetching
✅ Client Component for buy button
✅ Suspense boundaries
✅ TypeScript types
✅ TailwindCSS styling
```

### Frontend: Build Form
```
You: "Create event form with validation"

Agent:
✅ React Hook Form setup
✅ Zod schema validation
✅ Error handling
✅ Accessible inputs
✅ Submit logic
```

---

## ✅ What Agents Ensure

### Backend ✅
- Domain Layer = Pure TypeScript (no framework)
- Application Layer = Uses Ports (interfaces)
- Infrastructure = Implements Ports
- No cross-module imports (event-driven)
- Database schema isolation
- Passes `npm run test:arch`
- CI/CD compliant

### Frontend ✅
- Server Components by default
- Client Components when needed
- TypeScript properly typed
- Accessible (WCAG AA)
- Optimized images
- Form validation with Zod
- Passes all CI/CD checks

---

## 🎯 CI/CD Alignment

```
1. Lint           → Both agents ensure ESLint compliance
2. Arch Tests     → Backend agent ensures hexagonal rules
3. Unit Tests     → Both agents generate proper tests
4. Integration    → Backend agent knows DB patterns
5. E2E Tests      → Frontend agent writes Playwright tests
6. Build          → Both agents ensure TypeScript compiles
7. Security       → Both agents follow security best practices
```

**Agents suggest code that passes ALL quality gates!**

---

## 🔄 Workflow

```
1. git checkout -b feature/new-feature
   ↓
2. Open Copilot Chat
   ↓
3. Ask agent: "Create X following our architecture"
   ↓
4. Agent generates compliant code
   ↓
5. Run checks:
   - npm run lint:check
   - npm run test:arch (backend)
   - npm run test:unit
   - npm run build
   ↓
6. git commit & push
   ↓
7. ✅ CI/CD passes (code already compliant!)
```

---

## 📚 Documentation

| Document | What It Contains |
|----------|------------------|
| **COPILOT-AGENTS-QUICKSTART.md** | 5-min quick start guide |
| **.github/COPILOT-AGENTS-README.md** | Complete usage guide (400+ lines) |
| **.github/copilot-instructions-backend.md** | Backend agent config (500+ lines) |
| **.github/copilot-instructions-frontend.md** | Frontend agent config (450+ lines) |
| **COPILOT-AGENTS-SETUP-COMPLETE.md** | Full setup summary |

---

## 🆘 Common Questions

**Q: Which agent should I use?**  
A: Automatic based on directory (backend/ vs frontend/)

**Q: Can I use both agents?**  
A: Yes! Reference both in chat:
```
@workspace /context .github/copilot-instructions-backend.md
@workspace /context .github/copilot-instructions-frontend.md
Help me integrate frontend with backend API
```

**Q: Agent gives wrong advice?**  
A: Be more specific:
```
"Based on docs/03-architecture/01-principes-hexagonaux.md, 
explain why domain must be pure TypeScript"
```

**Q: How to verify before commit?**  
A: Ask agent:
```
"Review this code against CI/CD requirements"
"Will this pass architecture tests?"
"Check this for hexagonal architecture compliance"
```

---

## 🎓 Learning Path

### Week 1: Backend
```
Day 1: "Explain hexagonal architecture"
Day 2: "Show me domain entity example"
Day 3: "Guide me through CQRS handler"
Day 4: "Help me write unit tests"
Day 5: "Review my module structure"
```

### Week 2: Frontend
```
Day 1: "Explain Server vs Client Components"
Day 2: "Show me page with data fetching"
Day 3: "Guide me through form building"
Day 4: "Help me write E2E tests"
Day 5: "Review my component structure"
```

---

## 🚨 Emergency Commands

```bash
# Architecture broken?
npm run test:arch  # See violations
# Ask agent: "Fix architecture violations in this code"

# Tests failing?
npm run test:unit  # See failures
# Ask agent: "Why is this test failing?"

# Build broken?
npm run build  # See errors
# Ask agent: "Fix TypeScript compilation errors"

# Lint issues?
npm run lint:check  # See issues
# Ask agent: "Fix ESLint violations"
```

---

## ✨ Pro Tips

1. **Be Specific**
   ```
   ✅ "Create Payment entity following hexagonal architecture"
   ❌ "Create a payment class"
   ```

2. **Reference Docs**
   ```
   ✅ "Based on docs/03-architecture/, implement event-driven communication"
   ❌ "How do modules communicate?"
   ```

3. **Ask for Reviews**
   ```
   ✅ "Review against hexagonal rules and CI/CD requirements"
   ❌ "Is this code ok?"
   ```

4. **Verify Before Commit**
   ```
   "Will this pass CI/CD pipeline?"
   "Check this against architecture tests"
   ```

---

## 📊 Success Metrics

You'll know it's working when:
- ✅ Code passes architecture tests first try
- ✅ CI/CD pipeline succeeds without violations
- ✅ Code reviews focus on business logic
- ✅ Faster development velocity
- ✅ Consistent code quality

---

## 🎉 Ready to Code!

```
┌────────────────────────────────────────┐
│  1. Open VS Code                       │
│  2. Start Copilot Chat                 │
│  3. Ask your question                  │
│  4. Get architecture-compliant code!   │
└────────────────────────────────────────┘
```

**The agents have your back! 🚀**

---

**Quick Access:**
- Quickstart: `COPILOT-AGENTS-QUICKSTART.md`
- Full Guide: `.github/COPILOT-AGENTS-README.md`
- Setup Summary: `COPILOT-AGENTS-SETUP-COMPLETE.md`

**Need Help?** Ask the agents directly - they understand your context!

---

**Version:** 1.0  
**Last Updated:** November 25, 2025
