# 🤖 Quick Start: Using Custom Copilot Agents

## 🎯 What Are These?

You now have **three AI development agents** specialized for Tickr development:

1. **Backend Agent** - NestJS + Hexagonal Architecture Expert (for building)
2. **Frontend Agent** - Next.js 16 + React 19 Expert (for building)
3. **Tech Lead Agent** - Code Review & Architecture Guardian (for reviewing)

All agents are **automatically active** and aligned with your:
- ✅ Hexagonal architecture rules
- ✅ CI/CD quality gates
- ✅ Testing requirements
- ✅ Complete project documentation

---

## 🚀 How to Use

### Option 1: Automatic (Recommended)

**It just works!** GitHub Copilot automatically uses the right agent based on where you're working:

```bash
# Working in backend? → Backend agent active
cd backend/src/modules/events
# Copilot knows: hexagonal architecture, CQRS, domain-driven design

# Working in frontend? → Frontend agent active
cd frontend/src/app/events
# Copilot knows: Server Components, App Router, TailwindCSS

# Need code review? → Use Tech Lead agent explicitly
@workspace /context .github/copilot-instructions-techlead.md
# Copilot becomes: comprehensive reviewer with full project knowledge
```

### Option 2: Copilot Chat Commands

Open Copilot Chat and ask directly:

```
# Backend questions (auto-active in backend/)
Create a new Payment module following hexagonal architecture

# Frontend questions (auto-active in frontend/)
Build an event listing page using Server Components

# Code review (always explicit)
@workspace /context .github/copilot-instructions-techlead.md
Review this PR for architecture compliance, documentation 
alignment, and CI/CD readiness
```

---

## 📚 Full Documentation

**Read the complete guide:**  
👉 [.github/COPILOT-AGENTS-README.md](.github/COPILOT-AGENTS-README.md)

**Agent instruction files:**
- Backend: [.github/copilot-instructions-backend.md](.github/copilot-instructions-backend.md)
- Frontend: [.github/copilot-instructions-frontend.md](.github/copilot-instructions-frontend.md)

---

## 💡 Quick Examples

### Backend Development
```
Chat: "Create a Ticket entity with domain logic for check-in"

Copilot will:
✅ Create pure TypeScript class (no framework)
✅ Add business validation methods
✅ Follow domain-driven design
✅ Include unit tests
```

### Frontend Development
```
Chat: "Create event detail page with ticket purchase form"

Copilot will:
✅ Use Server Component for data fetching
✅ Client Component for interactive form
✅ React Hook Form + Zod validation
✅ Proper TypeScript types
```

### Code Review (Tech Lead)
```
Chat: @workspace /context .github/copilot-instructions-techlead.md
"Review this payment module for architecture compliance, 
security, and CI/CD readiness"

Copilot will:
✅ Check hexagonal architecture
✅ Verify security practices
✅ Validate documentation alignment
✅ Confirm CI/CD compliance
✅ Provide detailed feedback
```

---

## ✅ Benefits

- 🎯 **Architecture-compliant code** - Follows hexagonal principles automatically
- 🚀 **Faster development** - No need to remember all rules
- ✅ **Passes CI/CD** - Code aligned with quality gates
- 📚 **Context-aware** - Knows your entire documentation
- 🧪 **Test-ready** - Generates proper tests
- 👔 **Quality reviews** - Tech Lead catches issues before PR

---

## 🎓 Getting Started

1. **Open VS Code** in this workspace
2. **Start Copilot Chat** (Cmd/Ctrl + Shift + I)
3. **Ask questions** naturally - the agents understand your context
4. **Develop faster** with architecture-aware suggestions

---

## 📞 Need Help?

- **Full guide:** [.github/COPILOT-AGENTS-README.md](.github/COPILOT-AGENTS-README.md)
- **Tech Lead guide:** [TECH-LEAD-AGENT-GUIDE.md](TECH-LEAD-AGENT-GUIDE.md)
- **Complete setup:** [THREE-AGENT-SYSTEM-COMPLETE.md](THREE-AGENT-SYSTEM-COMPLETE.md)
- **Architecture docs:** [docs/03-architecture/](docs/03-architecture/)
- **Testing guides:** [docs/06-testing/](docs/06-testing/)

---

**Happy coding with your AI development team! 🎉**
