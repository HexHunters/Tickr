# 🤖 Custom GitHub Copilot Agents - Tickr Project

**Version:** 1.0  
**Last Updated:** November 25, 2025

---

## 📋 Overview

This directory contains specialized GitHub Copilot instruction files that configure Copilot to act as expert development agents for the Tickr project. These agents are aligned with our architecture principles, testing requirements, and CI/CD pipelines.

**📚 For quick start guides and comprehensive documentation, see:**
- **Quick Start (5 min):** [`docs/07-copilot-agents/COPILOT-AGENTS-QUICKSTART.md`](../docs/07-copilot-agents/COPILOT-AGENTS-QUICKSTART.md)
- **Quick Reference:** [`docs/07-copilot-agents/COPILOT-AGENTS-QUICK-REF.md`](../docs/07-copilot-agents/COPILOT-AGENTS-QUICK-REF.md)
- **Tech Lead Guide:** [`docs/07-copilot-agents/TECH-LEAD-AGENT-GUIDE.md`](../docs/07-copilot-agents/TECH-LEAD-AGENT-GUIDE.md)
- **Complete System:** [`docs/07-copilot-agents/THREE-AGENT-SYSTEM-COMPLETE.md`](../docs/07-copilot-agents/THREE-AGENT-SYSTEM-COMPLETE.md)
- **Directory README:** [`docs/07-copilot-agents/README.md`](../docs/07-copilot-agents/README.md)

---

## 🎯 Available Agents

### 1. Backend Development Agent
**File:** `.github/copilot-instructions-backend.md`  
**Specialization:** NestJS + Hexagonal Architecture Expert

**Expertise:**
- ✅ Hexagonal architecture (Ports & Adapters pattern)
- ✅ Domain-Driven Design (DDD)
- ✅ CQRS pattern implementation
- ✅ Event-driven architecture
- ✅ TypeORM + PostgreSQL schema design
- ✅ Architecture fitness functions compliance
- ✅ Backend testing (unit/integration/E2E)

**Use for:**
- Creating new backend modules
- Implementing domain entities and value objects
- Writing CQRS handlers (commands/queries)
- Setting up repositories and adapters
- Writing backend tests
- Ensuring hexagonal architecture compliance

---

### 2. Frontend Development Agent
**File:** `.github/copilot-instructions-frontend.md`  
**Specialization:** Next.js 16 + React 19 Expert

**Expertise:**
- ✅ Next.js 16 App Router
- ✅ Server vs Client Components
- ✅ React 19 with Server Actions
- ✅ TailwindCSS styling
- ✅ TanStack Query (React Query)
- ✅ Form handling with React Hook Form + Zod
- ✅ Frontend testing (Vitest + Playwright)

**Use for:**
- Creating new pages and layouts
- Building reusable components
- Implementing forms with validation
- Setting up API clients
- Writing frontend tests
- Performance optimization

---

### 3. Tech Lead Agent (NEW!)
**File:** `.github/copilot-instructions-techlead.md`  
**Specialization:** Technical Lead & Architecture Reviewer

**Expertise:**
- ✅ Comprehensive code reviews
- ✅ Architecture governance & compliance
- ✅ Documentation alignment verification
- ✅ CI/CD pipeline validation
- ✅ Security & performance auditing
- ✅ Cross-module integration review
- ✅ Team mentoring & best practices

**Use for:**
- Final code reviews before merge
- Architecture compliance checks
- Documentation accuracy verification
- Cross-cutting concern reviews
- Security and performance audits
- Ensuring consistency across codebase
- Mentoring and feedback

---

## 🚀 How to Use Custom Agents

### Method 1: Using `.github` Instructions (Recommended)

GitHub Copilot **automatically** picks up instruction files placed in `.github/` directory!

**Current Setup:**
```
.github/
├── copilot-instructions-backend.md    ← Backend agent
├── copilot-instructions-frontend.md   ← Frontend agent
├── copilot-instructions-techlead.md   ← Tech Lead agent (NEW!)
└── workflows/
    └── ci.yml
```

**How it works:**
1. When you work in `backend/` directory, Copilot will use the backend instructions
2. When you work in `frontend/` directory, Copilot will use the frontend instructions
3. For code reviews and architecture checks, explicitly invoke the Tech Lead agent
4. Copilot automatically switches context based on your working directory

### Method 2: Using Copilot Chat Slash Commands

You can explicitly load agent instructions in Copilot Chat:

```
# Load backend agent
@workspace /context .github/copilot-instructions-backend.md

# Then ask questions
How do I create a new module following hexagonal architecture?

---

# Load frontend agent
@workspace /context .github/copilot-instructions-frontend.md

# Then ask questions
How do I create a new page with server components?

---

# Load Tech Lead agent for reviews
@workspace /context .github/copilot-instructions-techlead.md

# Then ask for review
Review this PR for architecture compliance, documentation alignment, 
and CI/CD readiness.
```

### Method 3: Referencing in Chat

You can reference the instructions in your questions:

```
Based on the backend agent instructions, help me create a new Events module 
with proper hexagonal architecture.

---

Following the frontend agent guidelines, help me build an event listing page 
using Server Components.
```

---

## 💡 Usage Examples

### Backend Development Examples

#### Example 1: Create New Module
```
Chat: I need to create a new "Tickets" module following hexagonal architecture. 
Include domain entities, commands, queries, and repository port.

Copilot will:
✅ Create proper folder structure (domain/application/infrastructure)
✅ Implement pure domain entities
✅ Create CQRS commands/queries with handlers
✅ Define repository port interface
✅ Ensure no framework code in domain layer
```

#### Example 2: Fix Architecture Violation
```
Chat: My architecture tests are failing with "Domain layer imports @nestjs/common". 
Help me fix this.

Copilot will:
✅ Identify the violation
✅ Explain why it's wrong
✅ Provide correct implementation without framework imports
✅ Show how to use dependency injection properly
```

#### Example 3: Write Tests
```
Chat: Write unit tests for the Event entity including edge cases.

Copilot will:
✅ Create pure unit tests (no mocks)
✅ Test business rules
✅ Cover validation logic
✅ Follow testing best practices from documentation
```

---

### Frontend Development Examples

#### Example 1: Create New Page
```
Chat: Create an event listing page using Server Components with filters.

Copilot will:
✅ Create Server Component for data fetching
✅ Add Suspense boundaries
✅ Implement client components only for interactive parts
✅ Use proper TypeScript types
```

#### Example 2: Build Form
```
Chat: Create an event creation form with validation using React Hook Form and Zod.

Copilot will:
✅ Set up React Hook Form with Zod resolver
✅ Create validation schema
✅ Handle form submission
✅ Show error messages
✅ Use proper TailwindCSS styling
```

#### Example 3: Write E2E Tests
```
Chat: Write Playwright E2E test for the event purchase flow.

Copilot will:
✅ Create proper test structure
✅ Navigate through the flow
✅ Assert expected outcomes
✅ Handle loading states
✅ Follow Playwright best practices
```

---

## 🎯 Best Practices for Working with Agents

### 1. Be Specific About Context
```
✅ GOOD: "Following hexagonal architecture rules, create a Payment domain entity"
❌ BAD: "Create a payment class"
```

### 2. Reference Architecture Documents
```
✅ GOOD: "Based on the architecture documentation in docs/03-architecture/, 
         implement event-driven communication between modules"
❌ BAD: "How do modules communicate?"
```

### 3. Ask for Compliance Checks
```
✅ GOOD: "Review this code against hexagonal architecture rules and CI/CD requirements"
❌ BAD: "Is this code ok?"
```

### 4. Request Aligned Solutions
```
✅ GOOD: "Create a component that will pass our Vitest unit tests"
❌ BAD: "Create a component"
```

---

## 📁 Agent Context Awareness

Both agents have deep knowledge of:

### Backend Agent Knows:
- ✅ Complete hexagonal architecture documentation (`docs/03-architecture/`)
- ✅ All 30 architecture fitness functions
- ✅ Backend testing guide (`docs/06-testing/03-backend-testing-guide.md`)
- ✅ Module structure for all 6 bounded contexts
- ✅ CI/CD pipeline requirements (`.github/workflows/ci.yml`)
- ✅ Database schema isolation rules
- ✅ Event-driven communication patterns
- ✅ TypeORM migrations workflow

### Frontend Agent Knows:
- ✅ Next.js 16 App Router structure
- ✅ Server vs Client Components patterns
- ✅ Frontend testing guide (`docs/06-testing/02-frontend-testing-guide.md`)
- ✅ TailwindCSS styling conventions
- ✅ Form handling with React Hook Form + Zod
- ✅ TanStack Query patterns
- ✅ CI/CD pipeline requirements
- ✅ Performance optimization techniques
- ✅ Accessibility requirements (WCAG)

---

## 🔄 Workflow Integration

### Daily Development Flow

```bash
# 1. Start your day
git checkout develop
git pull

# 2. Create feature branch
git checkout -b feature/new-module

# 3. Open VS Code
code .

# 4. Start Copilot Chat
# Select appropriate agent based on task:
#   - Backend work → Backend agent auto-loaded
#   - Frontend work → Frontend agent auto-loaded

# 5. Develop with agent guidance
# Ask questions, request code, get reviews

# 6. Before commit - verify with agent
"Review this code against CI/CD requirements"

# 7. Run checks
npm run lint:check
npm run test:arch    # Backend only
npm run test:unit

# 8. Commit and push
git add .
git commit -m "feat: implement new feature"
git push
```

---

## ✅ Verification Checklist

Before pushing code, ask the agent to verify:

### Backend Code Verification
```
@workspace Please verify this code against:
1. Hexagonal architecture rules (no framework in domain)
2. CQRS pattern compliance
3. Event-driven communication (no cross-module imports)
4. Database schema isolation
5. Test coverage (unit tests for domain)
6. Architecture fitness functions compliance
```

### Frontend Code Verification
```
@workspace Please verify this code against:
1. Server vs Client Components usage
2. TypeScript type safety
3. Accessibility (WCAG AA)
4. Performance (image optimization, code splitting)
5. Form validation with Zod
6. Test coverage (unit + E2E)
```

---

## 🚨 Common Questions

### Q: Which agent should I use?
**A:** The agent is automatically selected based on your working directory:
- Working in `backend/` → Backend agent
- Working in `frontend/` → Frontend agent
- Working in `docs/` → Both agents available

### Q: Can I use both agents simultaneously?
**A:** Yes! You can reference both instruction files in Copilot Chat:
```
@workspace /context .github/copilot-instructions-backend.md
@workspace /context .github/copilot-instructions-frontend.md
Help me integrate the frontend event page with the backend API
```

### Q: What if the agent gives incorrect advice?
**A:** 
1. Reference the specific documentation: `Check docs/03-architecture/01-principes-hexagonaux.md`
2. Ask for clarification: `Why do you recommend this approach?`
3. Provide feedback: `This violates our hexagonal architecture rules because...`

### Q: How do I update agent knowledge?
**A:** Edit the instruction files in `.github/`:
- `.github/copilot-instructions-backend.md` for backend updates
- `.github/copilot-instructions-frontend.md` for frontend updates

Copilot will automatically use the updated instructions.

---

## 📚 Additional Resources

### Architecture Documentation
- `docs/03-architecture/00-architecture-governance-summary.md` - Overview
- `docs/03-architecture/01-principes-hexagonaux.md` - Hexagonal principles
- `docs/03-architecture/02-structure-modules.md` - Module structure
- `docs/03-architecture/06-architecture-quick-ref.md` - Quick reference

### Testing Documentation
- `docs/06-testing/03-backend-testing-guide.md` - Backend testing
- `docs/06-testing/02-frontend-testing-guide.md` - Frontend testing
- `backend/test/architecture/README.md` - Architecture tests

### CI/CD
- `.github/workflows/ci.yml` - Complete CI pipeline
- `docs/05-git-workflow/03-architecture-tests-in-cicd.md` - CI integration

---

## 🎓 Training Tips

### For New Team Members

**Week 1: Learn with Backend Agent**
```
Day 1: "Explain hexagonal architecture principles"
Day 2: "Show me how to create a domain entity"
Day 3: "Help me implement a command handler"
Day 4: "Guide me through writing unit tests"
Day 5: "Review my code for architecture violations"
```

**Week 2: Learn with Frontend Agent**
```
Day 1: "Explain Server vs Client Components"
Day 2: "Show me how to create a page with data fetching"
Day 3: "Help me build a form with validation"
Day 4: "Guide me through writing E2E tests"
Day 5: "Review my code for performance issues"
```

---

## 🔧 Troubleshooting

### Issue: Agent not following instructions
**Solution:** Be more explicit in your request:
```
✅ "Create a User entity following the hexagonal architecture principles 
   from .github/copilot-instructions-backend.md"
```

### Issue: Agent suggests code that fails CI/CD
**Solution:** Ask for pre-commit verification:
```
✅ "Will this code pass our CI/CD pipeline? Check against architecture tests."
```

### Issue: Agent gives generic advice
**Solution:** Reference specific documentation:
```
✅ "Based on docs/03-architecture/01-principes-hexagonaux.md, explain 
   why domain layer must be pure TypeScript"
```

---

## 🎯 Success Metrics

You'll know the agents are working well when:
- ✅ Code passes architecture tests on first try
- ✅ CI/CD pipeline succeeds without architecture violations
- ✅ Code reviews focus on business logic, not architecture
- ✅ New team members onboard faster
- ✅ Consistent code quality across the team

---

## 🤝 Contributing

To improve these agents:

1. **Update instruction files** based on team feedback
2. **Add new examples** as patterns emerge
3. **Document edge cases** when discovered
4. **Share learnings** with the team

---

## 📞 Support

**Questions about agents?**
- Check this README
- Review the instruction files
- Ask in team chat
- Create a GitHub issue

**Questions about architecture?**
- Consult `docs/03-architecture/`
- Run architecture tests: `npm run test:arch`
- Ask the backend agent directly

---

## 🎉 Ready to Go!

You now have:
- ✅ Two specialized development agents
- ✅ Automatic context switching
- ✅ Architecture-aware code suggestions
- ✅ CI/CD-aligned recommendations
- ✅ Testing best practices built-in

**Start coding with confidence!** 🚀

---

**Last Updated:** November 25, 2025  
**Maintained by:** Tickr Development Team  
**Version:** 1.0
