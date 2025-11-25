# 🤖 GitHub Copilot Custom Agents

**Version:** 1.0  
**Last Updated:** November 25, 2025

---

## 📋 Overview

This directory contains documentation for the **three specialized GitHub Copilot agents** configured for the Tickr project. These agents act as AI team members that understand the entire codebase, architecture, and conventions.

---

## 🤖 The Three-Agent System

### Agent Locations

The actual agent instruction files are in `.github/` directory (where Copilot automatically detects them):

```
.github/
├── copilot-instructions-backend.md      # Backend Development Agent
├── copilot-instructions-frontend.md     # Frontend Development Agent
├── copilot-instructions-techlead.md     # Tech Lead Review Agent
└── COPILOT-AGENTS-README.md             # Complete agent documentation
```

### Documentation in This Directory

```
docs/07-copilot-agents/
├── README.md                            # This file
├── COPILOT-AGENTS-QUICKSTART.md         # 5-min quick start guide
├── COPILOT-AGENTS-QUICK-REF.md          # Quick reference card
├── TECH-LEAD-AGENT-GUIDE.md             # Tech Lead agent usage
├── THREE-AGENT-SYSTEM-COMPLETE.md       # Complete system overview
└── COPILOT-AGENTS-SETUP-COMPLETE.md     # Setup summary
```

---

## 🎯 Quick Start (5 Minutes)

### 1. Understand the Agents

| Agent | Purpose | When to Use | Auto-Active |
|-------|---------|-------------|-------------|
| **Backend** | Build backend features | During backend development | ✅ Yes (in `backend/`) |
| **Frontend** | Build frontend features | During frontend development | ✅ Yes (in `frontend/`) |
| **Tech Lead** | Review & validate code | Before creating PR | ❌ Explicit only |

### 2. Use Backend/Frontend Agents (Automatic)

```bash
# Just work in the directory - agent is automatically active
cd backend/src/modules/payments
# Backend agent is now helping you

cd frontend/src/app/events
# Frontend agent is now helping you
```

### 3. Use Tech Lead Agent (Explicit)

```bash
# In Copilot Chat, load Tech Lead agent
@workspace /context .github/copilot-instructions-techlead.md

# Ask for comprehensive review
Review this feature for:
- Architecture compliance
- Documentation alignment
- Test coverage
- Security
- CI/CD readiness
```

---

## 📚 Documentation Guide

### Start Here (Choose Your Path)

**New to the agents? (5 minutes)**
→ Read: [COPILOT-AGENTS-QUICKSTART.md](./COPILOT-AGENTS-QUICKSTART.md)

**Need quick reference?**
→ Check: [COPILOT-AGENTS-QUICK-REF.md](./COPILOT-AGENTS-QUICK-REF.md)

**Want to understand Tech Lead agent?**
→ Read: [TECH-LEAD-AGENT-GUIDE.md](./TECH-LEAD-AGENT-GUIDE.md)

**Need complete system overview?**
→ Read: [THREE-AGENT-SYSTEM-COMPLETE.md](./THREE-AGENT-SYSTEM-COMPLETE.md)

**Want detailed agent documentation?**
→ Read: [../.github/COPILOT-AGENTS-README.md](../../.github/COPILOT-AGENTS-README.md)

---

## 🚀 Common Use Cases

### Use Case 1: Building a New Backend Module
```
1. cd backend/src/modules/tickets
2. Open Copilot Chat
3. "Create a Ticket entity with check-in logic"
4. Backend agent helps you build (follows hexagonal architecture)
5. Run: npm run test:arch (verify architecture compliance)
```

### Use Case 2: Building a New Frontend Page
```
1. cd frontend/src/app/events
2. Open Copilot Chat
3. "Create event listing page with filters"
4. Frontend agent helps you build (Server Components by default)
5. Run: npm run test:unit (verify tests pass)
```

### Use Case 3: Code Review Before PR
```
1. Finish building feature
2. Run local checks: npm run lint:check && npm run test:arch && npm run test:unit
3. Open Copilot Chat
4. @workspace /context .github/copilot-instructions-techlead.md
5. "Review this feature for architecture, docs, tests, security, and CI/CD"
6. Tech Lead provides comprehensive review
7. Fix any issues
8. Push & create PR (CI/CD passes!)
```

---

## 🔄 Recommended Workflow

```
┌─────────────────────────────────────────┐
│ 1. BUILD                                 │
│    Use: Backend/Frontend Agent          │
│    Where: backend/ or frontend/         │
│    Result: Feature code + tests         │
└─────────────────┬───────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│ 2. SELF-TEST                            │
│    Run: npm run lint:check              │
│    Run: npm run test:arch (backend)     │
│    Run: npm run test:unit               │
│    Run: npm run build                   │
└─────────────────┬───────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│ 3. REVIEW                                │
│    Use: Tech Lead Agent (explicit)      │
│    Check: Architecture, docs, tests     │
│    Result: Comprehensive feedback       │
└─────────────────┬───────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│ 4. FIX (if needed)                      │
│    Use: Backend/Frontend Agent          │
│    Update: Code + docs + tests          │
│    Rerun: Tests                         │
└─────────────────┬───────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│ 5. MERGE                                 │
│    Push: Code to branch                 │
│    Create: Pull Request                 │
│    CI/CD: All checks pass ✅            │
└─────────────────────────────────────────┘
```

---

## ✅ What Agents Know

### Backend Agent Knows:
- ✅ Complete hexagonal architecture principles
- ✅ All 30 architecture fitness functions
- ✅ CQRS pattern (Commands/Queries)
- ✅ Event-driven communication
- ✅ Database schema isolation
- ✅ TypeORM + PostgreSQL
- ✅ Testing strategies (unit/integration/E2E)
- ✅ CI/CD pipeline requirements

### Frontend Agent Knows:
- ✅ Next.js 16 App Router structure
- ✅ Server vs Client Components
- ✅ React 19 best practices
- ✅ TailwindCSS styling
- ✅ TanStack Query patterns
- ✅ Form handling (React Hook Form + Zod)
- ✅ Testing (Vitest + Playwright)
- ✅ Accessibility (WCAG AA)
- ✅ Performance optimization

### Tech Lead Agent Knows:
- ✅ **EVERYTHING** - Complete project knowledge
- ✅ All backend structure (6 modules)
- ✅ All frontend structure
- ✅ All documentation in `docs/`
- ✅ Complete CI/CD pipeline
- ✅ Architecture patterns
- ✅ Testing requirements
- ✅ Security best practices
- ✅ Performance optimization
- ✅ Team standards

---

## 🎓 Learning Path

### Week 1: Learn the Agents

**Day 1: Backend Agent**
- Read: `.github/copilot-instructions-backend.md`
- Try: "Explain hexagonal architecture principles"
- Practice: "Create a simple domain entity"

**Day 2: Frontend Agent**
- Read: `.github/copilot-instructions-frontend.md`
- Try: "Explain Server vs Client Components"
- Practice: "Create a simple page"

**Day 3: Tech Lead Agent**
- Read: `TECH-LEAD-AGENT-GUIDE.md`
- Try: "What do you check in a review?"
- Practice: "Review this simple function"

**Day 4-5: Build a Feature**
- Use all three agents
- Build with Backend/Frontend
- Review with Tech Lead
- Watch CI/CD pass

### Week 2: Master the Workflow
- Use agents for all development
- Always review with Tech Lead before PR
- Update documentation proactively
- Help team members learn agents

---

## 📊 Success Metrics

You'll know it's working when:

**Development:**
- ⚡ 50% faster feature development
- ✅ Code follows architecture first time
- 🎯 Architecture tests pass without fixes
- 📚 Documentation always in sync

**Quality:**
- ✅ First-time CI/CD pass rate > 90%
- ✅ Test coverage > 80%
- ✅ No security vulnerabilities
- ✅ Performance optimized

**Team:**
- 🎓 Faster onboarding (< 1 week)
- 👥 Consistent code across team
- 📈 Fewer code review cycles
- 🚀 More time for features

---

## 🆘 Common Questions

### Q: Which agent should I use?
**A:** 
- Building backend → Backend agent (auto-active in `backend/`)
- Building frontend → Frontend agent (auto-active in `frontend/`)
- Reviewing code → Tech Lead agent (always explicit)

### Q: Do I need all three agents?
**A:** Yes! They work together:
- Backend/Frontend agents help you BUILD
- Tech Lead agent helps you REVIEW
- Best results when used together

### Q: How do I activate an agent?
**A:**
- Backend/Frontend: Automatic when working in those directories
- Tech Lead: Explicit via `@workspace /context .github/copilot-instructions-techlead.md`

### Q: What if agents give wrong advice?
**A:**
- Reference specific documentation
- Ask agent to explain reasoning
- Tech Lead has final say (broader context)

### Q: Can I update agents?
**A:** Yes! Edit instruction files in `.github/`:
- Add new examples
- Update best practices
- Include team learnings

---

## 🔗 Related Documentation

### Architecture
- [Hexagonal Architecture](../03-architecture/01-principes-hexagonaux.md)
- [Module Structure](../03-architecture/02-structure-modules.md)
- [Architecture Quick Reference](../03-architecture/06-architecture-quick-ref.md)

### Testing
- [Backend Testing Guide](../06-testing/03-backend-testing-guide.md)
- [Frontend Testing Guide](../06-testing/02-frontend-testing-guide.md)

### CI/CD
- [CI Pipeline](../../.github/workflows/ci.yml)
- [Architecture Tests in CI/CD](../05-git-workflow/03-architecture-tests-in-cicd.md)

---

## 📞 Support

**Quick help:**
→ [COPILOT-AGENTS-QUICKSTART.md](./COPILOT-AGENTS-QUICKSTART.md)

**Detailed help:**
→ [../../.github/COPILOT-AGENTS-README.md](../../.github/COPILOT-AGENTS-README.md)

**Tech Lead specifics:**
→ [TECH-LEAD-AGENT-GUIDE.md](./TECH-LEAD-AGENT-GUIDE.md)

**Ask the agents directly:**
→ They understand your questions!

---

## 🎉 Get Started Now!

1. **Read:** [COPILOT-AGENTS-QUICKSTART.md](./COPILOT-AGENTS-QUICKSTART.md) (5 minutes)
2. **Try:** Ask Backend/Frontend agent a simple question
3. **Build:** Create a small feature with agent help
4. **Review:** Use Tech Lead agent before committing
5. **Iterate:** Learn and improve with each use

**Your AI development team is ready to help! 🚀**

---

**Status:** ✅ Complete and Ready for Use  
**Last Updated:** November 25, 2025  
**Agents:** 3 (Backend, Frontend, Tech Lead)  
**Documentation:** 6 guides
